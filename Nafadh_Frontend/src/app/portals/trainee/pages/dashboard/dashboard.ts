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
} from '../../../../core/models/dtos';
import { TRAINEE_STATUS_LABELS, TaskStatus } from '../../../../core/models/enums';

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

  // =========================================================
  // المستخدم الحالي - من AuthService
  // =========================================================

  currentUserId = signal<number | null>(null);

  // =========================================================
  // IDs - يتم جلبها من قاعدة البيانات
  // =========================================================

  traineeId = signal<number | null>(null);
  companyId = signal<number | null>(null);
  batchId = signal<number | null>(null);
  enrollmentId = signal<number | null>(null);
  supervisorId = signal<number | null>(null);

  // =========================================================
  // بيانات المتدرب والبرنامج
  // =========================================================

  traineeData = signal<TraineeProfileDto | null>(null);
  enrollmentData = signal<EnrollmentDto | null>(null);
  batchData = signal<BatchDto | null>(null);
  programData = signal<ProgramDto | null>(null);

  programName = signal<string>('');
  batchName = signal<string>('');
  programEndDate = signal<string>('');

  // =========================================================
  // بيانات فريق الإشراف
  // =========================================================

  trainerData = signal<TrainerDto | null>(null);
  supervisorData = signal<CompanySupervisorDto | null>(null);

  // =========================================================
  // البيانات الرئيسية
  // =========================================================

  summary = signal<TraineeDashboardSummaryDto | null>(null);
  tasks = signal<TaskWithSubmissionDto[]>([]);

  // =========================================================
  // الإعلانات والتنبيهات
  // =========================================================

  announcements = signal<(AnnouncementDto & { source: string })[]>([]);
  notifications = signal<NotificationDto[]>([]);

  // =========================================================
  // حالات التحميل
  // =========================================================

  loading = signal(false);
  loadingTasks = signal(false);
  loadingAnnouncements = signal(false);
  loadingNotifications = signal(false);
  loadingProfile = signal(false);
  loadingTrainer = signal(false);
  loadingSupervisor = signal(false);

  // =========================================================
  // رسالة الخطأ
  // =========================================================

  errorMessage = signal('');

  // =========================================================
  // عرض المزيد
  // =========================================================

  showAllAnnouncements = signal(false);
  showAllNotifications = signal(false);

  // =========================================================
  // حالة المتدرب
  // =========================================================

  calculatedStatus = computed(() => {
    const status = this.summary()?.status;

    if (status && TRAINEE_STATUS_LABELS[status]) {
      return TRAINEE_STATUS_LABELS[status];
    }

    const today = new Date();
    const endDate = new Date(this.programEndDate() || Date.now());

    return today > endDate ? 'منتهي' : 'قيد التدريب';
  });

  // =========================================================
  // نسبة الإنجاز
  // =========================================================

  progressPercentage = computed(() => {
    const summary = this.summary();

    if (!summary) {
      return 0;
    }

    return summary.moduleProgressPercentage ?? 0;
  });

  // =========================================================
  // آخر التنبيهات
  // =========================================================

  latestNotifications = computed(() => {
    const notifs = this.notifications();

    if (!notifs || notifs.length === 0) {
      return [];
    }

    const sorted = [...notifs].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);

      return dateB.getTime() - dateA.getTime();
    });

    return sorted.slice(0, 5).map((notif) => ({
      message: notif.message || notif.title || '',
      date: notif.createdAt,
      isRead: notif.isRead,
      notificationId: notif.notificationId,
    }));
  });

  // =========================================================
  // الإعلانات المعروضة
  // =========================================================

  displayAnnouncements = computed(() => {
    const all = this.announcements();

    if (this.showAllAnnouncements()) {
      return all;
    }

    return all.slice(0, 3);
  });

  // =========================================================
  // التنبيهات المعروضة
  // =========================================================

  displayNotifications = computed(() => {
    const all = this.latestNotifications();

    if (this.showAllNotifications()) {
      return all;
    }

    return all.slice(0, 3);
  });

  // =========================================================
  // تبديل عرض الإعلانات
  // =========================================================

  toggleShowAllAnnouncements(): void {
    this.showAllAnnouncements.update((value) => !value);
  }

  // =========================================================
  // تبديل عرض التنبيهات
  // =========================================================

  toggleShowAllNotifications(): void {
    this.showAllNotifications.update((value) => !value);
  }

  // =========================================================
  // حالة المهمة - نص
  // =========================================================

  getTaskStatusDisplay(status: any): string {
    if (!status) {
      return 'جديد';
    }

    const statusStr = String(status).toLowerCase();

    // TaskStatus
    if (statusStr === 'new' || statusStr === 'pending') {
      return 'جديد';
    }

    if (statusStr === 'completed') {
      return 'مكتمل';
    }

    if (statusStr === 'graded') {
      return 'مكتمل';
    }

    if (statusStr === 'inprogress' || statusStr === 'in_progress') {
      return 'قيد التنفيذ';
    }

    if (statusStr === 'overdue') {
      return 'منتهي';
    }

    // SubmissionStatus
    if (statusStr === 'submitted') {
      return 'تم التسليم';
    }

    if (statusStr === 'underreview' || statusStr === 'under_review') {
      return 'قيد المراجعة';
    }

    if (
      statusStr === 'returnedforrevision' ||
      statusStr === 'returned'
    ) {
      return 'مطلوب تعديل';
    }

    if (statusStr === 'late') {
      return 'متأخر';
    }

    if (statusStr === 'closed') {
      return 'مغلق';
    }

    if (statusStr === 'open') {
      return 'مفتوح';
    }

    return status;
  }

  // =========================================================
  // حالة المهمة - Style
  // =========================================================

  getTaskStatusStyle(
    status: any,
  ): { background: string; color: string } {
    if (!status) {
      return {
        background: '#f1f5f9',
        color: '#64748b',
      };
    }

    const statusStr = String(status).toLowerCase();

    // TaskStatus
    if (statusStr === 'new' || statusStr === 'pending') {
      return {
        background: '#eff6ff',
        color: '#2563eb',
      };
    }

    if (statusStr === 'completed' || statusStr === 'graded') {
      return {
        background: '#f0fdf4',
        color: '#16a34a',
      };
    }

    if (
      statusStr === 'inprogress' ||
      statusStr === 'in_progress'
    ) {
      return {
        background: '#fef3c7',
        color: '#d97706',
      };
    }

    if (statusStr === 'overdue') {
      return {
        background: '#fef2f2',
        color: '#dc2626',
      };
    }

    // SubmissionStatus
    if (statusStr === 'submitted') {
      return {
        background: '#fef3c7',
        color: '#d97706',
      };
    }

    if (
      statusStr === 'underreview' ||
      statusStr === 'under_review'
    ) {
      return {
        background: '#ede9fe',
        color: '#7c3aed',
      };
    }

    if (
      statusStr === 'returnedforrevision' ||
      statusStr === 'returned'
    ) {
      return {
        background: '#fef2f2',
        color: '#dc2626',
      };
    }

    if (statusStr === 'late') {
      return {
        background: '#fef2f2',
        color: '#dc2626',
      };
    }

    if (statusStr === 'closed') {
      return {
        background: '#f1f5f9',
        color: '#64748b',
      };
    }

    if (statusStr === 'open') {
      return {
        background: '#eff6ff',
        color: '#2563eb',
      };
    }

    return {
      background: '#f1f5f9',
      color: '#64748b',
    };
  }

  // =========================================================
  // Constructor
  // =========================================================

  constructor() {
    effect(() => {
      const session = this.auth.session?.();

      if (session?.userId) {
        this.currentUserId.set(session.userId);
        this.loadTraineeData();
      }
    });
  }

  // =========================================================
  // OnInit
  // =========================================================

  ngOnInit(): void {
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

  // =========================================================
  // تحميل بيانات المتدرب
  // =========================================================

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
          this.errorMessage.set(
            'لم يتم العثور على بيانات المتدرب.',
          );
        }
      },

      error: (error: any) => {
        console.error('Error loading trainee:', error);

        this.loading.set(false);
        this.loadingProfile.set(false);

        this.errorMessage.set(
          'تعذر تحميل بيانات المتدرب.',
        );
      },
    });
  }

  // =========================================================
  // تحميل ملخص لوحة التحكم
  // GET /api/Trainee/{traineeId}/dashboard-summary
  // =========================================================

  loadDashboardSummary(traineeId: number): void {
    this.api.getDashboardSummary(traineeId).subscribe({
      next: (summary: TraineeDashboardSummaryDto) => {
        this.summary.set(summary);

        this.loading.set(false);
        this.loadingProfile.set(false);
      },

      error: (error: any) => {
        console.error(
          'Error loading dashboard summary:',
          error,
        );

        this.loading.set(false);
        this.loadingProfile.set(false);

        this.errorMessage.set(
          'تعذر تحميل ملخص لوحة التحكم.',
        );
      },
    });
  }

  // =========================================================
  // تحميل تسجيلات المتدرب
  // GET /api/Enrollment/trainee/{traineeId}
  // =========================================================

  loadEnrollments(traineeId: number): void {
    this.api.getEnrollmentsByTrainee(traineeId).subscribe({
      next: (enrollments: EnrollmentDto[]) => {
        if (enrollments && enrollments.length > 0) {
          const activeEnrollment =
            enrollments.find(
              (e) =>
                e.completionStatus === 'Active' ||
                e.completionStatus === 'InProgress',
            ) || enrollments[0];

          this.enrollmentData.set(activeEnrollment);

          this.enrollmentId.set(
            activeEnrollment.enrollmentId,
          );

          this.batchId.set(activeEnrollment.batchId);

          if (activeEnrollment.supervisorId) {
            this.supervisorId.set(
              activeEnrollment.supervisorId,
            );
          }

          if (activeEnrollment.batchName) {
            this.batchName.set(
              activeEnrollment.batchName,
            );
          }

          this.loadBatchData(activeEnrollment.batchId);

          // تحميل المدرب
          this.loadTrainerByBatch(
            activeEnrollment.batchId,
          );

          const userId = this.currentUserId();

          // تحميل المشرف
          if (userId) {
            this.loadSupervisorByUserId(userId);
          }

          // تحميل المهام
          this.loadTasks(activeEnrollment.batchId);

          // تحميل الإعلانات والتنبيهات
          if (userId) {
            this.loadUserAnnouncements(userId);
            this.loadUserNotifications(userId);
          }
        } else {
          this.loading.set(false);
          this.loadingProfile.set(false);

          this.errorMessage.set(
            'لا توجد تسجيلات نشطة للمتدرب.',
          );
        }
      },

      error: (error: any) => {
        console.error(
          'Error loading enrollments:',
          error,
        );

        this.loading.set(false);
        this.loadingProfile.set(false);

        this.errorMessage.set(
          'تعذر تحميل تسجيلات المتدرب.',
        );
      },
    });
  }

  // =========================================================
  // تحميل المدرب من خلال الدفعة
  // GET /api/BatchTrainer/batch/{batchId}
  // =========================================================

  loadTrainerByBatch(batchId: number): void {
    this.loadingTrainer.set(true);

    this.api.getBatchTrainers(batchId).subscribe({
      next: (trainers: TrainerDto[]) => {
        console.log(
          'Batch trainers response:',
          trainers,
        );

        if (trainers && trainers.length > 0) {
          const firstTrainer = trainers[0];

          if (firstTrainer.trainerId) {
            this.api
              .getTrainer(firstTrainer.trainerId)
              .subscribe({
                next: (trainer: TrainerDto) => {
                  this.trainerData.set(trainer);
                  this.loadingTrainer.set(false);
                },

                error: (error: any) => {
                  console.error(
                    'Error loading trainer details:',
                    error,
                  );

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

      error: (error: any) => {
        console.error(
          'Error loading trainers for batch:',
          error,
        );

        this.trainerData.set(null);
        this.loadingTrainer.set(false);
      },
    });
  }

  // =========================================================
  // تحميل بيانات المشرف
  // GET /api/CompanySupervisor/user/{userId}
  // =========================================================

  loadSupervisorByUserId(userId: number): void {
    this.loadingSupervisor.set(true);

    this.api
      .getCompanySupervisorByUserId(userId)
      .subscribe({
        next: (supervisor: CompanySupervisorDto) => {
          this.supervisorData.set(supervisor);
          this.loadingSupervisor.set(false);
        },

        error: (error: any) => {
          console.error(
            'Error loading supervisor by userId:',
            error,
          );

          this.supervisorData.set(null);
          this.loadingSupervisor.set(false);
        },
      });
  }

  // =========================================================
  // تحميل بيانات الباتش
  // GET /api/Batch/{batchId}
  // =========================================================

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
        console.error(
          'Error loading batch:',
          error,
        );
      },
    });
  }

  // =========================================================
  // تحميل بيانات البرنامج
  // GET /api/Program/{programId}
  // =========================================================

  loadProgramData(programId: number): void {
    this.api.getProgram(programId).subscribe({
      next: (program: ProgramDto) => {
        this.programData.set(program);

        if (program.title || program.name) {
          this.programName.set(
            program.title || program.name || '',
          );
        }
      },

      error: (error: any) => {
        console.error(
          'Error loading program:',
          error,
        );
      },
    });
  }

  // =========================================================
  // تحميل المهام
  // GET /api/Task/batch/{batchId}
  // =========================================================

  loadTasks(batchId: number): void {
    this.loadingTasks.set(true);

    const traineeId = this.traineeId();

    this.api.getTasks(batchId).subscribe({
      next: (tasks: TaskDto[]) => {
        if (
          tasks &&
          tasks.length > 0 &&
          traineeId
        ) {
          this.api
            .getTraineeSubmissions(traineeId)
            .subscribe({
              next: (submissions: SubmissionDto[]) => {
                const enrichedTasks =
                  this.enrichTasksWithSubmission(
                    tasks,
                    submissions,
                  );

                this.processAndSetTasks(
                  enrichedTasks,
                );
              },

              error: (error: any) => {
                console.error(
                  'Error loading submissions:',
                  error,
                );

                this.processAndSetTasks(tasks);
              },
            });
        } else {
          this.processAndSetTasks(tasks || []);
        }
      },

      error: (error: any) => {
        console.error(
          'Error loading batch tasks:',
          error,
        );

        this.tasks.set([]);
        this.loadingTasks.set(false);
      },
    });
  }

  // =========================================================
  // معالجة المهام
  // =========================================================

  private processAndSetTasks(
    tasks: TaskDto[],
  ): void {
    if (!tasks || tasks.length === 0) {
      this.tasks.set([]);
      this.loadingTasks.set(false);
      return;
    }

    const enrichedTasks =
      tasks as TaskWithSubmissionDto[];

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const sortedTasks = enrichedTasks
      .filter((task) => {
        const isCompleted =
          (task.status as string) === 'Completed' ||
          (task.status as string) === 'Graded';

        if (isCompleted) {
          return false;
        }

        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);

          dueDate.setHours(0, 0, 0, 0);

          const daysDiff = Math.floor(
            (today.getTime() -
              dueDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          if (daysDiff > 7) {
            return false;
          }

          return true;
        }

        return true;
      })
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) {
          return 0;
        }

        if (!a.dueDate) {
          return 1;
        }

        if (!b.dueDate) {
          return -1;
        }

        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);

        return (
          dateA.getTime() -
          dateB.getTime()
        );
      });

    this.tasks.set(
      sortedTasks.slice(0, 3),
    );

    this.loadingTasks.set(false);
  }

  // =========================================================
  // إثراء المهام بحالة التسليم
  // =========================================================

  private enrichTasksWithSubmission(
    tasks: TaskDto[],
    submissions: SubmissionDto[],
  ): TaskWithSubmissionDto[] {
    if (
      !submissions ||
      submissions.length === 0
    ) {
      return tasks as TaskWithSubmissionDto[];
    }

    return tasks.map((task) => {
      const submission =
        submissions.find(
          (s) =>
            s.taskId === task.taskId,
        );

      if (submission) {
        return {
          ...task,
          submissionStatus:
            submission.status,
          submissionId:
            submission.submissionId,
          grade: submission.grade,

          status:
            submission.status === 'Graded'
              ? ('Completed' as TaskStatus)
              : task.status,
        };
      }

      return task as TaskWithSubmissionDto;
    });
  }

  // =========================================================
  // تحميل إعلانات المستخدم
  // =========================================================

  loadUserAnnouncements(
    userId: number,
  ): void {
    this.loadingAnnouncements.set(true);
    this.announcements.set([]);

    this.api.getUserAnnouncements(userId).subscribe({
      next: (items: AnnouncementDto[]) => {
        if (items && items.length > 0) {
          /*
           * AnnouncementDto لا يحتوي على scopeType.
           * لذلك لا نستخدم item.scopeType هنا.
           *
           * مصدر الإعلانات القادمة من endpoint المستخدم
           * غير معروف من الـ DTO الحالي، لذلك نضع:
           * "عام"
           */
          const mappedItems =
            items.map((item) => ({
              ...item,
              source: 'عام',
            }));

          this.announcements.set(
            mappedItems,
          );
        }

        this.loadingAnnouncements.set(false);
      },

      error: (error: any) => {
        console.error(
          'Error loading user announcements:',
          error,
        );

        // في حال فشل endpoint الخاص بالمستخدم
        // نستخدم المصادر البديلة
        this.loadAnnouncementsFallback();
      },
    });
  }

  // =========================================================
  // الطريقة البديلة لجلب الإعلانات
  // =========================================================

  private loadAnnouncementsFallback(): void {
    const batchId = this.batchId();
    const companyId = this.companyId();

    let completedRequests = 0;

    // منصة + شركة + دفعة
    const totalRequests = 3;

    const checkCompletion = () => {
      completedRequests++;

      if (
        completedRequests >= totalRequests
      ) {
        this.loadingAnnouncements.set(false);
      }
    };

    // =========================================================
    // إعلانات المنصة
    // =========================================================

    this.api.getPlatformAnnouncements().subscribe({
      next: (items: AnnouncementDto[]) => {
        this.mergeAnnouncements(
          items,
          'الهيئة',
        );

        checkCompletion();
      },

      error: (error: any) => {
        console.error(
          'Error loading platform announcements:',
          error,
        );

        checkCompletion();
      },
    });

    // =========================================================
    // إعلانات الشركة
    // =========================================================

    if (companyId) {
      this.api
        .getCompanyAnnouncements(companyId)
        .subscribe({
          next: (items: AnnouncementDto[]) => {
            this.mergeAnnouncements(
              items,
              'الشركة',
            );

            checkCompletion();
          },

          error: (error: any) => {
            console.error(
              'Error loading company announcements:',
              error,
            );

            checkCompletion();
          },
        });
    } else {
      checkCompletion();
    }

    // =========================================================
    // إعلانات الدفعة
    // =========================================================

    if (batchId) {
      this.api
        .getBatchAnnouncements(batchId)
        .subscribe({
          next: (items: AnnouncementDto[]) => {
            this.mergeAnnouncements(
              items,
              'المدرب',
            );

            checkCompletion();
          },

          error: (error: any) => {
            console.error(
              'Error loading batch announcements:',
              error,
            );

            checkCompletion();
          },
        });
    } else {
      checkCompletion();
    }
  }

  // =========================================================
  // دمج الإعلانات ومنع التكرار
  // =========================================================

  private mergeAnnouncements(
    items: AnnouncementDto[],
    source: string,
  ): void {
    this.announcements.update((list) => {
      const existingIds = new Set(
        list.map(
          (a) => a.announcementId,
        ),
      );

      const newItems = (items ?? [])
        .filter(
          (a) =>
            !existingIds.has(
              a.announcementId,
            ),
        )
        .map((a) => ({
          ...a,
          source,
        }));

      const combined = [
        ...list,
        ...newItems,
      ];

      combined.sort((a, b) => {
        const dateA = new Date(
          a.date || Date.now(),
        );

        const dateB = new Date(
          b.date || Date.now(),
        );

        return (
          dateB.getTime() -
          dateA.getTime()
        );
      });

      return combined;
    });
  }

  // =========================================================
  // تحديد مصدر الإعلان
  // =========================================================
  //
  // هذه الدالة لم تعد تعتمد على AnnouncementDto.scopeType.
  // نستخدمها فقط عندما نعرف المصدر من الـ endpoint نفسه.
  // =========================================================

  private getAnnouncementSource(
    source: string | undefined,
  ): string {
    const sourceMap: Record<
      string,
      string
    > = {
      Platform: 'الهيئة',
      Company: 'الشركة',
      Batch: 'المدرب',
      Program: 'البرنامج',
    };

    if (!source) {
      return 'عام';
    }

    return (
      sourceMap[source] || source
    );
  }

  // =========================================================
  // تحميل التنبيهات
  // =========================================================

  loadUserNotifications(
    userId: number,
  ): void {
    this.loadingNotifications.set(true);
    this.notifications.set([]);

    this.api.getNotifications(userId).subscribe({
      next: (
        items: NotificationDto[],
      ) => {
        this.notifications.set(
          items || [],
        );

        this.loadingNotifications.set(
          false,
        );
      },

      error: (error: any) => {
        console.error(
          'Error loading notifications:',
          error,
        );

        this.notifications.set([]);

        this.loadingNotifications.set(
          false,
        );
      },
    });
  }

  // =========================================================
  // تحديد تنبيه كمقروء
  // =========================================================

  markNotificationAsRead(
    notificationId: number,
    event?: Event,
  ): void {
    if (event) {
      event.stopPropagation();
    }

    const userId =
      this.currentUserId();

    if (!userId) {
      return;
    }

    // تحديث محلي
    this.notifications.update(
      (notifs) => {
        return notifs.map(
          (notif) => {
            if (
              notif.notificationId ===
              notificationId
            ) {
              return {
                ...notif,
                isRead: true,
              };
            }

            return notif;
          },
        );
      },
    );

    // تحديث السيرفر
    this.api
      .markNotificationAsRead(
        notificationId,
      )
      .subscribe({
        next: () => {
          console.log(
            'Notification marked as read:',
            notificationId,
          );
        },

        error: (error: any) => {
          console.error(
            'Error marking notification as read:',
            error,
          );

          this.loadUserNotifications(
            userId,
          );
        },
      });
  }

  // =========================================================
  // تحديد جميع التنبيهات كمقروءة
  // =========================================================

  markAllNotificationsAsRead(
    event?: Event,
  ): void {
    if (event) {
      event.stopPropagation();
    }

    const userId =
      this.currentUserId();

    if (!userId) {
      return;
    }

    // تحديث محلي
    this.notifications.update(
      (notifs) =>
        notifs.map(
          (notif) => ({
            ...notif,
            isRead: true,
          }),
        ),
    );

    // تحديث السيرفر
    this.api
      .markAllNotificationsAsRead(
        userId,
      )
      .subscribe({
        next: () => {
          console.log(
            'All notifications marked as read',
          );
        },

        error: (error: any) => {
          console.error(
            'Error marking all notifications as read:',
            error,
          );

          this.loadUserNotifications(
            userId,
          );
        },
      });
  }

  // =========================================================
  // عدد التنبيهات غير المقروءة
  // =========================================================

  getUnreadNotificationsCount(): number {
    return this.notifications().filter(
      (n) => !n.isRead,
    ).length;
  }

  // =========================================================
  // الحصول على User ID من التخزين
  // =========================================================

  private getUserIdFromStorage(): number | null {
    const userIdFromStorage =
      localStorage.getItem(
        'userId',
      );

    if (userIdFromStorage) {
      return parseInt(
        userIdFromStorage,
        10,
      );
    }

    const userIdFromSession =
      sessionStorage.getItem(
        'userId',
      );

    if (userIdFromSession) {
      return parseInt(
        userIdFromSession,
        10,
      );
    }

    return null;
  }

  // =========================================================
  // إعادة تحميل البيانات
  // =========================================================

  refreshData(): void {
    const traineeId =
      this.traineeId();

    const batchId =
      this.batchId();

    const userId =
      this.currentUserId();

    if (traineeId) {
      this.loadDashboardSummary(
        traineeId,
      );
    }

    if (batchId) {
      this.loadTasks(batchId);
      this.loadTrainerByBatch(
        batchId,
      );
    }

    if (userId) {
      this.loadUserAnnouncements(
        userId,
      );

      this.loadUserNotifications(
        userId,
      );
    }
  }

  // =========================================================
  // ألوان الحالة
  // =========================================================

  getStatusColor(
    status: string,
  ): string {
    const statusMap: Record<
      string,
      string
    > = {
      Active:
        'var(--status-active-bg)',

      InProgress:
        'var(--status-active-bg)',

      Completed:
        'var(--status-completed-bg)',

      Graduated:
        'var(--status-completed-bg)',

      Dropped:
        'var(--status-new-bg)',

      Suspended:
        'var(--status-new-bg)',
    };

    return (
      statusMap[status] ||
      'var(--status-new-bg)'
    );
  }

  // =========================================================
  // لون النص حسب الحالة
  // =========================================================

  getStatusTextColor(
    status: string,
  ): string {
    const statusMap: Record<
      string,
      string
    > = {
      Active:
        'var(--status-active-fg)',

      InProgress:
        'var(--status-active-fg)',

      Completed:
        'var(--status-completed-fg)',

      Graduated:
        'var(--status-completed-fg)',

      Dropped:
        'var(--status-new-fg)',

      Suspended:
        'var(--status-new-fg)',
    };

    return (
      statusMap[status] ||
      'var(--status-new-fg)'
    );
  }

  // =========================================================
  // الحرف الأول من الاسم
  // =========================================================

  getInitial(
    name: string | undefined,
  ): string {
    if (!name) {
      return 'م';
    }

    const trimmed =
      name.trim();

    return trimmed.length > 0
      ? trimmed[0]
      : 'م';
  }

  // =========================================================
  // تخصص المدرب
  // =========================================================

  getTrainerSpecialty(): string {
    const trainer =
      this.trainerData();

    if (!trainer) {
      return '';
    }

    if (trainer.specialty) {
      return trainer.specialty;
    }

    if (
      trainer.experienceYears !==
        undefined &&
      trainer.experienceYears > 0
    ) {
      return `خبرة ${trainer.experienceYears} سنوات`;
    }

    if (trainer.biography) {
      return trainer.biography.length >
        30
        ? trainer.biography.substring(
            0,
            30,
          ) + '...'
        : trainer.biography;
    }

    return 'مدرب البرنامج';
  }

  // =========================================================
  // قسم / منصب المشرف
  // =========================================================

  getSupervisorRole(): string {
    const supervisor =
      this.supervisorData();

    if (!supervisor) {
      return 'مشرف التدريب';
    }

    if (supervisor.position) {
      return supervisor.position;
    }

    if (supervisor.department) {
      return supervisor.department;
    }

    return 'مشرف التدريب';
  }

  // =========================================================
  // التحقق من انتهاء المهمة
  // =========================================================

  isTaskOverdue(
    dueDate: string | Date,
  ): boolean {
    if (!dueDate) {
      return false;
    }

    const due =
      new Date(dueDate);

    const today =
      new Date();

    return due < today;
  }

  // =========================================================
  // التواصل مع المدرب
  // =========================================================

  contactTrainer(): void {
    const trainer =
      this.trainerData();

    if (!trainer) {
      return;
    }

    console.log(
      'Contact trainer:',
      trainer,
    );
  }

  // =========================================================
  // التواصل مع المشرف
  // =========================================================

  contactSupervisor(): void {
    const supervisor =
      this.supervisorData();

    if (!supervisor) {
      return;
    }

    console.log(
      'Contact supervisor:',
      supervisor,
    );
  }

  // =========================================================
  // الأيام المتبقية للمهمة
  // =========================================================

  getDaysRemaining(
    dueDate: string | Date,
  ): number {
    if (!dueDate) {
      return 0;
    }

    const due =
      new Date(dueDate);

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0,
    );

    due.setHours(
      0,
      0,
      0,
      0,
    );

    const diffTime =
      due.getTime() -
      today.getTime();

    const diffDays =
      Math.ceil(
        diffTime /
          (1000 *
            60 *
            60 *
            24),
      );

    return diffDays;
  }

  // =========================================================
  // نص الأيام المتبقية
  // =========================================================

  getDaysRemainingText(
    dueDate: string | Date,
  ): string {
    const days =
      this.getDaysRemaining(
        dueDate,
      );

    if (days < 0) {
      return `منتهية منذ ${Math.abs(
        days,
      )} يوم`;
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