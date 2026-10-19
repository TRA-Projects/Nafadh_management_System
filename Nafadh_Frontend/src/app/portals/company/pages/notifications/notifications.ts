import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { NotificationDto, NotificationService } from '../../../../shared/services/notification.service';
import { NotificationSummaryService } from '../../../../shared/services/notification-summary.service';

type Filter = 'all' | 'unread' | 'read';
type Category = 'task' | 'message' | 'warning' | 'evaluation' | 'attendance' | 'announcement' | 'payment' | 'achievement' | 'system';
type SortOrder = 'newest' | 'oldest';
interface Group { label: string; items: NotificationDto[]; }
const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'task', label: 'المهام' }, { key: 'message', label: 'المحادثات' },
  { key: 'warning', label: 'التحذيرات' }, { key: 'evaluation', label: 'التقييمات' },
  { key: 'attendance', label: 'الحضور' }, { key: 'announcement', label: 'الإعلانات' },
  { key: 'payment', label: 'المدفوعات' }, { key: 'achievement', label: 'الإنجازات' },
  { key: 'system', label: 'عام' },
];
const ENTITY_RULES: { key: Category; pattern: RegExp }[] = [
  { key: 'warning', pattern: /warning/i }, { key: 'task', pattern: /task|submission|project/i },
  { key: 'message', pattern: /conversation|message|ticket|support/i },
  { key: 'evaluation', pattern: /evaluation|feedback|rubric/i },
  { key: 'attendance', pattern: /attendance|session|excuse/i },
  { key: 'announcement', pattern: /announcement/i },
  { key: 'payment', pattern: /payment|schedule|invoice/i },
  { key: 'achievement', pattern: /badge|certificate/i },
];
const TEXT_RULES: { key: Category; pattern: RegExp }[] = [
  { key: 'warning', pattern: /تحذير|إنذار|انذار/ }, { key: 'task', pattern: /مهمة|مهام|تسليم|مشروع/ },
  { key: 'message', pattern: /محادثة|رسالة|رسائل|دعم|تذكرة/ },
  { key: 'evaluation', pattern: /تقييم|تقييمات/ },
  { key: 'attendance', pattern: /حضور|غياب|جلسة|عذر|أعذار/ },
  { key: 'announcement', pattern: /إعلان|اعلان|تعميم/ },
  { key: 'payment', pattern: /دفع|مدفوع|سداد|فاتورة|قسط/ },
  { key: 'achievement', pattern: /شهادة|وسام|إنجاز|انجاز/ },
];

@Component({
  selector: 'app-company-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class CompanyNotifications implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly summaryService = inject(NotificationSummaryService);
  notifications = signal<NotificationDto[]>([]);
  activeFilter = signal<Filter>('all');
  activeCategory = signal<Category | 'all'>('all');
  search = signal('');
  sortOrder = signal<SortOrder>('newest');
  selectedDate = signal('');
  loading = signal(true);
  refreshing = signal(false);
  markingAll = signal(false);
  pendingIds = signal<ReadonlySet<number>>(new Set<number>());
  error = signal<string | null>(null);
  actionError = signal<string | null>(null);
  readonly skeletons = [1, 2, 3, 4];
  readonly totalCount = computed(() => this.notifications().length);
  readonly unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);
  readonly readCount = computed(() => this.totalCount() - this.unreadCount());
  readonly todayCount = computed(() => this.notifications().filter(n => this.dayLabel(n.createdAt) === 'اليوم').length);
  readonly warningCount = computed(() => this.notifications().filter(n => this.categoryOf(n) === 'warning').length);
  readonly categoryChips = computed(() => {
    const counts = new Map<Category, number>();
    for (const item of this.notifications()) {
      const category = this.categoryOf(item);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return CATEGORIES.filter(c => counts.has(c.key)).map(c => ({ ...c, count: counts.get(c.key) ?? 0 }));
  });
  readonly filteredNotifications = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    const category = this.activeCategory();
    const selectedDay = this.selectedDate();
    return this.notifications().filter(n => {
      if (selectedDay) {
        const date = new Date(n.createdAt);
        if (Number.isNaN(date.getTime())) return false;
        const localDay = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (localDay !== selectedDay) return false;
      }
      if (this.activeFilter() === 'unread' && n.isRead) return false;
      if (this.activeFilter() === 'read' && !n.isRead) return false;
      if (category !== 'all' && this.categoryOf(n) !== category) return false;
      return !query || `${n.title ?? ''} ${n.message ?? ''} ${n.relatedEntity ?? ''}`.toLocaleLowerCase().includes(query);
    }).sort((a, b) => {
      const left = new Date(a.createdAt).getTime() || 0;
      const right = new Date(b.createdAt).getTime() || 0;
      return this.sortOrder() === 'newest' ? right - left : left - right;
    });
  });
  readonly groups = computed<Group[]>(() => {
    const buckets = new Map<string, NotificationDto[]>();
    for (const item of this.filteredNotifications()) {
      const label = this.dayLabel(item.createdAt);
      if (!buckets.has(label)) buckets.set(label, []);
      buckets.get(label)!.push(item);
    }
    return Array.from(buckets, ([label, items]) => ({ label, items }));
  });
  readonly hasFilters = computed(() => this.search().trim() !== '' || this.activeFilter() !== 'all' || this.activeCategory() !== 'all' || !!this.selectedDate() || this.sortOrder() !== 'newest');

  ngOnInit(): void { this.fetch(true); }
  load(): void {
    if (this.loading() || this.refreshing()) return;
    this.fetch(true);
  }
  private fetch(showSkeleton: boolean): void {
    this.error.set(null);
    this.actionError.set(null);
    if (showSkeleton) this.loading.set(true);
    else this.refreshing.set(true);

    const complete = () => {
      this.loading.set(false);
      this.refreshing.set(false);
    };

    this.notificationService.getMine().pipe(finalize(complete)).subscribe({
      next: data => this.notifications.set(data ?? []),
      error: err => {
        console.error('Failed to load notifications', err);
        if (showSkeleton) this.error.set('تعذر تحميل الإشعارات. يرجى المحاولة مرة أخرى.');
        else this.actionError.set('تعذر تحديث الإشعارات. يرجى المحاولة مرة أخرى.');
      },
    });
  }
  refresh(): void { if (!this.loading() && !this.refreshing()) this.fetch(false); }
  retry(): void { if (!this.loading()) this.fetch(true); }
  setFilter(value: Filter): void { this.activeFilter.set(value); }
  setCategory(value: Category | 'all'): void { this.activeCategory.set(value); }
  setSearch(value: string): void { this.search.set(value); }
  setSort(value: string): void { this.sortOrder.set(value === 'oldest' ? 'oldest' : 'newest'); }
  setSelectedDate(value: string): void { this.selectedDate.set(value); }
  clearDate(): void { this.selectedDate.set(''); }
  clearFilters(): void { this.activeFilter.set('all'); this.activeCategory.set('all'); this.search.set(''); this.clearDate(); this.sortOrder.set('newest'); }
  isPending(id: number): boolean { return this.pendingIds().has(id); }
  markRead(item: NotificationDto): void {
    const id = item.notificationId;
    if (item.isRead || this.isPending(id) || this.markingAll()) return;
    this.actionError.set(null);
    this.pendingIds.update(ids => new Set([...ids, id]));
    this.notificationService.markAsRead(id).pipe(finalize(() => {
      this.pendingIds.update(ids => { const next = new Set(ids); next.delete(id); return next; });
    })).subscribe({
      next: () => {
        this.notifications.update(items => items.map(n => n.notificationId === id ? { ...n, isRead: true } : n));
        this.summaryService.refresh();
      },
      error: err => {
        console.error('Failed to mark notification as read', err);
        this.actionError.set('تعذر تعليم الإشعار كمقروء. يرجى المحاولة مرة أخرى.');
      },
    });
  }
  markAllRead(): void {
    if (!this.unreadCount() || this.markingAll() || this.pendingIds().size) return;
    this.actionError.set(null);
    this.markingAll.set(true);
    this.notificationService.markAllAsRead().pipe(finalize(() => this.markingAll.set(false))).subscribe({
      next: () => {
        this.notifications.update(items => items.map(n => ({ ...n, isRead: true })));
        this.summaryService.refresh();
      },
      error: err => {
        console.error('Failed to mark all notifications as read', err);
        this.actionError.set('تعذر تعليم جميع الإشعارات كمقروءة. يرجى المحاولة مرة أخرى.');
      },
    });
  }
  categoryOf(item: NotificationDto): Category {
    const entity = (item.relatedEntity ?? '').trim();
    const text = `${item.title ?? ''} ${item.message ?? ''}`;
    return ENTITY_RULES.find(rule => rule.pattern.test(entity))?.key ??
      TEXT_RULES.find(rule => rule.pattern.test(text))?.key ?? 'system';
  }
  categoryLabel(key: Category): string { return CATEGORIES.find(c => c.key === key)?.label ?? 'عام'; }
  private dayLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'سابقًا';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = new Date(date); day.setHours(0, 0, 0, 0);
    const days = Math.round((today.getTime() - day.getTime()) / 86400000);
    if (days <= 0) return 'اليوم';
    if (days === 1) return 'أمس';
    if (days < 7) return 'هذا الأسبوع';
    return 'سابقًا';
  }
  timeAgo(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'تاريخ غير متوفر';
    const minutes = Math.floor(Math.max(0, Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return 'منذ لحظات';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'أمس';
    if (days < 30) return `منذ ${days} يوم`;
    return date.toLocaleDateString('ar-OM');
  }
  fullDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'تاريخ غير متوفر' : date.toLocaleString('ar-OM');
  }
}
