import { CommonModule } from '@angular/common';

import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  NotificationDto,
  NotificationService
} from '../../../../shared/services/notification.service';

import {
  NotificationSummaryService
} from '../../../../shared/services/notification-summary.service';


type NotificationFilter =
  | 'all'
  | 'read'
  | 'unread';


@Component({
  selector: 'app-trainee-notifications',
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})

export class TraineeNotifications implements OnInit {

  private readonly notificationService =
    inject(NotificationService);

  private readonly summaryService =
    inject(NotificationSummaryService);


  notifications =
    signal<NotificationDto[]>([]);


  activeFilter =
    signal<NotificationFilter>('all');


  loading =
    signal(true);


  error =
    signal<string | null>(null);


  // =========================================================
  // Filter notifications
  // =========================================================

  filteredNotifications = computed(() => {

    const list =
      this.notifications();

    const filter =
      this.activeFilter();


    if (filter === 'read') {

      return list.filter(
        (notification) =>
          notification.isRead
      );

    }


    if (filter === 'unread') {

      return list.filter(
        (notification) =>
          !notification.isRead
      );

    }


    return list;

  });


  // =========================================================
  // Unread count
  // =========================================================

  unreadCount = computed(() =>

    this.notifications()
      .filter(
        (notification) =>
          !notification.isRead
      )
      .length

  );


  // =========================================================
  // Read count
  // =========================================================

  readCount = computed(() =>

    this.notifications()
      .filter(
        (notification) =>
          notification.isRead
      )
      .length

  );


  ngOnInit(): void {

    this.load();

  }


  // =========================================================
  // Load notifications
  // =========================================================

  load(): void {

    this.loading.set(true);

    this.error.set(null);


    this.notificationService
      .getMine()
      .subscribe({

        next: (data) => {

          this.notifications.set(
            data ?? []
          );

          this.loading.set(false);

        },


        error: (err) => {

          console.error(
            'Failed to load trainee notifications.',
            err
          );

          this.error.set(
            'تعذر تحميل الإشعارات.'
          );

          this.loading.set(false);

        },

      });

  }


  // =========================================================
  // Change filter
  // =========================================================

  setFilter(
    filter: NotificationFilter
  ): void {

    this.activeFilter.set(
      filter
    );

  }


  // =========================================================
  // Mark one notification as read
  // =========================================================

  markRead(
    notification: NotificationDto
  ): void {

    if (notification.isRead) {
      return;
    }


    this.notificationService
      .markAsRead(
        notification.notificationId
      )
      .subscribe({

        next: () => {

          this.notifications.update(
            (list) =>

              list.map(
                (item) =>

                  item.notificationId ===
                  notification.notificationId

                    ? {
                        ...item,
                        isRead: true
                      }

                    : item
              )
          );


          this.summaryService.refresh();

        },


        error: (err) => {

          console.error(
            'Failed to mark notification as read.',
            err
          );

        },

      });

  }


  // =========================================================
  // Mark all notifications as read
  // =========================================================

  markAllRead(): void {

    if (!this.unreadCount()) {
      return;
    }


    this.notificationService
      .markAllAsRead()
      .subscribe({

        next: () => {

          this.notifications.update(
            (list) =>

              list.map(
                (notification) => ({
                  ...notification,
                  isRead: true
                })
              )
          );


          this.summaryService.refresh();

        },


        error: (err) => {

          console.error(
            'Failed to mark all notifications as read.',
            err
          );

        },

      });

  }


  // =========================================================
  // Track notification
  // =========================================================

  trackById(
    _: number,
    item: NotificationDto
  ): number {

    return item.notificationId;

  }


  // =========================================================
  // Time ago
  // =========================================================

  timeAgo(
    value: string
  ): string {

    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return value;

    }


    const diff =
      Math.max(
        0,
        Date.now() -
        date.getTime()
      );


    const minutes =
      Math.floor(
        diff / 60000
      );


    if (minutes < 1) {

      return 'منذ لحظات';

    }


    if (minutes < 60) {

      return `منذ ${minutes} دقيقة`;

    }


    const hours =
      Math.floor(
        minutes / 60
      );


    if (hours < 24) {

      return `منذ ${hours} ساعة`;

    }


    const days =
      Math.floor(
        hours / 24
      );


    if (days === 1) {

      return 'أمس';

    }


    if (days < 30) {

      return `منذ ${days} يوم`;

    }


    return date.toLocaleDateString(
      'ar-OM'
    );

  }

}