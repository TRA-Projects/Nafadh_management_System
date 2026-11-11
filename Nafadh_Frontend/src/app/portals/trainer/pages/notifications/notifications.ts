import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, throwError, timer } from 'rxjs';
import { retry } from 'rxjs/operators';
import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  NotificationDto,
  NotificationService,
  SendBatchNotificationDto
} from '../../../../shared/services/notification.service';

import { NotificationSummaryService } from '../../../../shared/services/notification-summary.service';

type NotificationFilter = 'all' | 'unread' | 'read';
type NotificationType =
  | 'all'
  | 'announcement'
  | 'task'
  | 'evaluation'
  | 'attendance'
  | 'conversation'
  | 'warning'
  | 'session'
  | 'tasksubmission';
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
  private readonly router = inject(Router);
  private readonly trainerApi = inject(TrainerApi);
private readonly auth = inject(AuthService);

trainerBatches = signal<Array<{
  batchId: number;
  batchName?: string | null;
}>>([]);

batchTrainees = signal<Array<{
  traineeId: number;
  fullName: string;
}>>([]);

loadingBatches = signal(false);
loadingTrainees = signal(false);

  notifications = signal<NotificationDto[]>([]);
  activeFilter = signal<NotificationFilter>('all');
  activeType = signal<NotificationType>('all');
  loading = signal(true);
  error = signal<string | null>(null);
  markingAll = signal(false);
  selectedIds = signal<Set<number>>(new Set());
  deleteModalOpen = signal(false);
  deleteMode = signal<DeleteMode>('selected');
  notificationToDelete = signal<NotificationDto | null>(null);
  deleting = signal(false);
  deleteError = signal<string | null>(null);

  sendModalOpen = signal(false);
  sending = signal(false);
  sendError = signal<string | null>(null);
  sendSuccess = signal<string | null>(null);
  sendBatchId = signal<number | null>(null);
  sendTraineeId = signal<number | null>(null);
  sendTitle = signal('');
  sendMessage = signal('');

  // متغيرات نافذة تفاصيل الإشعار المنبثقة
  notificationDetailsModalOpen = signal(false);
  selectedNotificationForDetails = signal<NotificationDto | null>(null);

filteredNotifications = computed(() => {
  let list = this.notifications();

  if (this.activeFilter() === 'unread') {
    list = list.filter(n => !n.isRead);
  } else if (this.activeFilter() === 'read') {
    list = list.filter(n => n.isRead);
  }

  if (this.activeType() !== 'all') {
    list = list.filter(n => {
      const entity = this.getNotificationType(n.relatedEntity);

      if (this.activeType() === 'session') {
        return entity.startsWith('session:') || entity === 'session';
      }

      return entity === this.activeType();
    });
  }

  return list;
});

  totalCount = computed(() => this.notifications().length);

  unreadCount = computed(() =>
    this.notifications().filter(notification => !notification.isRead).length
  );
readCount = computed(() =>
  this.notifications().filter(notification => notification.isRead).length
);
  selectedCount = computed(() => this.selectedIds().size);

  allSelected = computed(() => {
    const list = this.filteredNotifications();
    if (!list.length) return false;
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
          delay: (error: any, retryCount: number) => {
            if (error?.status === 401) {
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
          console.error('Failed to load notifications.', err);
          this.error.set('تعذر تحميل الإشعارات.');
          this.loading.set(false);
        }
      });
  }

  setFilter(filter: NotificationFilter): void {
    this.activeFilter.set(filter);
    this.clearSelection();
  }
  setType(type: NotificationType): void {
  this.activeType.set(type);
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
      new Set(list.map(notification => notification.notificationId))
    );
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  markRead(notification: NotificationDto): void {
    if (notification.isRead) return;

    this.notificationService.markAsRead(notification.notificationId).subscribe({
      next: () => {
        this.notifications.update(list =>
          list.map(item =>
            item.notificationId === notification.notificationId
              ? { ...item, isRead: true }
              : item
          )
        );
        this.summaryService.refresh();
      },
      error: err => console.error('Failed to mark as read.', err)
    });
  }

  markAllRead(): void {
    if (!this.unreadCount() || this.markingAll()) return;

    this.markingAll.set(true);
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update(list =>
          list.map(notification => ({ ...notification, isRead: true }))
        );
        this.markingAll.set(false);
        this.summaryService.refresh();
      },
      error: err => {
        console.error('Failed to mark all as read.', err);
        this.markingAll.set(false);
      }
    });
  }

  markSelectedRead(): void {
    const ids = Array.from(this.selectedIds());
    if (!ids.length) return;

    ids.forEach(id => {
      const notification = this.notifications().find(item => item.notificationId === id);
      if (notification) {
        this.markRead(notification);
      }
    });
    this.clearSelection();
  }

  // دالة فتح الإشعار (توجيه مباشر للصفحات المرتبطة أو فتح النافذة المنبثقة للإعلانات)
  openNotification(notification: NotificationDto): void {
    const navigateTo = this.getNotificationRoute(notification.relatedEntity);

    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.notificationId).subscribe({
        next: () => {
          this.notifications.update(list =>
            list.map(item =>
              item.notificationId === notification.notificationId
                ? { ...item, isRead: true }
                : item
            )
          );
          this.summaryService.refresh();
        },
        error: err => console.error('Failed to mark as read.', err)
      });
    }

    if (navigateTo) {
      this.router.navigate(navigateTo);
      return;
    }

    this.selectedNotificationForDetails.set(notification);
    this.notificationDetailsModalOpen.set(true);
  }

  closeNotificationDetails(): void {
    this.notificationDetailsModalOpen.set(false);
    this.selectedNotificationForDetails.set(null);
  }

  // دالة ربط مسارات التوجيه حسب نوع الكيان المرتبط
  private getNotificationRoute(
    relatedEntity?: string | null
  ): string[] | null {
    switch (relatedEntity?.trim().toLowerCase()) {
      case 'task':
        return ['/trainer/tasks'];
      case 'evaluation':
        return ['/trainer/trainees'];
      case 'attendance':
        return ['/trainer/attendance'];
      default:
        return null;
    }
  }

  askDeleteOne(notification: NotificationDto): void {
    this.notificationToDelete.set(notification);
    this.deleteMode.set('one');
    this.deleteError.set(null);
    this.deleteModalOpen.set(true);
  }

  askDeleteSelected(): void {
    if (!this.selectedCount()) return;
    this.notificationToDelete.set(null);
    this.deleteMode.set('selected');
    this.deleteError.set(null);
    this.deleteModalOpen.set(true);
  }

  cancelDelete(): void {
    this.deleteModalOpen.set(false);
    this.notificationToDelete.set(null);
  }

  confirmDelete(): void {
    if (this.deleting()) return;
    const ids = this.deleteMode() === 'one'
      ? [this.notificationToDelete()?.notificationId].filter((id): id is number => id != null)
      : Array.from(this.selectedIds());
    if (!ids.length) return;

    this.deleting.set(true);
    this.deleteError.set(null);
    forkJoin(ids.map(id => this.notificationService.deleteNotification(id))).subscribe({
      next: () => {
        const removed = new Set(ids);
        this.notifications.update(list => list.filter(item => !removed.has(item.notificationId)));
        this.clearSelection();
        this.deleteModalOpen.set(false);
        this.notificationToDelete.set(null);
        this.deleting.set(false);
        this.summaryService.refresh();
      },
      error: err => {
        console.error('Failed to delete notifications.', err);
        this.deleteError.set('تعذر حذف بعض الإشعارات. أعيدي تحميل الصفحة للتحقق.');
        this.deleting.set(false);
      }
    });
  }

openSendModal(): void {
  this.sendError.set(null);
  this.sendSuccess.set(null);
  this.sendBatchId.set(null);
  this.sendTraineeId.set(null);
  this.batchTrainees.set([]);
  this.trainerBatches.set([]);
  this.sendModalOpen.set(true);

  const userId = this.auth.session()?.userId;

  if (!userId) {
    this.sendError.set('تعذر تحديد المستخدم الحالي.');
    return;
  }

  this.loadingBatches.set(true);

  this.trainerApi.getTrainerByUserId(userId).subscribe({
    next: trainer => {
      this.trainerApi.getMyBatches(trainer.trainerId).subscribe({
        next: batches => {
          this.trainerBatches.set(batches ?? []);
          this.loadingBatches.set(false);
        },
        error: err => {
          console.error('Failed to load trainer batches.', err);
          this.sendError.set('تعذر تحميل دفعات المدرب.');
          this.loadingBatches.set(false);
        }
      });
    },
    error: err => {
      console.error('Failed to load trainer.', err);
      this.sendError.set('تعذر تحميل بيانات المدرب.');
      this.loadingBatches.set(false);
    }
  });
}

  closeSendModal(): void {
    if (!this.sending()) this.sendModalOpen.set(false);
  }

 updateSendBatchId(value: string): void {
  const id = Number(value);

  this.sendBatchId.set(
    value && Number.isInteger(id) && id > 0 ? id : null
  );

  this.sendTraineeId.set(null);
  this.batchTrainees.set([]);
  this.sendError.set(null);

  const batchId = this.sendBatchId();

  if (!batchId) return;

  if (!this.trainerBatches().some(b => b.batchId === batchId)) {
    this.sendBatchId.set(null);
    this.sendError.set('الدفعة غير متاحة لهذا المدرب.');
    return;
  }

  this.loadingTrainees.set(true);

  this.trainerApi.getBatchTrainees(batchId).subscribe({
    next: trainees => {
      this.batchTrainees.set(
        (trainees as Array<{ traineeId: number; fullName: string }>) ?? []
      );
      this.loadingTrainees.set(false);
    },
    error: err => {
      console.error('Failed to load trainees.', err);
      this.sendError.set('تعذر تحميل متدربي الدفعة.');
      this.loadingTrainees.set(false);
    }
  });
}

  updateSendTraineeId(value: string): void {
    const id = Number(value);
    this.sendTraineeId.set(value.trim() && Number.isInteger(id) && id > 0 ? id : null);
  }

  sendNotification(): void {
    if (this.sending()) return;
    const batchId = this.sendBatchId();
    const title = this.sendTitle().trim();
    const message = this.sendMessage().trim();
    if (!batchId || !title || !message) {
      this.sendError.set('رقم الدفعة وعنوان الإشعار ومحتواه مطلوبة.');
      return;
    }
    if (
  !this.trainerBatches().some(batch => batch.batchId === batchId)
) {
  this.sendError.set('الدفعة المحددة غير متاحة.');
  return;
}

if (this.loadingTrainees()) {
  this.sendError.set('انتظري حتى يكتمل تحميل المتدربين.');
  return;
}

const traineeId = this.sendTraineeId();

if (
  traineeId !== null &&
  !this.batchTrainees().some(trainee => trainee.traineeId === traineeId)
) {
  this.sendError.set('المتدرب غير موجود في الدفعة المحددة.');
  return;
}
    const dto: SendBatchNotificationDto = {
      batchId, traineeId: this.sendTraineeId(), title, message
    };
    this.sending.set(true);
    this.sendError.set(null);
    this.sendSuccess.set(null);
    this.notificationService.sendToBatch(dto).subscribe({
      next: result => {
        this.sending.set(false);
        this.sendSuccess.set(`تم إرسال الإشعار إلى ${result.sentCount} مستلم.`);
        this.sendTitle.set('');
        this.sendMessage.set('');
      },
      error: err => {
        console.error('Failed to send notification.', err);
        this.sendError.set(err?.error?.message ?? 'تعذر إرسال الإشعار.');
        this.sending.set(false);
      }
    });
  }

    deleteTitle(): string {
    return this.deleteMode() === 'one' ? 'حذف الإشعار' : 'حذف الإشعارات';
  }

  deleteMessage(): string {
    return this.deleteMode() === 'one'
      ? 'هل أنت متأكد من حذف هذا الإشعار؟'
      : `هل أنت متأكد من حذف ${this.selectedCount()} إشعارات محددة؟`;
  }
getNotificationType(relatedEntity?: string | null): string {
  const entity = (relatedEntity ?? '').trim().toLowerCase();

  if (entity.startsWith('session:')) return 'session';
  if (entity.startsWith('trainerannouncement:')) return 'announcement';

  const types = [
    'announcement', 'warning', 'attendance',
    'evaluation', 'task', 'tasksubmission',
    'conversation', 'session'
  ];

  return types.includes(entity) ? entity : 'other';
}

getNotificationIcon(relatedEntity?: string | null): string {
  const icons: Record<string, string> = {
    announcement: 'fa-bullhorn',
    warning: 'fa-triangle-exclamation',
    attendance: 'fa-calendar-check',
    evaluation: 'fa-star',
    task: 'fa-list-check',
    tasksubmission: 'fa-file-arrow-up',
    conversation: 'fa-comments',
    session: 'fa-chalkboard-user',
    other: 'fa-bell'
  };

  return icons[this.getNotificationType(relatedEntity)];
}
  trackById(_: number, item: NotificationDto): number {
    return item.notificationId;
  }

  timeAgo(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const diff = Math.max(0, Date.now() - date.getTime());
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'أمس';
    if (days < 30) return `منذ ${days} يوم`;

    return date.toLocaleDateString('ar-OM');
  }
}