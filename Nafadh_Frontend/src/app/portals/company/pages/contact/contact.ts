import { Component, OnInit, AfterViewChecked, OnDestroy, ElementRef, ViewChild, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subscription } from 'rxjs';
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
  private readonly api = inject(CompanyApi);
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
  totalConversations = computed(() => this.conversations().length);
  totalUnread = computed(() => this.conversations().reduce((n, c) => n + Math.max(0, c.unreadCount ?? 0), 0));
  unreadConversations = computed(() => this.conversations().filter(c => c.unreadCount > 0).length);
  readConversations = computed(() => this.totalConversations() - this.unreadConversations());
  private detailRequest?: Subscription;
  private listRequest?: Subscription;
  private requestVersion = 0;
  private scrollPending = false;
  private focusPending = false;
  private previousFocus: HTMLElement | null = null;
  private readonly drafts = new Map<number, string>();

  ngOnInit(): void { this.loadConversations(); }
  ngOnDestroy(): void { this.detailRequest?.unsubscribe(); this.listRequest?.unsubscribe(); }
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
      this.errorMessage.set('انتهت الجلسة أو تعذر تحديد المستخدم. يرجى تسجيل الدخول مجددًا.');
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
  loadConversations(): void {
    if (this.loading()) return;
    const userId = this.userId();
    if (!userId) return;
    this.loading.set(true);
    this.errorMessage.set('');
    this.listRequest = this.api.getConversations().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: data => this.conversations.set(this.sorted(data ?? [])),
      error: error => this.errorMessage.set(this.failure(error, 'تعذر تحميل المحادثات. أعد المحاولة باستخدام زر التحديث.')),
    });
  }
  filteredConversations(): ConversationListItemDto[] {
    const q = this.searchText.trim().toLocaleLowerCase();
    return this.conversations().filter(c => (this.filter() !== 'unread' || c.unreadCount > 0) &&
      [c.subject, c.category, c.lastMessagePreview].some(s => (s ?? '').toLocaleLowerCase().includes(q)));
  }
  resetFilters(): void { this.searchText = ''; this.filter.set('all'); }
  private saveDraft(): void {
    const id = this.active()?.conversationId;
    if (id) this.drafts.set(id, this.replyText);
  }
  open(id: number): void {
    if (!this.userId() || !Number.isInteger(id) || id <= 0 || this.sending() || this.creating()) return;
    this.saveDraft();
    this.detailRequest?.unsubscribe();
    const version = ++this.requestVersion;
    this.active.set(null);
    this.replyText = '';
    this.opening.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.detailRequest = this.api.getConversation(id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
      if (version === this.requestVersion) this.opening.set(false);
    })).subscribe({
      next: conversation => {
        if (version !== this.requestVersion) return;
        this.active.set({ ...conversation, messages: conversation.messages ?? [] });
        this.replyText = this.drafts.get(id) ?? '';
        this.scrollPending = true;
        this.markRead(id);
      },
      error: error => this.errorMessage.set(this.failure(error, 'تعذر فتح المحادثة. أعد المحاولة.')),
    });
  }
  private markRead(id: number): void {
    const userId = this.userId();
    if (!userId) return;
    this.api.markConversationRead(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.conversations.update(items => items.map(c => c.conversationId === id ? { ...c, unreadCount: 0 } : c)),
      error: error => this.errorMessage.set(this.failure(error, 'تم فتح المحادثة، لكن تعذر تحديث حالة القراءة. أعد فتحها للمحاولة.')),
    });
  }
  send(): void {
    const conversation = this.active();
    const content = this.replyText.trim();
    const userId = this.userId();
    if (!conversation || !content || !userId || this.sending() || this.opening()) return;
    if (content.length > 5000) { this.errorMessage.set('الحد الأقصى للرسالة 5000 حرف.'); return; }
    const id = conversation.conversationId;
    this.listRequest?.unsubscribe();
    this.sending.set(true);
    this.errorMessage.set('');
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
        if (this.active()?.conversationId === id) { this.replyText = ''; this.scrollPending = true; }
      },
      error: error => this.errorMessage.set(this.failure(error, 'تعذر إرسال الرسالة. نص الرسالة محفوظ، ويمكنك إعادة المحاولة.')),
    });
  }
  openNew(): void {
    if (this.sending() || this.creating()) return;
    this.previousFocus = typeof document !== 'undefined' ? document.activeElement as HTMLElement : null;
    this.modalError.set(''); this.successMessage.set(''); this.showNew.set(true); this.focusPending = true;
  }
  closeNew(): void {
    if (this.creating()) return;
    this.showNew.set(false); this.modalError.set(''); this.previousFocus?.focus();
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
    if (this.creating()) return;
    const userId = this.userId();
    if (!userId) { this.modalError.set(this.errorMessage()); return; }
    const subject = this.newConv.subject.trim(), firstMessage = this.newConv.firstMessage.trim();
    if (!subject || !firstMessage || subject.length > 150 || firstMessage.length > 5000 || !this.categories.includes(this.newConv.category)) {
      this.modalError.set('أدخل تصنيفًا صحيحًا وعنوانًا من 1 إلى 150 حرفًا ورسالة من 1 إلى 5000 حرف.'); return;
    }
    this.listRequest?.unsubscribe();
    this.creating.set(true); this.modalError.set('');
    this.api.startConversation({ type: 'CompanyThread', category: this.newConv.category, subject, firstMessage })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.creating.set(false))).subscribe({
        next: conversation => {
          this.saveDraft(); this.detailRequest?.unsubscribe(); ++this.requestVersion; this.opening.set(false);
          this.active.set({ ...conversation, messages: conversation.messages ?? [] });
          this.replyText = ''; this.scrollPending = true; this.showNew.set(false);
          this.newConv = { category: this.categories[0], subject: '', firstMessage: '' };
          this.successMessage.set('تم إنشاء المحادثة وإرسال الرسالة.');
          this.loadConversations();
        },
        error: error => this.modalError.set(this.failure(error, 'تعذر إنشاء المحادثة. البيانات محفوظة، أعد المحاولة.')),
      });
  }
  clearActive(): void {
    if (this.sending()) return;
    this.saveDraft(); this.detailRequest?.unsubscribe(); ++this.requestVersion;
    this.opening.set(false); this.active.set(null); this.replyText = '';
  }
}
