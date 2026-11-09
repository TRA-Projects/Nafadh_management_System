import { Component, HostListener, OnInit, AfterViewChecked, OnDestroy, ElementRef, ViewChild, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subscription } from 'rxjs';
import { CompanyMailboxApi, CompanyMailDraft } from './company-mailbox-api';
import { NotificationSummaryService } from '../../../../shared/services/notification-summary.service';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { ConversationDetailDto, ConversationListItemDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-company-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrls: ['./contact.scss'],
})
export class CompanyContact implements OnInit, AfterViewChecked, OnDestroy {
  /** API stores message timestamps as UTC but SQL DateTime may serialize without a Z suffix. */
  utcTimestamp(value: string | Date | null | undefined): string | Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const text = value.trim();
    if (!text) return null;
    // Leave explicit timezone offsets untouched; treat timezone-less API timestamps as UTC.
    return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text) ? text : `${text}Z`;
  }

  private readonly api = inject(CompanyApi);
  private readonly mailbox = inject(CompanyMailboxApi);
  private readonly summary = inject(NotificationSummaryService);
  readonly mailboxTab = signal<'conversations' | 'drafts' | 'trash'>('conversations');
  readonly trashReady = signal(false);
  readonly trashError = signal('');
  readonly draftError = signal('');
  private trashRequest?: Subscription;
  readonly trashedIds = signal<ReadonlySet<number>>(new Set<number>());
  readonly ownedIds = signal<ReadonlySet<number>>(new Set<number>());
  readonly inbox = computed(() => this.conversations().filter(c => !this.trashedIds().has(c.conversationId)));
  readonly trashCount = computed(() => this.conversations().filter(c => this.trashedIds().has(c.conversationId)).length);
  readonly savedDrafts = signal<CompanyMailDraft[]>([]);
  readonly savingDraft = signal(false);
  readonly deleting = signal(false);
  readonly deleteConfirmation = signal<{ id: number; permanent: boolean } | null>(null);
  @HostListener('document:click', ['$event'])
  dismissDeleteConfirmation(event: MouseEvent): void {
    if (!(event.target instanceof Element) || !event.target.closest('.contact-delete-wrap')) this.deleteConfirmation.set(null);
  }
  @HostListener('document:keydown.escape')
  cancelDeleteConfirmation(): void { this.deleteConfirmation.set(null); }
  confirmDeletion(): void {
    const pending = this.deleteConfirmation();
    this.deleteConfirmation.set(null);
    if (!pending || this.active()?.conversationId !== pending.id) return;
    if (pending.permanent) this.executePermanentDelete();
    else this.executeTrash();
  }
  deleteChat(): void {
    const chat = this.active();
    if (chat && this.canDeletePermanently(chat.conversationId) && !this.deleting())
      this.deleteConfirmation.set({ id: chat.conversationId, permanent: true });
  }
  trashChat(): void {
    const chat = this.active();
    if (chat && this.trashReady() && !this.trashError() && !this.deleting())
      this.deleteConfirmation.set({ id: chat.conversationId, permanent: false });
  }
  private newDraftId: string | null = null;
  private draftVersions = new Map<string, number>();
  readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLElement>;
  @ViewChild('newDialog') private newDialog?: ElementRef<HTMLElement>;
  conversations = signal<ConversationListItemDto[]>([]);
  active = signal<ConversationDetailDto | null>(null);
  showNew = signal(false);
  filter = signal<'all' | 'unread'>('all');
  sending = signal(false);
  creating = signal(false);
  loading = signal(false);
  opening = signal(false);
  errorMessage = signal('');
  modalError = signal('');
  successMessage = signal('');
  searchText = '';
  replyText = '';
  readonly categories = ['طلبات الاستضافة والاعتماد', 'البرامج والخطط التدريبية', 'الحضور والغياب', 'التقييمات والتقارير', 'الإنذارات والمخالفات', 'استفسار عام'];
  newConv = { category: this.categories[0], subject: '', firstMessage: '' };
  totalConversations = computed(() => this.inbox().length);
  totalUnread = computed(() => this.inbox().reduce((n, c) => n + Math.max(0, c.unreadCount ?? 0), 0));
  unreadConversations = computed(() => this.inbox().filter(c => c.unreadCount > 0).length);
  readConversations = computed(() => this.totalConversations() - this.unreadConversations());
  private draftListRequest?: Subscription;
  private detailRequest?: Subscription;
  private listRequest?: Subscription;
  private requestVersion = 0;
  private scrollPending = false;
  private focusPending = false;
  private previousFocus: HTMLElement | null = null;
  private readonly drafts = new Map<number, string>();

  private pollTimer?: ReturnType<typeof setInterval>;
  private liveRequest?: Subscription;
  private liveBusy = false;
  private liveDetailBusy = false;
  private readonly noticeTimers = new Map<string, ReturnType<typeof setTimeout>>();
  readonly hiddenNotices = signal<ReadonlySet<string>>(new Set());
  private showNotice(name: 'errorMessage' | 'successMessage' | 'modalError' | 'trashError' | 'draftError', text: string): void {
    const previous = this.noticeTimers.get(name);
    if (previous) clearTimeout(previous);
    this[name].set(text);
    this.hiddenNotices.update(items => { const next = new Set(items); next.delete(name); return next; });
    if (text) this.noticeTimers.set(name, setTimeout(() => {
      // Keep secondary failure state for permission guards; hide only its banner.
      if (name === 'trashError' || name === 'draftError') {
        this.hiddenNotices.update(items => new Set([...items, name]));
      } else this[name].set('');
      this.noticeTimers.delete(name);
    }, 3000));
  }
  ngOnInit(): void {
    this.loadConversations(); this.loadDrafts(); this.loadTrash();
    this.pollTimer = setInterval(() => this.refreshLive(), 3000);
  }
  @HostListener('document:visibilitychange')
  onVisibilityChange(): void { if (!document.hidden) this.refreshLive(); }
  private refreshLive(): void {
    if ((typeof document !== 'undefined' && document.hidden) || this.liveBusy || this.liveDetailBusy || this.loading() || this.opening() ||
        this.sending() || this.creating() || this.deleting() || this.savingDraft()) return;
    if (!this.userId()) return;
    this.liveBusy = true;
    this.liveRequest = this.api.getConversations().pipe(takeUntilDestroyed(this.destroyRef),
      finalize(() => this.liveBusy = false)).subscribe({
      next: items => {
        if (this.sending() || this.creating() || this.deleting() || this.opening()) return;
        this.conversations.set(this.sorted(items ?? []));
        const current = this.active();
        if (!current) return;
        const id = current.conversationId, version = this.requestVersion;
        this.detailRequest?.unsubscribe();
        this.liveDetailBusy = true;
        this.detailRequest = this.api.getConversation(id).pipe(takeUntilDestroyed(this.destroyRef),
          finalize(() => this.liveDetailBusy = false)).subscribe({
          next: detail => {
            if (version !== this.requestVersion || this.active()?.conversationId !== id || this.sending() || this.deleting()) return;
            const incoming = detail.messages ?? [];
            const changed = JSON.stringify(current.messages ?? []) !== JSON.stringify(incoming);
            const el = this.messagesContainer?.nativeElement;
            const nearBottom = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 100;
            this.active.set({ ...detail, messages: incoming });
            if (changed && nearBottom) this.scrollPending = true;
            if (!this.isTrashed(id) && (items ?? []).some(c => c.conversationId === id && c.unreadCount > 0)) this.markRead(id);
          },
          error: () => {} // Background failures must not interrupt typing.
        });
      },
      error: () => {} // Retry on the next tick; manual refresh still reports failures.
    });
  }
  ngOnDestroy(): void { if (this.pollTimer) clearInterval(this.pollTimer); this.liveRequest?.unsubscribe(); for (const timer of this.noticeTimers.values()) clearTimeout(timer); this.trashRequest?.unsubscribe(); this.draftListRequest?.unsubscribe(); this.detailRequest?.unsubscribe(); this.liveRequest?.unsubscribe(); this.detailRequest?.unsubscribe(); this.listRequest?.unsubscribe(); }
  ngAfterViewChecked(): void {
    if (this.scrollPending && this.messagesContainer) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.scrollPending = false;
    }
    if (this.focusPending && this.newDialog) {
      this.newDialog.nativeElement.querySelector<HTMLElement>('select')?.focus();
      this.focusPending = false;
    }
  }
  private userId(): number | null {
    const id = this.auth.userId;
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      this.showNotice('errorMessage', 'انتهت الجلسة أو تعذر تحديد المستخدم. يرجى تسجيل الدخول مجددًا.');
      return null;
    }
    return id;
  }
  private failure(error: unknown, fallback: string): string {
    const status = (error as { status?: number })?.status;
    if (status === 401) return 'انتهت الجلسة. يرجى تسجيل الدخول مجددًا.';
    if (status === 403) return 'ليست لديك صلاحية لتنفيذ هذا الإجراء.';
    if (status === 404) return 'المحادثة غير موجودة أو لم تعد متاحة.';
    if (status === 0) return 'تعذر الاتصال بالخادم. تحقق من الاتصال ثم أعد المحاولة.';
    return fallback;
  }
  private sorted(items: ConversationListItemDto[]): ConversationListItemDto[] {
    const date = (s: string | null | undefined) => Date.parse(s ?? '') || 0;
    return [...items].sort((a, b) => date(b.lastMessageDate) - date(a.lastMessageDate));
  }
  refreshMailbox(): void {
    if (this.sending() || this.creating() || this.deleting() || this.savingDraft()) return;
    this.loadConversations(); this.loadDrafts(); this.loadTrash();
    const id = this.active()?.conversationId;
    if (id) this.open(id);
  }
  loadConversations(): void {
    if (this.loading()) return;
    const userId = this.userId();
    if (!userId) return;
    this.loading.set(true);
    this.showNotice('errorMessage', '');
    this.listRequest = this.api.getConversations().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: items => this.conversations.set(this.sorted(items ?? [])),
      error: error => this.showNotice('errorMessage', this.failure(error, 'تعذر تحميل المحادثات. أعد المحاولة باستخدام زر التحديث.')),
    });
  }
  loadTrash(): void {
    this.trashRequest?.unsubscribe();
    this.showNotice('trashError', '');
    this.trashRequest = this.mailbox.getTrash().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: trash => {
        this.trashedIds.set(new Set(trash.trashedIds));
        this.ownedIds.set(new Set(trash.ownedIds));
        this.trashReady.set(true);
      },
      error: () => this.showNotice('trashError', 'تعذر تحميل حالة المحذوفات. المحادثات متاحة، لكن الحذف والاسترداد غير متاحين مؤقتًا.')
    });
  }
  setMailboxTab(tab: 'conversations' | 'drafts' | 'trash'): void {
    if (this.savingDraft() || this.sending() || this.creating() || this.deleting()) return;
    if (this.mailboxTab() !== tab) this.clearActive();
    this.saveDraft(); this.mailboxTab.set(tab);
    if (tab === 'drafts') this.loadDrafts();
    if (tab === 'trash') this.loadTrash();
  }
  loadDrafts(): void {
    if (this.savingDraft()) return;
    this.draftListRequest?.unsubscribe();
    this.showNotice('draftError', '');
    this.draftListRequest = this.mailbox.getDrafts().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: items => this.savedDrafts.set(items ?? []),
      error: () => this.showNotice('draftError', 'تعذر تحميل المسودات. أعد المحاولة.')
    });
  }
  private persistDraft(draft: CompanyMailDraft): void {
    if (draft.content.length > 5000 || draft.subject.length > 150) {
      this.showNotice('errorMessage', 'تعذر حفظ المسودة: تجاوز الحد المسموح.'); return;
    }
    if (this.savingDraft()) return;
    this.draftListRequest?.unsubscribe();
    this.savingDraft.set(true);
    const version = (this.draftVersions.get(draft.id) ?? 0) + 1;
    this.draftVersions.set(draft.id, version);
    this.mailbox.saveDraft(draft).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.savingDraft.set(false))).subscribe({
      next: saved => {
        if (this.draftVersions.get(draft.id) !== version) return;
        this.savedDrafts.update(items => [saved, ...items.filter(d => d.id !== saved.id &&
          !(saved.conversationId !== null && d.conversationId === saved.conversationId))]);
        this.showNotice('successMessage', 'تم حفظ المسودة في الخادم.');
      },
      error: e => this.showNotice('errorMessage', this.failure(e, 'تعذر حفظ المسودة. النص ما زال في الصفحة.'))
    });
  }
  saveReplyDraft(): void {
    const chat = this.active();
    if (!chat || !this.replyText.trim() || this.sending() || this.savingDraft()) return;
    this.saveDraft();
    this.persistDraft({ id: this.savedDrafts().find(d => d.conversationId === chat.conversationId)?.id ?? crypto.randomUUID(),
      conversationId: chat.conversationId, subject: chat.subject, category: chat.category ?? '',
      content: this.replyText, updatedAt: new Date().toISOString() });
  }
  openDraft(draft: CompanyMailDraft): void {
    if (this.sending() || this.creating() || this.deleting() || this.savingDraft()) return;
    if (draft.conversationId !== null) {
      this.drafts.set(draft.conversationId, draft.content); this.open(draft.conversationId);
    } else {
      this.newDraftId = draft.id;
      this.newConv = { category: draft.category, subject: draft.subject, firstMessage: draft.content };
      this.openNew();
    }
  }
  removeDraft(draft: CompanyMailDraft): void {
    if (this.savingDraft()) return;
    this.draftListRequest?.unsubscribe();
    this.mailbox.deleteDraft(draft.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.savedDrafts.update(items => items.filter(d => d.id !== draft.id));
        if (draft.conversationId !== null) this.drafts.delete(draft.conversationId);
      },
      error: e => this.showNotice('errorMessage', this.failure(e, 'تعذر حذف المسودة.'))
    });
  }
  isTrashed(id: number): boolean { return this.trashedIds().has(id); }
  canDeletePermanently(id: number): boolean { return this.ownedIds().has(id); }
  private executeTrash(): void {
    const chat = this.active();
    if (!this.trashReady() || this.trashError() || !chat || this.sending() || this.creating() || this.savingDraft() || this.deleting()) return;
    this.updateTrash(chat.conversationId, false);
  }
  restoreChat(): void {
    const chat = this.active();
    if (!chat || this.deleting()) return;
    this.updateTrash(chat.conversationId, true);
  }
  private updateTrash(id: number, restore: boolean): void {
    this.deleting.set(true); this.liveRequest?.unsubscribe(); this.detailRequest?.unsubscribe(); this.listRequest?.unsubscribe(); this.detailRequest?.unsubscribe();
    this.trashRequest?.unsubscribe();
    const request = restore ? this.mailbox.restoreConversation(id) : this.mailbox.trashConversation(id);
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.deleting.set(false))).subscribe({
      next: () => {
        this.trashedIds.update(current => {
          const next = new Set(current); restore ? next.delete(id) : next.add(id); return next;
        });
        this.drafts.set(id, this.replyText);
        ++this.requestVersion; this.opening.set(false); this.active.set(null); this.replyText = '';
        this.mailboxTab.set(restore ? 'conversations' : 'trash'); this.resetFilters();
        this.showNotice('successMessage', restore ? 'تم استرداد المحادثة.' : 'نُقلت المحادثة إلى المحذوفات لديك فقط.');
      },
      error: e => this.showNotice('errorMessage', this.failure(e, restore ? 'تعذر استرداد المحادثة.' : 'تعذر نقل المحادثة إلى المحذوفات.'))
    });
  }
  private executePermanentDelete(): void {
    const chat = this.active();
    if (!chat || !this.canDeletePermanently(chat.conversationId) || this.sending() || this.creating() || this.opening() || this.deleting() || this.savingDraft()) return;
    this.deleting.set(true); this.liveRequest?.unsubscribe(); this.detailRequest?.unsubscribe(); this.listRequest?.unsubscribe(); this.detailRequest?.unsubscribe();
    this.mailbox.deleteConversation(chat.conversationId)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.deleting.set(false))).subscribe({
        next: () => {
          ++this.requestVersion; this.active.set(null); this.replyText = ''; this.drafts.delete(chat.conversationId);
          this.conversations.update(items => items.filter(c => c.conversationId !== chat.conversationId));
          for (const draft of this.savedDrafts().filter(d => d.conversationId === chat.conversationId)) this.removeDraft(draft);
          this.showNotice('successMessage', 'تم حذف المحادثة ورسائلها.'); this.summary.refresh();
        },
        error: e => this.showNotice('errorMessage', this.failure(e, 'تعذر حذف المحادثة. يسمح بحذف المحادثات التي أنشأتها فقط.'))
      });
  }
  filteredConversations(): ConversationListItemDto[] {
    const q = this.searchText.trim().toLocaleLowerCase();
    return this.conversations().filter(c =>
      this.trashedIds().has(c.conversationId) === (this.mailboxTab() === 'trash') && (this.filter() !== 'unread' || c.unreadCount > 0) &&
      [c.subject, c.category, c.lastMessagePreview].some(s => (s ?? '').toLocaleLowerCase().includes(q)));
  }
  resetFilters(): void { this.searchText = ''; this.filter.set('all'); }
  private saveDraft(): void {
    const id = this.active()?.conversationId;
    if (id) {
      this.drafts.set(id, this.replyText);

    }
  }
  open(id: number): void {
    this.deleteConfirmation.set(null);
    if (!this.userId() || !Number.isInteger(id) || id <= 0 || this.sending() || this.creating() || this.deleting() || this.savingDraft()) return;
    this.saveDraft();
    this.detailRequest?.unsubscribe();
    const version = ++this.requestVersion;
    this.active.set(null);
    this.replyText = '';
    this.opening.set(true);
    this.showNotice('errorMessage', '');
    this.showNotice('successMessage', '');
    this.detailRequest = this.api.getConversation(id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
      if (version === this.requestVersion) this.opening.set(false);
    })).subscribe({
      next: conversation => {
        if (version !== this.requestVersion) return;
        this.active.set({ ...conversation, messages: conversation.messages ?? [] });
        this.replyText = this.drafts.get(id) ?? this.savedDrafts().find(d => d.conversationId === id)?.content ?? '';
        this.scrollPending = true;
        if (!this.isTrashed(id)) this.markRead(id);
      },
      error: error => this.showNotice('errorMessage', this.failure(error, 'تعذر فتح المحادثة. أعد المحاولة.')),
    });
  }
  private markRead(id: number): void {
    const userId = this.userId();
    if (!userId) return;
    this.api.markConversationRead(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.conversations.update(items => items.map(c => c.conversationId === id ? { ...c, unreadCount: 0 } : c)); this.summary.refresh(); },
      error: error => this.showNotice('errorMessage', this.failure(error, 'تم فتح المحادثة، لكن تعذر تحديث حالة القراءة. أعد فتحها للمحاولة.')),
    });
  }
  send(): void {
    const conversation = this.active();
    const content = this.replyText.trim();
    const userId = this.userId();
    if (!conversation || this.isTrashed(conversation.conversationId) || !content || !userId || this.sending() || this.opening() || this.deleting() || this.savingDraft()) return;
    if (content.length > 5000) { this.showNotice('errorMessage', 'الحد الأقصى للرسالة 5000 حرف.'); return; }
    const id = conversation.conversationId;
    this.liveRequest?.unsubscribe(); this.detailRequest?.unsubscribe(); this.listRequest?.unsubscribe();
    this.sending.set(true);
    this.showNotice('errorMessage', '');
    this.api.sendMessage(id, { content }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.sending.set(false))).subscribe({
      next: message => {
        this.active.update(current => current?.conversationId === id ? {
          ...current, messages: [...(current.messages ?? []), message],
          lastMessagePreview: message.content, lastMessageDate: message.sentDate,
        } : current);
        this.conversations.update(items => this.sorted(items.map(c => c.conversationId === id ? {
          ...c, lastMessagePreview: message.content, lastMessageDate: message.sentDate,
        } : c)));
        this.drafts.delete(id);
        const draft = this.savedDrafts().find(d => d.conversationId === id);
        if (draft) this.removeDraft(draft);
        this.summary.refresh();
        if (this.active()?.conversationId === id) { this.replyText = ''; this.scrollPending = true; }
      },
      error: error => this.showNotice('errorMessage', this.failure(error, 'تعذر إرسال الرسالة. نص الرسالة محفوظ، ويمكنك إعادة المحاولة.')),
    });
  }
  openNew(): void {
    if (this.sending() || this.creating() || this.deleting() || this.savingDraft()) return;
    this.previousFocus = typeof document !== 'undefined' ? document.activeElement as HTMLElement : null;
    this.showNotice('modalError', ''); this.showNotice('successMessage', ''); this.showNew.set(true); this.focusPending = true;
  }
  closeNew(): void {
    if (this.creating() || this.deleting() || this.savingDraft()) return;
    if (this.newConv.subject.trim() || this.newConv.firstMessage.trim()) {
      this.newDraftId ??= crypto.randomUUID();
      this.persistDraft({ id: this.newDraftId, conversationId: null,
        subject: this.newConv.subject, category: this.newConv.category,
        content: this.newConv.firstMessage, updatedAt: new Date().toISOString() });
    }
    this.showNew.set(false); this.showNotice('modalError', ''); this.previousFocus?.focus();
  }
  trapFocus(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.preventDefault(); this.closeNew(); return; }
    if (event.key !== 'Tab') return;
    const nodes = this.newDialog?.nativeElement.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)');
    if (!nodes?.length) { event.preventDefault(); return; }
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  startConversation(): void {
    if (this.creating() || this.deleting() || this.savingDraft()) return;
    const userId = this.userId();
    if (!userId) { this.showNotice('modalError', this.errorMessage()); return; }
    const subject = this.newConv.subject.trim(), firstMessage = this.newConv.firstMessage.trim();
    if (!subject || !firstMessage || subject.length > 150 || firstMessage.length > 5000 || !this.categories.includes(this.newConv.category)) {
      this.showNotice('modalError', 'أدخل تصنيفًا صحيحًا وعنوانًا من 1 إلى 150 حرفًا ورسالة من 1 إلى 5000 حرف.'); return;
    }
    this.liveRequest?.unsubscribe(); this.detailRequest?.unsubscribe(); this.listRequest?.unsubscribe();
    this.creating.set(true); this.showNotice('modalError', '');
    this.api.startConversation({ type: 'CompanyThread', category: this.newConv.category, subject, firstMessage })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.creating.set(false))).subscribe({
        next: conversation => {
          this.saveDraft(); this.detailRequest?.unsubscribe(); ++this.requestVersion; this.opening.set(false);
          this.active.set({ ...conversation, messages: conversation.messages ?? [] });
          this.replyText = ''; this.scrollPending = true; this.showNew.set(false);
          const sentDraft = this.savedDrafts().find(d => d.id === this.newDraftId);
          if (sentDraft) this.removeDraft(sentDraft);
          this.newDraftId = null;
          this.newConv = { category: this.categories[0], subject: '', firstMessage: '' };
          this.mailboxTab.set('conversations');
          this.showNotice('successMessage', 'تم إنشاء المحادثة وإرسال الرسالة.');
          this.loadConversations();
        },
        error: error => this.showNotice('modalError', this.failure(error, 'تعذر إنشاء المحادثة. البيانات محفوظة، أعد المحاولة.')),
      });
  }
  clearActive(): void {
    this.deleteConfirmation.set(null);
    if (this.sending() || this.deleting() || this.savingDraft()) return;
    this.saveDraft(); this.detailRequest?.unsubscribe(); ++this.requestVersion;
    this.opening.set(false); this.active.set(null); this.replyText = '';
  }
}
