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
  enrollmentId = 1;
  notifications = signal<NotificationDto[]>([]);
  warnings = signal<WarningDto[]>([]);
  filter = signal<'all' | 'unread'>('all');

  constructor(private api: TraineeApi, private auth: AuthService) {}
  ngOnInit() {
    const uid = this.auth.userId ?? 4;
    this.api.getNotifications(uid).subscribe((d) => this.notifications.set(d ?? []));
    this.api.getMyWarnings(this.enrollmentId).subscribe((d) => this.warnings.set(d ?? []));
  }

  filtered() {
    if (this.filter() === 'unread') return this.notifications().filter((n) => !n.isRead);
    return this.notifications();
  }

  markRead(n: NotificationDto) {
    this.api.markRead(n.notificationId).subscribe(() => {
      this.notifications.update((list) => list.map((x) => (x.notificationId === n.notificationId ? { ...x, isRead: true } : x)));
    });
  }
}
