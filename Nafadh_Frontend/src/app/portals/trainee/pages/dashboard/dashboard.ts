import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TraineeApi } from '../../services/trainee-api';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  AnnouncementDto,
  TaskDto,
  TraineeDashboardSummaryDto,
  TraineeProfileDto,
  EnrollmentDto,
  BatchDto,
  ProgramDto,
  TrainerDto,
  CompanySupervisorDto,
  SubmissionDto,
  NotificationDto,
  DailyAttendanceDto,
  WarningDto,
} from '../../../../core/models/dtos';
import { AnnouncementScopeType, TRAINEE_STATUS_LABELS, TaskStatus } from '../../../../core/models/enums';

type SubmissionStatus = SubmissionDto['status'];

interface TaskWithSubmissionDto extends TaskDto {
  submissionStatus?: SubmissionStatus;
  submissionId?: number;
  grade?: string;
}

@Component({
  selector: 'app-trainee-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
})
export class TraineeDashboard implements OnInit {
  private api = inject(TraineeApi);
  public auth = inject(AuthService);

  currentUserId = signal<number | null>(null);

  traineeId = signal<number | null>(null);
  companyId = signal<number | null>(null);
  batchId = signal<number | null>(null);
  enrollmentId = signal<number | null>(null);
  supervisorId = signal<number | null>(null);

  traineeData = signal<TraineeProfileDto | null>(null);
  enrollmentData = signal<EnrollmentDto | null>(null);
  batchData = signal<BatchDto | null>(null);
  programData = signal<ProgramDto | null>(null);

  programName = signal<string>('');
  batchName = signal<string>('');
  programEndDate = signal<string>('');

  trainerData = signal<TrainerDto | null>(null);
  supervisorData = signal<CompanySupervisorDto | null>(null);

  summary = signal<TraineeDashboardSummaryDto | null>(null);
  tasks = signal<TaskWithSubmissionDto[]>([]);

  announcements = signal<(AnnouncementDto & { source: string })[]>([]);
  notifications = signal<NotificationDto[]>([]);

  attendanceRate = signal<number>(0);
  warningsCount = signal<number>(0);
  loadingAttendance = signal(false);
  loadingWarnings = signal(false);

  loading = signal(false);
  loadingTasks = signal(false);
  loadingAnnouncements = signal(false);
  loadingNotifications = signal(false);
  loadingProfile = signal(false);
  loadingTrainer = signal(false);
  loadingSupervisor = signal(false);

  errorMessage = signal('');

  showAllAnnouncements = signal(false);
  showAllNotifications = signal(false);

  selectedAnnouncement = signal<any | null>(null);

  openAnnouncementPopup(ann: any) {
    this.selectedAnnouncement.set(ann);
  }

  closeAnnouncementPopup() {
    this.selectedAnnouncement.set(null);
  }

  calculatedStatus = computed(() => {
    const status = this.summary()?.status;
    if (status && TRAINEE_STATUS_LABELS[status]) {
      return TRAINEE_STATUS_LABELS[status];
    }

    const today = new Date();
    const endDate = new Date(this.programEndDate() || Date.now());
    return today > endDate ? 'منتهي' : 'قيد التدريب';
  });

  progressPercentage = computed(() => {
    const summary = this.summary();
    if (!summary) return 0;
    return summary.moduleProgressPercentage ?? 0;
  });

  latestNotifications = computed(() => {
    const notifs = this.notifications();
    if (!notifs || notifs.length === 0) return [];

    const sorted = [...notifs].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    return sorted.slice(0, 5).map((notif) => ({
      message: notif.title || notif.message || '',
      date: notif.createdAt,
      isRead: notif.isRead,
      notificationId: notif.notificationId,
    }));
  });

  displayAnnouncements = computed(() => {
    const all = this.announcements();
    if (this.showAllAnnouncements()) {
      return all;
    }
    return all.slice(0, 3);
  });

  displayNotifications = computed(() => {
    const all = this.latestNotifications();
    if (this.showAllNotifications()) {
      return all;
    }
    return all.slice(0, 3);
  });

  // =========================================================
  // حالة التقويم الشهري للمهام
  // =========================================================

  calendarTasks = signal<TaskWithSubmissionDto[]>([]);
  calendarMonth = signal<number>(new Date().getMonth());
  calendarYear = signal<number>(new Date().getFullYear());
  selectedCalendarDay = signal<{ day: number; tasks: TaskWithSubmissionDto[] } | null>(null);

  weekDays = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  calendarMonthName = computed(() => {
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    ];
    return months[this.calendarMonth()];
  });

  calendarDays = computed(() => {
    const year = this.calendarYear();
    const month = this.calendarMonth();
    const tasks = this.calendarTasks();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: {
      day: number | null;
      hasTask: boolean;
      tasks: TaskWithSubmissionDto[];
      isToday: boolean;
    }[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, hasTask: false, tasks: [], isToday: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      date.setHours(0, 0, 0, 0);

      const dayTasks = tasks.filter((t) => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        return due.getTime() === date.getTime();
      });

      days.push({
        day: d,
        hasTask: dayTasks.length > 0,
        tasks: dayTasks,
        isToday: date.getTime() === today.getTime(),
      });
    }

    return days;
  });

  prevMonth(): void {
    const m = this.calendarMonth();
    if (m === 0) {
      this.calendarMonth.set(11);
      this.calendarYear.update((y) => y - 1);
    } else {
      this.calendarMonth.set(m - 1);
    }
  }

  nextMonth(): void {
    const m = this.calendarMonth();
    if (m === 11) {
      this.calendarMonth.set(0);
      this.calendarYear.update((y) => y + 1);
    } else {
      this.calendarMonth.set(m + 1);
    }
  }

  openCalendarDay(day: {
    day: number | null;
    hasTask: boolean;
    tasks: TaskWithSubmissionDto[];
    isToday: boolean;
  }): void {
    if (day.day === null || !day.tasks || day.tasks.length === 0) return;
    this.selectedCalendarDay.set({ day: day.day, tasks: day.tasks });
  }

  closeCalendarDay(): void {
    this.selectedCalendarDay.set(null);
  }

  toggleShowAllAnnouncements(): void {
    this.showAllAnnouncements.update((value) => !value);
  }

  toggleShowAllNotifications(): void {
    this.showAllNotifications.update((value) => !value);
  }

  getTaskStatusDisplay(status: any): string {
    if (!status) return 'جديد';

    const statusStr = String(status).toLowerCase();

    if (statusStr === 'new' || statusStr === 'pending') return 'جديد';
    if (statusStr === 'completed') return 'مكتمل';
    if (statusStr === 'graded') return 'مكتمل';
    if (statusStr === 'inprogress' || statusStr === 'in_progress') return 'قيد التنفيذ';
    if (statusStr === 'overdue') return 'منتهي';

    if (statusStr === 'submitted') return 'تم التسليم';
    if (statusStr === 'underreview' || statusStr === 'under_review') return 'قيد المراجعة';
    if (statusStr === 'returnedforrevision' || statusStr === 'returned') return 'مطلوب تعديل';
    if (statusStr === 'late') return 'متأخر';
    if (statusStr === 'closed') return 'مغلق';
    if (statusStr === 'open') return 'مفتوح';

    return status;
  }

  getTaskStatusStyle(status: any): { background: string; color: string } {
    if (!status) return { background: '#f1f5f9', color: '#64748b' };

    const statusStr = String(status).toLowerCase();

    if (statusStr === 'new' || statusStr === 'pending') {
      return { background: '#eff6ff', color: '#2563eb' };
    }
    if (statusStr === 'completed' || statusStr === 'graded') {
      return { background: '#f0fdf4', color: '#16a34a' };
    }
    if (statusStr === 'inprogress' || statusStr === 'in_progress') {
      return { background: '#fef3c7', color: '#d97706' };
    }
    if (statusStr === 'overdue') {
      return { background: '#fef2f2', color: '#dc2626' };
    }

    if (statusStr === 'submitted') {
      return { background: '#fef3c7', color: '#d97706' };
    }
    if (statusStr === 'underreview' || statusStr === 'under_review') {
      return { background: '#ede9fe', color: '#7c3aed' };
    }
    if (statusStr === 'returnedforrevision' || statusStr === 'returned') {
      return { background: '#fef2f2', color: '#dc2626' };
    }
    if (statusStr === 'late') {
      return { background: '#fef2f2', color: '#dc2626' };
    }
    if (statusStr === 'closed') {
      return { background: '#f1f5f9', color: '#64748b' };
    }
    if (statusStr === 'open') {
      return { background: '#eff6ff', color: '#2563eb' };
    }

    return { background: '#f1f5f9', color: '#64748b' };
  }

  constructor() {
    effect(() => {
      const session = this.auth.session?.();
      if (session?.userId) {
        this.currentUserId.set(session.userId);
        this.loadTraineeData();
      }
    });
  }

  ngOnInit() {
    const session = this.auth.session?.();
    if (session?.userId) {
      this.currentUserId.set(session.userId);
      this.loadTraineeData();
    } else {
      const userId = this.getUserIdFromStorage();
      if (userId) {
        this.currentUserId.set(userId);
        this.loadTraineeData();
      } else {
        this.errorMessage.set('يرجى تسجيل الدخول أولاً.');
      }
    }
  }

  loadTraineeData(): void {
    const userId = this.currentUserId();

    if (!userId) {
      this.errorMessage.set('يرجى تسجيل الدخول أولاً.');
      return;
    }

    this.loading.set(true);
    this.loadingProfile.set(true);
    this.errorMessage.set('');

    this.api.getTrainee(userId).subscribe({
      next: (trainee: TraineeProfileDto) => {
        this.traineeData.set(trainee);
        this.traineeId.set(trainee.traineeId);

        if (trainee.companyId) {
          this.companyId.set(trainee.companyId);
        }

        if (trainee.traineeId) {
          this.loadDashboardSummary(trainee.traineeId);
          this.loadEnrollments(trainee.traineeId);
        } else {
          this.loading.set(false);
          this.loadingProfile.set(false);
          this.errorMessage.set('لم يتم العثور على بيانات المتدرب.');
        }
      },
      error: (error: any) => {
        console.error('Error loading trainee:', error);
        this.loading.set(false);
        this.loadingProfile.set(false);
        this.errorMessage.set('تعذر تحميل بيانات المتدرب.');
      },
    });
  }

  loadDashboardSummary(traineeId: number): void {
    this.api.getDashboardSummary(traineeId).subscribe({
      next: (summary: TraineeDashboardSummaryDto) => {
        this.summary.set(summary);
        this.loading.set(false);
        this.loadingProfile.set(false);
      },
      error: (error: any) => {
        console.error('Error loading dashboard summary:', error);
        this.loading.set(false);
        this.loadingProfile.set(false);
        this.errorMessage.set('تعذر تحميل ملخص لوحة التحكم.');
      },
    });
  }

  loadAttendanceRate(userId: number): void {
    this.loadingAttendance.set(true);
    this.api.getAttendanceRateByUserId(userId).subscribe({
      next: (rate: number) => {
        this.attendanceRate.set(rate);
        this.loadingAttendance.set(false);
      },
      error: (error: any) => {
        console.error('Error loading attendance rate by userId:', error);
        this.loadingAttendance.set(false);
        this.loadAttendanceRateFallback();
      },
    });
  }

  private loadAttendanceRateFallback(): void {
    const traineeId = this.traineeId();
    if (traineeId) {
      this.api.getAttendance(traineeId).subscribe({
        next: (attendanceList: DailyAttendanceDto[]) => {
          if (attendanceList && attendanceList.length > 0) {
            const total = attendanceList.length;
            const present = attendanceList.filter(
              (a) => a.status === 'Present'
            ).length;
            const rate = total > 0 ? (present / total) * 100 : 0;
            this.attendanceRate.set(rate);
          }
          this.loadingAttendance.set(false);
        },
        error: () => {
          this.loadingAttendance.set(false);
        }
      });
    } else {
      this.loadingAttendance.set(false);
    }
  }

  loadWarningsCount(userId: number): void {
    this.loadingWarnings.set(true);
    this.api.getUserWarningsCount(userId).subscribe({
      next: (count: number) => {
        this.warningsCount.set(count);
        this.loadingWarnings.set(false);
      },
      error: (error: any) => {
        console.error('Error loading user warnings count:', error);
        this.loadingWarnings.set(false);
        this.loadWarningsCountFallback(userId);
      },
    });
  }

  private loadWarningsCountFallback(userId: number): void {
    this.api.getUserWarnings(userId).subscribe({
      next: (warnings: WarningDto[]) => {
        this.warningsCount.set(warnings?.length || 0);
        this.loadingWarnings.set(false);
      },
      error: (error: any) => {
        console.error('Error loading user warnings (fallback):', error);
        this.loadingWarnings.set(false);
      }
    });
  }

  loadEnrollments(traineeId: number): void {
    this.api.getEnrollmentsByTrainee(traineeId).subscribe({
      next: (enrollments: EnrollmentDto[]) => {
        if (enrollments && enrollments.length > 0) {
          const activeEnrollment =
            enrollments.find(
              (e) => e.completionStatus === 'Active' || e.completionStatus === 'InProgress',
            ) || enrollments[0];

          this.enrollmentData.set(activeEnrollment);
          this.enrollmentId.set(activeEnrollment.enrollmentId);
          this.batchId.set(activeEnrollment.batchId);

          if (activeEnrollment.supervisorId) {
            this.supervisorId.set(activeEnrollment.supervisorId);
          }

          if (activeEnrollment.batchName) {
            this.batchName.set(activeEnrollment.batchName);
          }

          this.loadBatchData(activeEnrollment.batchId);
          this.loadTrainerByBatch(activeEnrollment.batchId);

          const userId = this.currentUserId();
          if (userId) {
            this.loadSupervisorByUserId(userId);
          }

          this.loadTasks(activeEnrollment.batchId);

          if (userId) {
            this.loadUserAnnouncements(userId);
            this.loadUserNotifications(userId);
            this.loadAttendanceRate(userId);
            this.loadWarningsCount(userId);
          }
        } else {
          this.loading.set(false);
          this.loadingProfile.set(false);
          this.errorMessage.set('لا توجد تسجيلات نشطة للمتدرب.');
        }
      },
      error: (error: any) => {
        console.error('Error loading enrollments:', error);
        this.loading.set(false);
        this.loadingProfile.set(false);
        this.errorMessage.set('تعذر تحميل تسجيلات المتدرب.');
      },
    });
  }

  loadTrainerByBatch(batchId: number): void {
    this.loadingTrainer.set(true);

    this.api.getBatchTrainers(batchId).subscribe({
      next: (trainers: TrainerDto[]) => {
        if (trainers && trainers.length > 0) {
          const firstTrainer = trainers[0];

          if (firstTrainer.trainerId) {
            this.api.getTrainer(firstTrainer.trainerId).subscribe({
              next: (trainer: TrainerDto) => {
                this.trainerData.set(trainer);
                this.loadingTrainer.set(false);
              },
              error: () => {
                this.trainerData.set(null);
                this.loadingTrainer.set(false);
              },
            });
          } else {
            this.trainerData.set(firstTrainer);
            this.loadingTrainer.set(false);
          }
        } else {
          this.trainerData.set(null);
          this.loadingTrainer.set(false);
        }
      },
      error: () => {
        this.trainerData.set(null);
        this.loadingTrainer.set(false);
      },
    });
  }

  loadSupervisorByUserId(userId: number): void {
    this.loadingSupervisor.set(true);

    this.api.getCompanySupervisorByUserId(userId).subscribe({
      next: (supervisor: CompanySupervisorDto) => {
        this.supervisorData.set(supervisor);
        this.loadingSupervisor.set(false);
      },
      error: () => {
        this.supervisorData.set(null);
        this.loadingSupervisor.set(false);
      },
    });
  }

  loadBatchData(batchId: number): void {
    this.api.getBatch(batchId).subscribe({
      next: (batch: BatchDto) => {
        this.batchData.set(batch);

        if (batch.batchName) {
          this.batchName.set(batch.batchName);
        }

        if (batch.endDate) {
          this.programEndDate.set(batch.endDate);
        }

        if (batch.programId) {
          this.loadProgramData(batch.programId);
        }
      },
      error: (error: any) => {
        console.error('Error loading batch:', error);
      },
    });
  }

  loadProgramData(programId: number): void {
    this.api.getProgram(programId).subscribe({
      next: (program: ProgramDto) => {
        this.programData.set(program);

        if (program.title || program.name) {
          this.programName.set(program.title || program.name || '');
        }
      },
      error: (error: any) => {
        console.error('Error loading program:', error);
      },
    });
  }

  loadTasks(batchId: number): void {
    this.loadingTasks.set(true);
    const traineeId = this.traineeId();

    this.api.getTasks(batchId).subscribe({
      next: (tasks: TaskDto[]) => {
        if (tasks && tasks.length > 0 && traineeId) {
          this.api.getTraineeSubmissions(traineeId).subscribe({
            next: (submissions: SubmissionDto[]) => {
              const enrichedTasks = this.enrichTasksWithSubmission(tasks, submissions);
              this.processAndSetTasks(enrichedTasks);
            },
            error: () => {
              this.processAndSetTasks(tasks);
            },
          });
        } else {
          this.processAndSetTasks(tasks || []);
        }
      },
      error: () => {
        this.tasks.set([]);
        this.calendarTasks.set([]);
        this.loadingTasks.set(false);
      },
    });
  }

  private processAndSetTasks(tasks: TaskDto[]): void {
    if (!tasks || tasks.length === 0) {
      this.tasks.set([]);
      this.calendarTasks.set([]);
      this.loadingTasks.set(false);
      return;
    }

    let enrichedTasks = tasks as TaskWithSubmissionDto[];
    this.calendarTasks.set(enrichedTasks);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedTasks = enrichedTasks
      .filter((task) => {
        const isCompleted =
          (task.status as string) === 'Completed' || (task.status as string) === 'Graded';
        if (isCompleted) return false;

        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(0, 0, 0, 0);

          const daysDiff = Math.floor(
            (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (daysDiff > 7) return false;

          return true;
        }

        return true;
      })
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;

        const dateA = new Date(a.dueDate || Date.now());
        const dateB = new Date(b.dueDate || Date.now());
        return dateA.getTime() - dateB.getTime();
      });

    this.tasks.set(sortedTasks.slice(0, 3));
    this.loadingTasks.set(false);
  }

  private enrichTasksWithSubmission(
    tasks: TaskDto[],
    submissions: SubmissionDto[],
  ): TaskWithSubmissionDto[] {
    if (!submissions || submissions.length === 0) {
      return tasks as TaskWithSubmissionDto[];
    }

    return tasks.map((task) => {
      const submission = submissions.find((s) => s.taskId === task.taskId);
      if (submission) {
        return {
          ...task,
          submissionStatus: submission.status,
          submissionId: submission.submissionId,
          grade: submission.grade,
          status: submission.status === 'Graded' ? ('Completed' as TaskStatus) : task.status,
        };
      }
      return task as TaskWithSubmissionDto;
    });
  }

  loadUserAnnouncements(userId: number): void {
    this.loadingAnnouncements.set(true);
    this.announcements.set([]);

    this.api.getPlatformAnnouncements().subscribe({
      next: (items: AnnouncementDto[]) => {
        if (items && items.length > 0) {
          const mappedItems = items.map((item) => ({
            ...item,
            source: 'الهيئة',
          }));
          this.announcements.set(mappedItems);
        }
        this.loadingAnnouncements.set(false);
      },
      error: (error: any) => {
        console.error('Error loading platform announcements:', error);
        this.loadingAnnouncements.set(false);
      },
    });
  }

  private getAnnouncementSource(scopeType: AnnouncementScopeType): string {
    const scopeMap: Record<string, string> = {
      Platform: 'الهيئة',
      Company: 'الشركة',
      Batch: 'المدرب',
      Program: 'البرنامج',
    };
    return scopeMap[scopeType] || 'عام';
  }

  loadUserNotifications(userId: number): void {
    this.loadingNotifications.set(true);
    this.notifications.set([]);

    this.api.getNotifications(userId).subscribe({
      next: (items: NotificationDto[]) => {
        this.notifications.set(items || []);
        this.loadingNotifications.set(false);
      },
      error: (error: any) => {
        console.error('Error loading notifications:', error);
        this.notifications.set([]);
        this.loadingNotifications.set(false);
      },
    });
  }

  markNotificationAsRead(notificationId: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const userId = this.currentUserId();
    if (!userId) return;

    this.notifications.update((notifs) => {
      return notifs.map((notif) => {
        if (notif.notificationId === notificationId) {
          return { ...notif, isRead: true };
        }
        return notif;
      });
    });

    this.api.markNotificationAsRead(notificationId).subscribe({
      next: () => {
        console.log('Notification marked as read:', notificationId);
      },
      error: () => {
        if (userId) {
          this.loadUserNotifications(userId);
        }
      },
    });
  }

  markAllNotificationsAsRead(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const userId = this.currentUserId();
    if (!userId) return;

    this.notifications.update((notifs) => {
      return notifs.map((notif) => ({ ...notif, isRead: true }));
    });

    this.api.markAllNotificationsAsRead(userId).subscribe({
      next: () => {
        console.log('All notifications marked as read');
      },
      error: () => {
        if (userId) {
          this.loadUserNotifications(userId);
        }
      },
    });
  }

  getUnreadNotificationsCount(): number {
    return this.notifications().filter((n) => !n.isRead).length;
  }

  private getUserIdFromStorage(): number | null {
    const userIdFromStorage = localStorage.getItem('userId');
    if (userIdFromStorage) {
      return parseInt(userIdFromStorage, 10);
    }

    const userIdFromSession = sessionStorage.getItem('userId');
    if (userIdFromSession) {
      return parseInt(userIdFromSession, 10);
    }

    return null;
  }

  refreshData(): void {
    const traineeId = this.traineeId();
    const batchId = this.batchId();
    const userId = this.currentUserId();

    if (traineeId) {
      this.loadDashboardSummary(traineeId);
    }

    if (batchId) {
      this.loadTasks(batchId);
      this.loadTrainerByBatch(batchId);
    }

    if (userId) {
      this.loadUserAnnouncements(userId);
      this.loadUserNotifications(userId);
      this.loadAttendanceRate(userId);
      this.loadWarningsCount(userId);
    }
  }

  getStatusColor(status: string): string {
    const statusMap: Record<string, string> = {
      Active: 'var(--status-active-bg)',
      InProgress: 'var(--status-active-bg)',
      Completed: 'var(--status-completed-bg)',
      Graduated: 'var(--status-completed-bg)',
      Dropped: 'var(--status-new-bg)',
      Suspended: 'var(--status-new-bg)',
    };
    return statusMap[status] || 'var(--status-new-bg)';
  }

  getStatusTextColor(status: string): string {
    const statusMap: Record<string, string> = {
      Active: 'var(--status-active-fg)',
      InProgress: 'var(--status-active-fg)',
      Completed: 'var(--status-completed-fg)',
      Graduated: 'var(--status-completed-fg)',
      Dropped: 'var(--status-new-fg)',
      Suspended: 'var(--status-new-fg)',
    };
    return statusMap[status] || 'var(--status-new-fg)';
  }

  getInitial(name: string | undefined): string {
    if (!name) return 'م';
    const trimmed = name.trim();
    return trimmed.length > 0 ? trimmed[0] : 'م';
  }

  getTrainerSpecialty(): string {
    const trainer = this.trainerData();
    if (!trainer) return '';

    if (trainer.specialty) {
      return trainer.specialty;
    }

    if (trainer.experienceYears !== undefined && trainer.experienceYears > 0) {
      return `خبرة ${trainer.experienceYears} سنوات`;
    }

    if (trainer.biography) {
      return trainer.biography.length > 30
        ? trainer.biography.substring(0, 30) + '...'
        : trainer.biography;
    }

    return 'مدرب البرنامج';
  }

  getSupervisorRole(): string {
    const supervisor = this.supervisorData();
    if (!supervisor) return 'مشرف التدريب';

    if (supervisor.position) {
      return supervisor.position;
    }
    if (supervisor.department) {
      return supervisor.department;
    }
    return 'مشرف التدريب';
  }

  isTaskOverdue(dueDate: string | Date): boolean {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    return due < today;
  }

  contactTrainer(): void {
    const trainer = this.trainerData();
    if (!trainer) return;
    console.log('Contact trainer:', trainer);
  }

  contactSupervisor(): void {
    const supervisor = this.supervisorData();
    if (!supervisor) return;
    console.log('Contact supervisor:', supervisor);
  }

  getDaysRemaining(dueDate: string | Date): number {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  getDaysRemainingText(dueDate: string | Date): string {
    const days = this.getDaysRemaining(dueDate);
    if (days < 0) {
      return `منتهية منذ ${Math.abs(days)} يوم`;
    }
    if (days === 0) {
      return 'تنتهي اليوم';
    }
    if (days === 1) {
      return 'تتبقى يوم واحد';
    }
    return `تتبقى ${days} أيام`;
  }
}