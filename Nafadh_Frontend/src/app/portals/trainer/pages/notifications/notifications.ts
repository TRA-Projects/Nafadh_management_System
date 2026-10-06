import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { throwError, timer } from 'rxjs';
import { retry } from 'rxjs/operators';

import {
  NotificationDto,
  NotificationService
} from '../../../../shared/services/notification.service';

import { NotificationSummaryService } from '../../../../shared/services/notification-summary.service';

type NotificationFilter = 'all' | 'unread';
type DeleteMode = 'one' | 'selected';

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

  markingAll = signal(false);

  selectedIds = signal<Set<number>>(new Set());

  deleteModalOpen = signal(false);

  deleteMode = signal<DeleteMode>('selected');

  notificationToDelete = signal<NotificationDto | null>(null);


  filteredNotifications = computed(() => {

    const list = this.notifications();

    if (this.activeFilter() === 'unread') {
      return list.filter(notification => !notification.isRead);
    }

    return list;
  });


  totalCount = computed(() =>
    this.notifications().length
  );


  unreadCount = computed(() =>
    this.notifications().filter(
      notification => !notification.isRead
    ).length
  );


  selectedCount = computed(() =>
    this.selectedIds().size
  );


  allSelected = computed(() => {

    const list = this.filteredNotifications();

    if (!list.length) {
      return false;
    }

    return list.every(notification =>
      this.selectedIds().has(notification.notificationId)
    );
  });


  ngOnInit(): void {
    this.load();
  }


  load(): void {

    this.loading.set(true);

    this.error.set(null);

    this.clearSelection();

    this.notificationService
      .getMine()
      .pipe(
        retry({
          count: 4,

          delay: (error, retryCount) => {

            if (error?.status === 401) {

              console.log(
                `Notification request returned 401. Retry ${retryCount}/4`
              );

              return timer(1000);
            }

            return throwError(() => error);
          }
        })
      )
      .subscribe({

        next: data => {

          this.notifications.set(data ?? []);

          this.loading.set(false);
        },

        error: err => {

          console.error(
            'Failed to load notifications.',
            err
          );

          this.error.set(
            'تعذر تحميل الإشعارات.'
          );

          this.loading.set(false);
        }

      });
  }


  setFilter(filter: NotificationFilter): void {

    this.activeFilter.set(filter);

    this.clearSelection();
  }


  toggleSelection(notificationId: number): void {

    this.selectedIds.update(current => {

      const next = new Set(current);

      if (next.has(notificationId)) {
        next.delete(notificationId);
      } else {
        next.add(notificationId);
      }

      return next;
    });
  }


  isSelected(notificationId: number): boolean {
    return this.selectedIds().has(notificationId);
  }


  toggleSelectAll(): void {

    const list = this.filteredNotifications();

    if (this.allSelected()) {

      this.clearSelection();

      return;
    }

    this.selectedIds.set(
      new Set(
        list.map(
          notification => notification.notificationId
        )
      )
    );
  }


  clearSelection(): void {
    this.selectedIds.set(new Set());
  }


  markRead(notification: NotificationDto): void {

    if (notification.isRead) {
      return;
    }

    this.notificationService
      .markAsRead(notification.notificationId)
      .subscribe({

        next: () => {

          this.notifications.update(list =>
            list.map(item =>
              item.notificationId === notification.notificationId
                ? {
                    ...item,
                    isRead: true
                  }
                : item
            )
          );

          this.summaryService.refresh();
        },

        error: err => {

          console.error(
            'Failed to mark notification as read.',
            err
          );
        }

      });
  }


  markAllRead(): void {

    if (!this.unreadCount() || this.markingAll()) {
      return;
    }

    this.markingAll.set(true);

    this.notificationService
      .markAllAsRead()
      .subscribe({

        next: () => {

          this.notifications.update(list =>
            list.map(notification => ({
              ...notification,
              isRead: true
            }))
          );

          this.markingAll.set(false);

          this.summaryService.refresh();
        },

        error: err => {

          console.error(
            'Failed to mark all notifications as read.',
            err
          );

          this.markingAll.set(false);
        }

      });
  }


  markSelectedRead(): void {

    const ids = Array.from(
      this.selectedIds()
    );

    if (!ids.length) {
      return;
    }

    ids.forEach(id => {

      const notification =
        this.notifications().find(
          item => item.notificationId === id
        );

      if (notification) {
        this.markRead(notification);
      }

    });

    this.clearSelection();
  }


  askDeleteOne(notification: NotificationDto): void {

    this.notificationToDelete.set(notification);

    this.deleteMode.set('one');

    this.deleteModalOpen.set(true);
  }


  askDeleteSelected(): void {

    if (!this.selectedCount()) {
      return;
    }

    this.notificationToDelete.set(null);

    this.deleteMode.set('selected');

    this.deleteModalOpen.set(true);
  }


  cancelDelete(): void {

    this.deleteModalOpen.set(false);

    this.notificationToDelete.set(null);
  }


  confirmDelete(): void {

    if (this.deleteMode() === 'one') {

      const notification =
        this.notificationToDelete();

      if (!notification) {
        return;
      }

      this.notifications.update(list =>
        list.filter(
          item =>
            item.notificationId !==
            notification.notificationId
        )
      );

    } else {

      const ids = Array.from(
        this.selectedIds()
      );

      this.notifications.update(list =>
        list.filter(
          item =>
            !ids.includes(
              item.notificationId
            )
        )
      );

      this.clearSelection();
    }

    this.deleteModalOpen.set(false);

    this.notificationToDelete.set(null);

    this.summaryService.refresh();
  }


  deleteTitle(): string {

    if (this.deleteMode() === 'one') {
      return 'حذف الإشعار';
    }

    return 'حذف الإشعارات';
  }


  deleteMessage(): string {

    if (this.deleteMode() === 'one') {
      return 'هل أنت متأكد من حذف هذا الإشعار؟';
    }

    return `هل أنت متأكد من حذف ${this.selectedCount()} إشعارات محددة؟`;
  }


  trackById(
    _: number,
    item: NotificationDto
  ): number {
    return item.notificationId;
  }


  timeAgo(value: string): string {

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const diff = Math.max(
      0,
      Date.now() - date.getTime()
    );

    const minutes = Math.floor(
      diff / 60000
    );

    if (minutes < 1) {
      return 'الآن';
    }

    if (minutes < 60) {
      return `منذ ${minutes} دقيقة`;
    }

    const hours = Math.floor(
      minutes / 60
    );

    if (hours < 24) {
      return `منذ ${hours} ساعة`;
    }

    const days = Math.floor(
      hours / 24
    );

    if (days === 1) {
      return 'أمس';
    }

    if (days < 30) {
      return `منذ ${days} يوم`;
    }

    return date.toLocaleDateString('ar-OM');
  }
}