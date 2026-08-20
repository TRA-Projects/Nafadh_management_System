import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  iconClass: string;
  isNew: boolean;
}

@Component({
  selector: 'app-admin-notifications',
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class AdminNotifications implements OnInit {
  notifications = signal<AnnouncementDto[]>([]);
  showAnnounce = signal(false);
  announceMsg = '';
  posting = signal(false);
  announceError = signal<string | null>(null);

  activeFilter = signal<NotificationFilter>('all');

  private filteredRaw = computed(() => {
    const list = this.notifications();
    const filter = this.activeFilter();

    if (filter === 'unread') {
      return list.filter((n) => {
        const readIds = JSON.parse(localStorage.getItem('admin_read_announcements') || '[]');
        return !readIds.includes(n.announcementId ?? n.id);
      });
    }
    return list;
  });

  filteredNotifications = computed<NotificationViewModel[]>(() =>
    this.filteredRaw().map((n) => this.toViewModel(n))
  );

  unreadCount = computed(() => {
    const list = this.notifications();
    const readIds = JSON.parse(localStorage.getItem('admin_read_announcements') || '[]');
    return list.filter((n) => !readIds.includes(n.announcementId ?? n.id)).length;
  });

  constructor(
    private api: AdminApi,
    private auth: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.api.getAnnouncements().subscribe({
      next: (d: AnnouncementDto[]) => {
        // ترتيب الإعلانات والأحدث أولاً مع حماية ضد القيم الفارغة
        const sorted = (d || []).sort((a, b) => {
          const timeA = new Date(a.createdAt || a.date || Date.now()).getTime();
          const timeB = new Date(b.createdAt || b.date || Date.now()).getTime();
          return timeB - timeA;
        });
        this.notifications.set(sorted);
      },
      error: (err) => {
        console.error('فشل في جلب الإعلانات:', err);
      }
    });
  }

  setFilter(filter: NotificationFilter) {
    this.activeFilter.set(filter);
  }

  private getTimeAgo(dateString?: string | Date): { label: string; isNew: boolean } {
    if (!dateString) return { label: 'وقت غير محدد', isNew: false };
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return { label: String(dateString), isNew: false };

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let label = '';
    if (diffMins < 1) label = 'منذ لحظات';
    else if (diffMins < 60) label = `منذ ${diffMins} دقيقة`;
    else if (diffHours < 24) label = `منذ ${diffHours} ${diffHours === 1 ? 'ساعة' : 'ساعات'}`;
    else if (diffDays === 1) label = 'أمس';
    else label = `منذ ${diffDays} أيام`;

    const isNew = diffMins < 60;
    return { label, isNew };
  }

  private toViewModel(n: AnnouncementDto): NotificationViewModel {
    const rawDate = n.createdAt || n.date;
    const timeInfo = this.getTimeAgo(rawDate);
    const readIds = JSON.parse(localStorage.getItem('admin_read_announcements') || '[]');
    const notificationId = Number(n.announcementId ?? n.id ?? 0);
    const isRead = readIds.includes(notificationId);

    return {
      notificationId: notificationId,
      title: n.title || 'إعلان نظامي جديد',
      message: n.message || n.description || '',
      isRead: isRead,
      dateLabel: timeInfo.label,
      isNew: timeInfo.isNew && !isRead,
      iconClass: 'info',
    };
  }

  markRead(vm: NotificationViewModel) {
    if (vm.isRead) return;
    const readIds = JSON.parse(localStorage.getItem('admin_read_announcements') || '[]');
    if (!readIds.includes(vm.notificationId)) {
      readIds.push(vm.notificationId);
      localStorage.setItem('admin_read_announcements', JSON.stringify(readIds));
    }
    this.notifications.update((list) => [...list]);
  }

  markAllRead() {
    const allIds = this.notifications().map((n) => Number(n.announcementId ?? n.id ?? 0));
    localStorage.setItem('admin_read_announcements', JSON.stringify(allIds));
    this.notifications.update((list) => [...list]);
  }

  onNotificationClick(vm: NotificationViewModel) {
    this.markRead(vm);
  }

  postAnnouncement() {
    if (!this.announceMsg.trim() || this.posting()) return;

    const uid = this.auth.userId ?? 1;
    this.posting.set(true);
    this.announceError.set(null);

    const payload = {
      scopeType: 0,
      scopeId: null,
      message: this.announceMsg.trim(),
      createdByUserId: uid
    };

    console.log('Sending announcement payload:', payload);

    this.api.createAnnouncement(payload).subscribe({
      next: () => {
        this.posting.set(false);
        this.showAnnounce.set(false);
        this.announceMsg = '';
        this.ngOnInit();
      },
      error: (err) => {
        if (err.status === 200 || err.name === 'HttpErrorResponse' && (err.error?.text || err.statusText === 'OK')) {
          this.posting.set(false);
          this.showAnnounce.set(false);
          this.announceMsg = '';
          this.ngOnInit();
          return;
        }

        this.posting.set(false);
        console.error('تفاصيل خطأ الباك إند الكاملة:', err);

        const serverError = err?.error?.message || err?.error?.title || err?.message;
        this.announceError.set(
          serverError ? `خطأ من الخادم: ${serverError}` : 'تعذر نشر الإعلان، تأكد من الاتصال بالخادم.'
        );
      },
    });
  }

  exportAll() {
    const rows = this.filteredNotifications();
    const header = ['العنوان', 'الرسالة', 'الحالة', 'التاريخ'];
    const lines = rows.map((n) => {
      const status = n.isRead ? 'مقروء' : 'غير مقروء';
      return [n.title, n.message, status, n.dateLabel].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = '\uFEFF' + [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'الإعلانات.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}