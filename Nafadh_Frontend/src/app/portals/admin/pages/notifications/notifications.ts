import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { AnnouncementDto } from '../../../../core/models/dtos';

type NotificationFilter = 'all' | 'unread';

interface NotificationViewModel {
  notificationId: number;
  title: string;
  message: string;
  isRead: boolean;
  dateLabel: string;
  isNew: boolean;
}

@Component({
  selector: 'app-admin-notifications',
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class AdminNotifications implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly auth = inject(AuthService);

  notifications = signal<AnnouncementDto[]>([]);
  activeFilter = signal<NotificationFilter>('all');
  loading = signal(true);
  error = signal<string | null>(null);

  showAnnounce = signal(false);
  announceMsg = '';
  posting = signal(false);
  announceError = signal<string | null>(null);

  private readIds(): number[] {
    try {
      return JSON.parse(localStorage.getItem('admin_read_announcements') || '[]');
    } catch {
      return [];
    }
  }

  filteredNotifications = computed<NotificationViewModel[]>(() => {
    const readIds = this.readIds();
    return this.notifications()
      .filter((n) => this.activeFilter() === 'all' || !readIds.includes(Number(n.announcementId ?? n.id ?? 0)))
      .map((n) => this.toViewModel(n));
  });

  unreadCount = computed(() => {
    const readIds = this.readIds();
    return this.notifications().filter((n) => !readIds.includes(Number(n.announcementId ?? n.id ?? 0))).length;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getAnnouncements().subscribe({
      next: (data: AnnouncementDto[]) => {
        const sorted = (data ?? []).sort((a, b) => {
          const aTime = new Date(a.createdAt || a.date || Date.now()).getTime();
          const bTime = new Date(b.createdAt || b.date || Date.now()).getTime();
          return bTime - aTime;
        });
        this.notifications.set(sorted);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load admin notifications.', err);
        this.error.set('تعذر تحميل الإشعارات.');
        this.loading.set(false);
      },
    });
  }

  setFilter(filter: NotificationFilter): void {
    this.activeFilter.set(filter);
  }

  markRead(item: NotificationViewModel): void {
    if (item.isRead) return;
    const readIds = this.readIds();
    if (!readIds.includes(item.notificationId)) {
      readIds.push(item.notificationId);
      localStorage.setItem('admin_read_announcements', JSON.stringify(readIds));
      this.notifications.update((list) => [...list]);
    }
  }

  markAllRead(): void {
    const ids = this.notifications().map((n) => Number(n.announcementId ?? n.id ?? 0));
    localStorage.setItem('admin_read_announcements', JSON.stringify(ids));
    this.notifications.update((list) => [...list]);
  }

  trackById(_: number, item: NotificationViewModel): number {
    return item.notificationId;
  }

  timeAgo(value?: string | Date): string {
    if (!value) return 'وقت غير محدد';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
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

  private toViewModel(n: AnnouncementDto): NotificationViewModel {
    const id = Number(n.announcementId ?? n.id ?? 0);
    const isRead = this.readIds().includes(id);
    const rawDate = n.createdAt || n.date;
    return {
      notificationId: id,
      title: n.title || 'إعلان نظامي جديد',
      message: n.message || n.description || '',
      isRead,
      dateLabel: this.timeAgo(rawDate),
      isNew: !isRead,
    };
  }

  postAnnouncement(): void {
    if (!this.announceMsg.trim() || this.posting()) return;

    const uid = this.auth.userId;
    if (!uid) {
      this.announceError.set('تعذر تحديد المستخدم الحالي.');
      return;
    }

    this.posting.set(true);
    this.announceError.set(null);

    this.api.createAnnouncement({
      scopeType: 0,
      scopeId: null,
      message: this.announceMsg.trim(),
      createdByUserId: uid,
    }).subscribe({
      next: () => {
        this.posting.set(false);
        this.showAnnounce.set(false);
        this.announceMsg = '';
        this.load();
      },
      error: (err) => {
        console.error('Failed to publish announcement.', err);
        this.posting.set(false);
        this.announceError.set(err?.error?.message || 'تعذر نشر الإعلان، تأكد من الاتصال بالخادم.');
      },
    });
  }

  exportAll(): void {
    const rows = this.filteredNotifications();
    const header = ['العنوان', 'الرسالة', 'الحالة', 'التاريخ'];
    const lines = rows.map((n) =>
      [n.title, n.message, n.isRead ? 'مقروء' : 'غير مقروء', n.dateLabel]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob(['\uFEFF' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'الإشعارات.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
