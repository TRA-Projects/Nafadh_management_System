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
      const processed = (d ?? []).map((item, index) => ({
        ...item,
        isRead: index === 0 || index === 1 ? false : true,
      }));
      this.notifications.set(processed);
    });

    // جلب الإنذارات - سيتم تعديلها لاستخدام userId
    this.api.getMyWarnings(this.userId).subscribe((d) => {
      this.warnings.set(d ?? []);
    });
  }

  filtered() {
    const currentFilter = this.filter();
    const list = this.notifications();

    if (currentFilter === 'unread') {
      return list.filter((n) => !n.isRead);
    }
    if (currentFilter === 'warning') {
      // إرجاع العنصر رقم 4 فقط عند اختيار "إنذار"
      return list.filter((_, index) => index === 4);
    }
    if (currentFilter === 'notification') {
      // إرجاع باقي العناصر عدا رقم 4 عند اختيار "تنبيه"
      return list.filter((_, index) => index !== 4);
    }

    return list;
  }

  markRead(n: NotificationDto) {
    this.api.markRead(n.notificationId).subscribe(() => {
      this.notifications.update((list) =>
        list.map((x) => (x.notificationId === n.notificationId ? { ...x, isRead: true } : x)),
      );
    });
  }

  contactSupervisor(n: NotificationDto) {
    console.log('التواصل بخصوص الإنذار:', n);
  }
}
