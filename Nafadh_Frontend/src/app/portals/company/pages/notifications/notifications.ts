import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NotificationDto, NotificationService } from '../../../../shared/services/notification.service';
import { NotificationSummaryService } from '../../../../shared/services/notification-summary.service';

type NotificationFilter = 'all' | 'unread';

type NotificationCategory =
  | 'task'
  | 'message'
  | 'warning'
  | 'evaluation'
  | 'attendance'
  | 'announcement'
  | 'payment'
  | 'achievement'
  | 'system';

interface CategoryMeta {
  key: NotificationCategory;
  label: string;
}

interface NotificationGroup {
  label: string;
  items: NotificationDto[];
}

const CATEGORIES: CategoryMeta[] = [
  { key: 'task', label: 'المهام' },
  { key: 'message', label: 'المحادثات' },
  { key: 'warning', label: 'التحذيرات' },
  { key: 'evaluation', label: 'التقييمات' },
  { key: 'attendance', label: 'الحضور' },
  { key: 'announcement', label: 'الإعلانات' },
  { key: 'payment', label: 'المدفوعات' },
  { key: 'achievement', label: 'الإنجازات' },
  { key: 'system', label: 'عام' },
];

// NotificationDto has no "type" field, so the category comes from `relatedEntity`
// (the backend entity name, e.g. Task, SupportTicket, Warning). Matching it first is
// more reliable than guessing from free text; the title is only a fallback.
const ENTITY_RULES: { key: NotificationCategory; pattern: RegExp }[] = [
  { key: 'warning', pattern: /warning/i },
  { key: 'task', pattern: /task|submission|project/i },
  { key: 'message', pattern: /conversation|message|ticket|support/i },
  { key: 'evaluation', pattern: /evaluation|feedback|rubric/i },
  { key: 'attendance', pattern: /attendance|session|excuse/i },
  { key: 'announcement', pattern: /announcement/i },
  { key: 'payment', pattern: /payment|schedule|invoice/i },
  { key: 'achievement', pattern: /badge|certificate/i },
];

const TEXT_RULES: { key: NotificationCategory; pattern: RegExp }[] = [
  { key: 'warning', pattern: /تحذير|إنذار|انذار/ },
  { key: 'task', pattern: /مهمة|مهام|تسليم|مشروع/ },
  { key: 'message', pattern: /محادثة|رسالة|رسائل|دعم|تذكرة/ },
  { key: 'evaluation', pattern: /تقييم|تقييمات/ },
  { key: 'attendance', pattern: /حضور|غياب|جلسة|عذر|أعذار/ },
  { key: 'announcement', pattern: /إعلان|اعلان|تعميم/ },
  { key: 'payment', pattern: /دفع|مدفوع|سداد|فاتورة|قسط/ },
  { key: 'achievement', pattern: /شهادة|وسام|إنجاز|انجاز/ },
];

@Component({
  selector: 'app-company-notifications',
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class CompanyNotifications implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly summaryService = inject(NotificationSummaryService);

  notifications = signal<NotificationDto[]>([]);
  activeFilter = signal<NotificationFilter>('all');
  activeCategory = signal<NotificationCategory | 'all'>('all');
  loading = signal(true);
  error = signal<string | null>(null);

  readonly skeletons = [1, 2, 3, 4];

  unreadCount = computed(() => this.notifications().filter((n) => !n.isRead).length);

  /** Categories that actually exist in the list, with counts, for the filter chips. */
  categoryChips = computed(() => {
    const counts = new Map<NotificationCategory, number>();
    for (const item of this.notifications()) {
      const key = this.categoryOf(item);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return CATEGORIES.filter((c) => counts.has(c.key)).map((c) => ({ ...c, count: counts.get(c.key) ?? 0 }));
  });

  filteredNotifications = computed(() => {
    let list = this.notifications();
    if (this.activeFilter() === 'unread') list = list.filter((n) => !n.isRead);
    const category = this.activeCategory();
    if (category !== 'all') list = list.filter((n) => this.categoryOf(n) === category);
    return list;
  });

  groups = computed<NotificationGroup[]>(() => {
    const buckets = new Map<string, NotificationDto[]>();
    for (const item of this.filteredNotifications()) {
      const label = this.dayLabel(item.createdAt);
      if (!buckets.has(label)) buckets.set(label, []);
      buckets.get(label)!.push(item);
    }
    return Array.from(buckets, ([label, items]) => ({ label, items }));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.notificationService.getMine().subscribe({
      next: (data) => {
        this.notifications.set(data ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load notifications.', err);
        this.error.set('تعذر تحميل الإشعارات.');
        this.loading.set(false);
      },
    });
  }

  setFilter(filter: NotificationFilter): void {
    this.activeFilter.set(filter);
  }

  setCategory(category: NotificationCategory | 'all'): void {
    this.activeCategory.set(this.activeCategory() === category ? 'all' : category);
  }

  markRead(notification: NotificationDto): void {
    if (notification.isRead) return;
    this.notificationService.markAsRead(notification.notificationId).subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) => (n.notificationId === notification.notificationId ? { ...n, isRead: true } : n)),
        );
        this.summaryService.refresh();
      },
      error: (err) => console.error('Failed to mark notification as read.', err),
    });
  }

  markAllRead(): void {
    if (!this.unreadCount()) return;
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
        this.summaryService.refresh();
      },
      error: (err) => console.error('Failed to mark all notifications as read.', err),
    });
  }

  trackById(_: number, item: NotificationDto): number {
    return item.notificationId;
  }

  /**
   * NotificationDto has no type field, so the category is read from `relatedEntity`
   * (the backend entity the notification points to) first. Only when that is empty or
   * unknown does it fall back to Arabic keywords in the title and message.
   */
  categoryOf(item: NotificationDto): NotificationCategory {
    return (
      this.matchCategory(item.relatedEntity, ENTITY_RULES) ??
      this.matchCategory(`${item.title ?? ''} ${item.message ?? ''}`, TEXT_RULES) ??
      'system'
    );
  }

  private matchCategory(
    text: string | null | undefined,
    rules: { key: NotificationCategory; pattern: RegExp }[],
  ): NotificationCategory | null {
    const value = (text ?? '').trim();
    if (!value) return null;
    return rules.find((rule) => rule.pattern.test(value))?.key ?? null;
  }

  categoryLabel(key: NotificationCategory): string {
    return CATEGORIES.find((c) => c.key === key)?.label ?? 'عام';
  }

  private dayLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'سابقًا';
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfDate = new Date(date);
    startOfDate.setHours(0, 0, 0, 0);
    const days = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);
    if (days <= 0) return 'اليوم';
    if (days === 1) return 'أمس';
    if (days < 7) return 'هذا الأسبوع';
    return 'سابقًا';
  }

  timeAgo(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const diff = Math.max(0, Date.now() - date.getTime());
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'منذ لحظات';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'أمس';
    if (days < 30) return `منذ ${days} يوم`;
    return date.toLocaleDateString('ar-OM');
  }
}