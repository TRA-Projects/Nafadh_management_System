import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-admin-notifications',
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications.html',
})
export class AdminNotifications implements OnInit {
  notifications = signal<NotificationDto[]>([]);
  showAnnounce = signal(false);
  announceMsg = '';

  constructor(private api: AdminApi, private auth: AuthService) {}
  ngOnInit() {
    const uid = this.auth.userId ?? 1;
    this.api.getNotifications(uid).subscribe((d) => this.notifications.set(d));
  }

  markRead(n: NotificationDto) {
    this.api.markNotificationRead(n.notificationId).subscribe(() => {
      this.notifications.update((list) => list.map((x) => (x.notificationId === n.notificationId ? { ...x, isRead: true } : x)));
    });
  }

  postAnnouncement() {
    const uid = this.auth.userId ?? 1;
    this.api.createAnnouncement({ scopeType: 'Platform', scopeId: null, message: this.announceMsg, createdByUserId: uid }).subscribe(() => {
      this.showAnnounce.set(false);
      this.announceMsg = '';
    });
  }
}
