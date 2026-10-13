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


type NotificationType =
  | 'task'
  | 'announcement'
  | 'reminder'
  | 'message'
  | 'system'
  | 'training'
  | 'lesson'
  | 'program'
  | 'assignment'
  | 'evaluation'
  | 'certificate'
  | 'attendance'
  | 'payment'
  | 'feedback'
  | 'achievement'
  | 'report'
  | 'unknown';


type NotificationTypeFilter =
  | 'all'
  | 'evaluation'
  | 'reminder'
  | 'task'
  | 'unknown';


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


  activeTypeFilter =
    signal<NotificationTypeFilter>('all');


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

    const typeFilter =
      this.activeTypeFilter();


    return list.filter((notification) => {

      const matchesReadFilter =
        filter === 'all' ||
        (filter === 'read' && notification.isRead) ||
        (filter === 'unread' && !notification.isRead);


      const notificationType =
        this.getNotificationType(
          notification.relatedEntity
        );


      const matchesTypeFilter =
        typeFilter === 'all' ||
        notificationType === typeFilter;


      return (
        matchesReadFilter &&
        matchesTypeFilter
      );

    });

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
  // Change read status filter
  // =========================================================

  setFilter(
    filter: NotificationFilter
  ): void {

    this.activeFilter.set(
      filter
    );

  }


  // =========================================================
  // Change notification type filter
  // =========================================================

  setTypeFilter(
    type: NotificationTypeFilter
  ): void {

    this.activeTypeFilter.set(
      type
    );

  }


  // =========================================================
  // Normalize notification type
  // =========================================================

  private normalizeNotificationType(
    value: string | null | undefined
  ): NotificationType {

    if (!value) {

      return 'unknown';

    }


    const normalized =
      value
        .trim()
        .toLowerCase()
        .replace(/[\s_-]/g, '');


    if (
      normalized.includes('task') ||
      normalized.includes('tasknotification') ||
      normalized.includes('taskassignment')
    ) {

      return 'task';

    }


    if (
      normalized.includes('announcement') ||
      normalized.includes('announce')
    ) {

      return 'announcement';

    }


    if (
      normalized.includes('reminder') ||
      normalized.includes('remind')
    ) {

      return 'reminder';

    }


    if (
      normalized.includes('message') ||
      normalized.includes('chat')
    ) {

      return 'message';

    }


    if (
      normalized.includes('system') ||
      normalized.includes('systemnotification')
    ) {

      return 'system';

    }


    if (
      normalized.includes('training') ||
      normalized.includes('trainingprogram')
    ) {

      return 'training';

    }


    if (
      normalized.includes('lesson') ||
      normalized.includes('course')
    ) {

      return 'lesson';

    }


    if (
      normalized.includes('program') ||
      normalized.includes('programme')
    ) {

      return 'program';

    }


    if (
      normalized.includes('assignment') ||
      normalized.includes('homework')
    ) {

      return 'assignment';

    }


    if (
      normalized.includes('evaluation') ||
      normalized.includes('assessment')
    ) {

      return 'evaluation';

    }


    if (
      normalized.includes('certificate') ||
      normalized.includes('certification')
    ) {

      return 'certificate';

    }


    if (
      normalized.includes('attendance') ||
      normalized.includes('attend') ||
      normalized.includes('absence') ||
      normalized.includes('absent') ||
      normalized.includes('late')
    ) {

      return 'attendance';

    }


    if (
      normalized.includes('payment') ||
      normalized.includes('invoice')
    ) {

      return 'payment';

    }


    if (
      normalized.includes('feedback') ||
      normalized.includes('comment')
    ) {

      return 'feedback';

    }


    if (
      normalized.includes('achievement') ||
      normalized.includes('badge')
    ) {

      return 'achievement';

    }


    if (
      normalized.includes('report')
    ) {

      return 'report';

    }


    return 'unknown';

  }


  // =========================================================
  // Translate notification type
  // =========================================================

  getRelatedEntityLabel(
    value: string | null | undefined
  ): string {

    const type =
      this.normalizeNotificationType(value);


    const labels: Record<
      NotificationType,
      string
    > = {

      task: 'مهمة',

      announcement: 'إعلان',

      reminder: 'تذكير',

      message: 'رسالة',

      system: 'النظام',

      training: 'التدريب',

      lesson: 'درس',

      program: 'برنامج',

      assignment: 'واجب',

      evaluation: 'تقييم',

      certificate: 'شهادة',

      attendance: 'الحضور',

      payment: 'الدفع',

      feedback: 'ملاحظات',

      achievement: 'إنجاز',

      report: 'تقرير',

      unknown: 'إشعار',

    };


    return labels[type];

  }


  // =========================================================
  // Get notification type
  // =========================================================

  getNotificationType(
    value: string | null | undefined
  ): NotificationType {

    return this.normalizeNotificationType(value);

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