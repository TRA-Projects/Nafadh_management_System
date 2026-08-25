import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NotificationDto, NotificationService } from '../../../../shared/services/notification.service';
import { NotificationSummaryService } from '../../../../shared/services/notification-summary.service';

type NotificationFilter = 'all' | 'unread';

@Component({
  selector: 'app-trainer-notifications',
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class TrainerNotifications implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly summaryService = inject(NotificationSummaryService);

  notifications = signal<NotificationDto[]>([]);
  activeFilter = signal<NotificationFilter>('all');
  loading = signal(true);
  error = signal<string | null>(null);

  filteredNotifications = computed(() => {
    const list = this.notifications();
    return this.activeFilter() === 'unread' ? list.filter(n => !n.isRead) : list;
  });

  unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.notificationService.getMine().subscribe({
      next: data => { this.notifications.set(data ?? []); this.loading.set(false); },
      error: err => { console.error('Failed to load notifications.', err); this.error.set('تعذر تحميل الإشعارات.'); this.loading.set(false); },
    });
  }

  setFilter(filter: NotificationFilter): void { this.activeFilter.set(filter); }

  markRead(notification: NotificationDto): void {
    if (notification.isRead) return;
    this.notificationService.markAsRead(notification.notificationId).subscribe({
      next: () => {
        this.notifications.update(list => list.map(n => n.notificationId === notification.notificationId ? { ...n, isRead: true } : n));
        this.summaryService.refresh();
      },
      error: err => console.error('Failed to mark notification as read.', err),
    });
  }

  markAllRead(): void {
    if (!this.unreadCount()) return;
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
        this.summaryService.refresh();
      },
      error: err => console.error('Failed to mark all notifications as read.', err),
    });
  }

  trackById(_: number, item: NotificationDto): number { return item.notificationId; }

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
