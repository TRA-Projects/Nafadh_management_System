import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TraineeApi } from '../../services/trainee-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationDto, WarningDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainee-notifications',
  imports: [CommonModule],
  templateUrl: './notifications.html',
})
export class TraineeNotifications implements OnInit {
  userId = 0; // سيتم تعيينه من AuthService

  notifications = signal<NotificationDto[]>([]);
  warnings = signal<WarningDto[]>([]);

  // تعريف قيم الفلتر المتاحة
  filter = signal<'all' | 'unread' | 'notification' | 'warning'>('all');

  constructor(
    private api: TraineeApi,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    // الحصول على userId من AuthService
    this.userId = this.auth.userId ?? 4;

    // جلب الإشعارات باستخدام userId
    this.api.getNotifications(this.userId).subscribe((d) => {
      const processed = (d ?? []).map((item) => ({
        ...item,
        isRead: item.isRead ?? false, // استخدام القيمة الفعلية من الخادم
      }));
      this.notifications.set(processed);
    });

    // جلب الإنذارات - سيتم تعديلها لاستخدام userId
    this.api.getMyWarnings(this.userId).subscribe((d) => {
      this.warnings.set(d ?? []);
    });
  }

  /**
   * الحصول على العناصر المفلترة
   */
  filtered() {
    const currentFilter = this.filter();
    const list = this.notifications();

    if (currentFilter === 'unread') {
      return list.filter((n) => !n.isRead);
    }
    if (currentFilter === 'warning') {
      // إرجاع العناصر التي تحتوي على إنذار أو تحذير
      return list.filter((n) => n.title?.includes('إنذار') || n.title?.includes('تحذير'));
    }
    if (currentFilter === 'notification') {
      // إرجاع العناصر التي لا تحتوي على إنذار أو تحذير
      return list.filter((n) => !n.title?.includes('إنذار') && !n.title?.includes('تحذير'));
    }

    return list;
  }

  /**
   * تحديد تنبيه كمقروء
   */
  markRead(n: NotificationDto) {
    // تحديث محلياً أولاً لتجربة أفضل
    this.notifications.update((list) =>
      list.map((x) => (x.notificationId === n.notificationId ? { ...x, isRead: true } : x)),
    );

    // إرسال الطلب إلى الخادم
    this.api.markRead(n.notificationId).subscribe({
      next: () => {
        console.log('Notification marked as read:', n.notificationId);
      },
      error: (error: any) => {
        console.error('Error marking notification as read:', error);
        // في حالة الخطأ، نعيد تحميل البيانات
        this.api.getNotifications(this.userId).subscribe((d) => {
          const processed = (d ?? []).map((item) => ({
            ...item,
            isRead: item.isRead ?? false,
          }));
          this.notifications.set(processed);
        });
      },
    });
  }

  /**
   * تحديد جميع التنبيهات كمقروءة
   */
  markAllAsRead() {
    const unreadNotifications = this.notifications().filter((n) => !n.isRead);

    if (unreadNotifications.length === 0) {
      return;
    }

    // تحديث محلياً أولاً لتجربة أفضل
    this.notifications.update((list) => list.map((x) => ({ ...x, isRead: true })));

    // إرسال الطلب إلى الخادم
    this.api.markAllNotificationsAsRead(this.userId).subscribe({
      next: () => {
        console.log('All notifications marked as read');
      },
      error: (error: any) => {
        console.error('Error marking all notifications as read:', error);
        // في حالة الخطأ، نعيد تحميل البيانات
        this.api.getNotifications(this.userId).subscribe((d) => {
          const processed = (d ?? []).map((item) => ({
            ...item,
            isRead: item.isRead ?? false,
          }));
          this.notifications.set(processed);
        });
      },
    });
  }

  /**
   * الحصول على عدد التنبيهات غير المقروءة
   */
  getUnreadCount(): number {
    return this.notifications().filter((n) => !n.isRead).length;
  }

  /**
   * التواصل مع المشرف بخصوص الإنذار
   */
  contactSupervisor(n: NotificationDto) {
    console.log('التواصل بخصوص الإنذار:', n);
    // يمكنك إضافة منطق للتواصل مع المشرف هنا
  }
}
