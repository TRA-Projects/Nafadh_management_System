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

// Keyword rules used to infer the category from the notification's type / related entity / title.
const CATEGORY_RULES: { key: NotificationCategory; pattern: RegExp }[] = [
  { key: 'warning', pattern: /warn|alert|تحذير|إنذار|انذار/i },
  { key: 'task', pattern: /task|submission|project|مهمة|مهام|تسليم|مشروع/i },
  { key: 'message', pattern: /message|conversation|chat|ticket|support|محادثة|رسالة|رسائل|دعم|تذكرة/i },
  { key: 'evaluation', pattern: /evaluation|feedback|rubric|rating|تقييم|تقييمات/i },
  { key: 'attendance', pattern: /attendance|session|excuse|حضور|غياب|جلسة|عذر|أعذار/i },
  { key: 'announcement', pattern: /announce|إعلان|اعلان|تعميم/i },
  { key: 'payment', pattern: /payment|invoice|schedule|دفع|مدفوع|سداد|فاتورة|قسط/i },
  { key: 'achievement', pattern: /badge|certificate|achievement|شهادة|وسام|إنجاز|انجاز/i },
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

  categoryOf(item: NotificationDto): NotificationCategory {
    const raw = item as unknown as Record<string, unknown>;
    const text = [raw['type'], raw['notificationType'], raw['category'], item.relatedEntity, item.title]
      .filter((value) => value !== null && value !== undefined)
      .join(' ');
    return CATEGORY_RULES.find((rule) => rule.pattern.test(text))?.key ?? 'system';
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