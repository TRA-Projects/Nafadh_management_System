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

// تعريف نوع ممتد للمهام مع حالة التسليم
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
  // =========================================================
  // Injections
  // =========================================================

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
  // البيانات الجديدة: الإعلانات والتنبيهات
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
  // تحويل الحالة البرمجية إلى النص العربي
  // =========================================================

  calculatedStatus = computed(() => {
    const status = this.summary()?.status;
    if (status && TRAINEE_STATUS_LABELS[status]) {
      return TRAINEE_STATUS_LABELS[status];
    }

    const today = new Date();
    const endDate = new Date(this.programEndDate());
    return today > endDate ? 'منتهي' : 'قيد التدريب';
  });

  // =========================================================
  // نسبة الإنجاز المحسوبة
  // =========================================================

  progressPercentage = computed(() => {
    const summary = this.summary();
    if (!summary) return 0;
    return summary.moduleProgressPercentage ?? 0;
  });

  // =========================================================
  // التنبيهات الأخيرة - معالجتها للعرض
  // =========================================================

  latestNotifications = computed(() => {
    const notifs = this.notifications();
    if (!notifs || notifs.length === 0) return [];

    // ترتيب حسب التاريخ (الأحدث أولاً)
    const sorted = [...notifs].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    // أخذ أول 5 تنبيهات فقط
    return sorted.slice(0, 5).map((notif) => ({
      message: notif.message || notif.title || '',
      date: notif.createdAt,
      isRead: notif.isRead,
      notificationId: notif.notificationId,
    }));
  });

  // =========================================================
  // دالة مساعدة لمقارنة حالة المهمة (كسلاسل نصية)
  // =========================================================

  getTaskStatusDisplay(status: any): string {
    if (!status) return 'جديد';

    const statusStr = String(status).toLowerCase();

    // حالات TaskStatus
    if (statusStr === 'new' || statusStr === 'pending') return 'جديد';
    if (statusStr === 'completed') return 'مكتمل';
    if (statusStr === 'graded') return 'مكتمل';
    if (statusStr === 'inprogress' || statusStr === 'in_progress') return 'قيد التنفيذ';
    if (statusStr === 'overdue') return 'منتهي';

    // حالات SubmissionStatus
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

    // حالات TaskStatus
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

    // حالات SubmissionStatus
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

  // =========================================================
  // Constructor - مراقبة تغير المستخدم
  // =========================================================

  constructor() {
    // مراقبة تغير المستخدم الحالي
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

  ngOnInit() {
    // محاولة الحصول على المستخدم من الجلسة
    const session = this.auth.session?.();
    if (session?.userId) {
      this.currentUserId.set(session.userId);
      this.loadTraineeData();
    } else {
      // إذا لم يكن هناك جلسة، حاول الحصول من التخزين المحلي
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

    // جلب بيانات المتدرب
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
        console.error('Error loading dashboard summary:', error);
        this.loading.set(false);
        this.loadingProfile.set(false);
        this.errorMessage.set('تعذر تحميل ملخص لوحة التحكم.');
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
          // البحث عن تسجيل نشط
          const activeEnrollment =
            enrollments.find(
              (e) => e.completionStatus === 'Active' || e.completionStatus === 'InProgress',
            ) || enrollments[0];

          this.enrollmentData.set(activeEnrollment);
          this.enrollmentId.set(activeEnrollment.enrollmentId);
          this.batchId.set(activeEnrollment.batchId);

          // حفظ supervisorId إذا كان موجوداً
          if (activeEnrollment.supervisorId) {
            this.supervisorId.set(activeEnrollment.supervisorId);
          }

          if (activeEnrollment.batchName) {
            this.batchName.set(activeEnrollment.batchName);
          }

          // تحميل بيانات الباتش
          this.loadBatchData(activeEnrollment.batchId);

          // تحميل المدرب لهذه الدفعة
          this.loadTrainerByBatch(activeEnrollment.batchId);

          // تحميل المشرف باستخدام userId
          const userId = this.currentUserId();
          if (userId) {
            this.loadSupervisorByUserId(userId);
          }

          // تحميل المهام
          this.loadTasks(activeEnrollment.batchId);

          // =========================================================
          // تحميل الإعلانات والتنبيهات باستخدام userId
          // =========================================================
          if (userId) {
            this.loadUserAnnouncements(userId);
            this.loadUserNotifications(userId);
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

  // =========================================================
  // تحميل المدرب من خلال الدفعة
  // GET /api/BatchTrainer/batch/{batchId}
  // =========================================================

  loadTrainerByBatch(batchId: number): void {
    this.loadingTrainer.set(true);

    // جلب قائمة المدربين في الدفعة
    this.api.getBatchTrainers(batchId).subscribe({
      next: (trainers: TrainerDto[]) => {
        console.log('Batch trainers response:', trainers);

        if (trainers && trainers.length > 0) {
          // نأخذ أول مدرب في الدفعة
          const firstTrainer = trainers[0];

          // التحقق من وجود trainerId
          if (firstTrainer.trainerId) {
            // جلب بيانات المدرب كاملة
            this.api.getTrainer(firstTrainer.trainerId).subscribe({
              next: (trainer: TrainerDto) => {
                this.trainerData.set(trainer);
                this.loadingTrainer.set(false);
              },
              error: (error: any) => {
                console.error('Error loading trainer details:', error);
                this.trainerData.set(null);
                this.loadingTrainer.set(false);
              },
            });
          } else {
            // إذا كان الكائن يحتوي على البيانات كاملة
            this.trainerData.set(firstTrainer);
            this.loadingTrainer.set(false);
          }
        } else {
          this.trainerData.set(null);
          this.loadingTrainer.set(false);
        }
      },
      error: (error: any) => {
        console.error('Error loading trainers for batch:', error);
        this.trainerData.set(null);
        this.loadingTrainer.set(false);
      },
    });
  }

  // =========================================================
  // تحميل بيانات المشرف بناءً على userId
  // GET /api/CompanySupervisor/user/{userId}
  // =========================================================

  loadSupervisorByUserId(userId: number): void {
    this.loadingSupervisor.set(true);

    // استخدام userId بدلاً من supervisorId
    this.api.getCompanySupervisorByUserId(userId).subscribe({
      next: (supervisor: CompanySupervisorDto) => {
        this.supervisorData.set(supervisor);
        this.loadingSupervisor.set(false);
      },
      error: (error: any) => {
        console.error('Error loading supervisor by userId:', error);
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
        console.error('Error loading batch:', error);
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
          this.programName.set(program.title || program.name || '');
        }
      },
      error: (error: any) => {
        console.error('Error loading program:', error);
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

    // جلب مهام الدفعة (المسار الصحيح حسب الـ API)
    this.api.getTasks(batchId).subscribe({
      next: (tasks: TaskDto[]) => {
        if (tasks && tasks.length > 0 && traineeId) {
          // جلب التسليمات للمتدرب لتحديث حالة المهام
          this.api.getTraineeSubmissions(traineeId).subscribe({
            next: (submissions: SubmissionDto[]) => {
              const enrichedTasks = this.enrichTasksWithSubmission(tasks, submissions);
              this.processAndSetTasks(enrichedTasks);
            },
            error: (error: any) => {
              console.error('Error loading submissions:', error);
              // حتى لو فشل جلب التسليمات، نعرض المهام بدون حالة التسليم
              this.processAndSetTasks(tasks);
            },
          });
        } else {
          this.processAndSetTasks(tasks || []);
        }
      },
      error: (error: any) => {
        console.error('Error loading batch tasks:', error);
        this.tasks.set([]);
        this.loadingTasks.set(false);
      },
    });
  }

  /**
   * معالجة المهام وترتيبها وعرض الأقرب لموعد التسليم
   */
  private processAndSetTasks(tasks: TaskDto[]): void {
    if (!tasks || tasks.length === 0) {
      this.tasks.set([]);
      this.loadingTasks.set(false);
      return;
    }

    // تحويل المهام إلى النوع الممتد
    let enrichedTasks = tasks as TaskWithSubmissionDto[];

    // تصفية المهام: عرض المهام التي لم تنتهي أو المهام المنتهية حديثاً
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ترتيب المهام حسب تاريخ الاستحقاق (الأقرب أولاً)
    const sortedTasks = enrichedTasks
      .filter((task) => {
        // عرض المهام التي لم تكتمل أو المهام المنتهية خلال الـ 7 أيام الماضية
        const isCompleted =
          (task.status as string) === 'Completed' || (task.status as string) === 'Graded';
        if (isCompleted) return false;

        // إذا كان التاريخ موجوداً
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(0, 0, 0, 0);

          // عرض المهام المنتهية خلال الـ 7 أيام الماضية
          const daysDiff = Math.floor(
            (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (daysDiff > 7) return false;

          return true;
        }

        // عرض المهام بدون تاريخ
        return true;
      })
      .sort((a, b) => {
        // ترتيب حسب التاريخ (الأقرب أولاً)
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;

        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);
        return dateA.getTime() - dateB.getTime();
      });

    // أخذ أول 3 مهام فقط
    this.tasks.set(sortedTasks.slice(0, 3));
    this.loadingTasks.set(false);
  }

  /**
   * إثراء المهام بحالة التسليم
   */
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

  // حذف الدوال القديمة واستبدالها بما سبق:
  // - إزالة loadBatchTasks
  // - إزالة enrichTasksWithStatus القديمة

  // =========================================================
  // جلب مهام الدفعة
  // =========================================================

  private loadBatchTasks(batchId: number): void {
    this.api.getTasks(batchId).subscribe({
      next: (tasks: TaskDto[]) => {
        const traineeId = this.traineeId();
        if (traineeId) {
          this.enrichTasksWithStatus(tasks, traineeId);
        } else {
          this.tasks.set((tasks ?? []).slice(0, 3) as TaskWithSubmissionDto[]);
          this.loadingTasks.set(false);
        }
      },
      error: (error: any) => {
        console.error('Error loading batch tasks:', error);
        this.tasks.set([]);
        this.loadingTasks.set(false);
      },
    });
  }

  // =========================================================
  // إثراء المهام بحالة المتدرّب لكل مهمة
  // =========================================================

  private enrichTasksWithStatus(tasks: TaskDto[], traineeId: number): void {
    if (!tasks || tasks.length === 0) {
      this.tasks.set([]);
      this.loadingTasks.set(false);
      return;
    }

    this.api.getTraineeSubmissions(traineeId).subscribe({
      next: (submissions: SubmissionDto[]) => {
        const enrichedTasks: TaskWithSubmissionDto[] = tasks.map((task) => {
          const submission = submissions?.find((s) => s.taskId === task.taskId);
          if (submission) {
            return {
              ...task,
              submissionStatus: submission.status,
              submissionId: submission.submissionId,
              grade: submission.grade,
              // تحديث حالة المهمة إذا كانت مكتملة
              status: submission.status === 'Graded' ? ('Completed' as TaskStatus) : task.status,
            };
          }
          return task as TaskWithSubmissionDto;
        });

        // ترتيب المهام: المهام غير المكتملة أولاً، ثم المكتملة
        enrichedTasks.sort((a, b) => {
          const aCompleted = a.submissionStatus === 'Graded';
          const bCompleted = b.submissionStatus === 'Graded';
          if (aCompleted && !bCompleted) return 1;
          if (!aCompleted && bCompleted) return -1;
          return 0;
        });

        this.tasks.set(enrichedTasks.slice(0, 3));
        this.loadingTasks.set(false);
      },
      error: (error: any) => {
        console.error('Error loading submissions:', error);
        this.tasks.set(tasks.slice(0, 3) as TaskWithSubmissionDto[]);
        this.loadingTasks.set(false);
      },
    });
  }

  // =========================================================
  // تحميل الإعلانات بناءً على userId
  // =========================================================

  loadUserAnnouncements(userId: number): void {
    this.loadingAnnouncements.set(true);
    this.announcements.set([]);

    // محاولة جلب الإعلانات الخاصة بالمستخدم
    this.api.getUserAnnouncements(userId).subscribe({
      next: (items: AnnouncementDto[]) => {
        if (items && items.length > 0) {
          // إضافة مصدر لكل إعلان
          const mappedItems = items.map((item) => ({
            ...item,
            source: this.getAnnouncementSource(item.scopeType),
          }));
          this.announcements.set(mappedItems);
        }
        this.loadingAnnouncements.set(false);
      },
      error: (error: any) => {
        console.error('Error loading user announcements:', error);
        // في حال فشل جلب الإعلانات الخاصة بالمستخدم، نحاول جلبها من المصادر التقليدية
        this.loadAnnouncementsFallback();
      },
    });
  }

  /**
   * طريقة بديلة لجلب الإعلانات في حال فشل الطريقة الأساسية
   */
  private loadAnnouncementsFallback(): void {
    const batchId = this.batchId();
    const companyId = this.companyId();

    // جلب إعلانات المنصة
    this.api.getPlatformAnnouncements().subscribe({
      next: (items: AnnouncementDto[]) => {
        this.mergeAnnouncements(items, 'الهيئة');
        this.loadingAnnouncements.set(false);
      },
      error: (error: any) => {
        console.error('Error loading platform announcements:', error);
        this.loadingAnnouncements.set(false);
      },
    });

    // جلب إعلانات الشركة
    if (companyId) {
      this.api.getCompanyAnnouncements(companyId).subscribe({
        next: (items: AnnouncementDto[]) => {
          this.mergeAnnouncements(items, 'الشركة');
        },
        error: (error: any) => {
          console.error('Error loading company announcements:', error);
        },
      });
    }

    // جلب إعلانات الدفعة
    if (batchId) {
      this.api.getBatchAnnouncements(batchId).subscribe({
        next: (items: AnnouncementDto[]) => {
          this.mergeAnnouncements(items, 'المدرب');
        },
        error: (error: any) => {
          console.error('Error loading batch announcements:', error);
        },
      });
    }
  }

  /**
   * تحديد مصدر الإعلان بناءً على نطاقه
   */
  private getAnnouncementSource(scopeType: string): string {
    const scopeMap: Record<string, string> = {
      Platform: 'الهيئة',
      Company: 'الشركة',
      Batch: 'المدرب',
      Program: 'البرنامج',
    };
    return scopeMap[scopeType] || 'عام';
  }

  // =========================================================
  // دمج الإعلانات
  // =========================================================

  private mergeAnnouncements(items: AnnouncementDto[], source: string) {
    this.announcements.update((list) => {
      const newItems = (items ?? []).map((a) => ({ ...a, source }));
      const combined = [...list, ...newItems];
      // ترتيب حسب التاريخ (الأحدث أولاً)
      combined.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
      return combined;
    });
  }

  // =========================================================
  // تحميل التنبيهات بناءً على userId
  // =========================================================

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

  // =========================================================
  // دوال مساعدة للتنبيهات - تحديد التنبيه كمقروء
  // =========================================================

  /**
   * تحديد تنبيه كمقروء
   */
  markNotificationAsRead(notificationId: number, event?: Event): void {
    // منع انتشار الحدث إذا كان موجوداً
    if (event) {
      event.stopPropagation();
    }

    const userId = this.currentUserId();
    if (!userId) return;

    // تحديث الحالة محلياً أولاً لتجربة أفضل للمستخدم
    this.notifications.update((notifs) => {
      return notifs.map((notif) => {
        if (notif.notificationId === notificationId) {
          return { ...notif, isRead: true };
        }
        return notif;
      });
    });

    // إرسال الطلب إلى الخادم
    this.api.markNotificationAsRead(notificationId).subscribe({
      next: () => {
        console.log('Notification marked as read:', notificationId);
      },
      error: (error: any) => {
        console.error('Error marking notification as read:', error);
        // في حالة الخطأ، نعيد الحالة السابقة
        if (userId) {
          this.loadUserNotifications(userId);
        }
      },
    });
  }

  /**
   * تحديد جميع التنبيهات كمقروءة
   */
  markAllNotificationsAsRead(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const userId = this.currentUserId();
    if (!userId) return;

    // تحديث الحالة محلياً أولاً
    this.notifications.update((notifs) => {
      return notifs.map((notif) => ({ ...notif, isRead: true }));
    });

    // إرسال الطلب إلى الخادم
    this.api.markAllNotificationsAsRead(userId).subscribe({
      next: () => {
        console.log('All notifications marked as read');
      },
      error: (error: any) => {
        console.error('Error marking all notifications as read:', error);
        // في حالة الخطأ، نعيد تحميل التنبيهات
        if (userId) {
          this.loadUserNotifications(userId);
        }
      },
    });
  }

  /**
   * الحصول على عدد التنبيهات غير المقروءة
   */
  getUnreadNotificationsCount(): number {
    return this.notifications().filter((n) => !n.isRead).length;
  }

  // =========================================================
  // متغيرات لعرض المزيد من الإعلانات والتنبيهات
  // =========================================================

  showAllAnnouncements = signal(false);
  showAllNotifications = signal(false);

  // =========================================================
  // الإعلانات المعروضة (3 أو الكل)
  // =========================================================

  displayAnnouncements = computed(() => {
    const all = this.announcements();
    if (this.showAllAnnouncements()) {
      return all;
    }
    return all.slice(0, 3);
  });

  // =========================================================
  // التنبيهات المعروضة (3 أو الكل)
  // =========================================================

  displayNotifications = computed(() => {
    const all = this.latestNotifications();
    if (this.showAllNotifications()) {
      return all;
    }
    return all.slice(0, 3);
  });

  // =========================================================
  // دوال تبديل عرض الكل / عرض أقل
  // =========================================================

  toggleShowAllAnnouncements(): void {
    this.showAllAnnouncements.update((value) => !value);
  }

  toggleShowAllNotifications(): void {
    this.showAllNotifications.update((value) => !value);
  }

  // =========================================================
  // الحصول على معرف المستخدم من التخزين المحلي
  // =========================================================

  private getUserIdFromStorage(): number | null {
    // محاولة من localStorage
    const userIdFromStorage = localStorage.getItem('userId');
    if (userIdFromStorage) {
      return parseInt(userIdFromStorage, 10);
    }

    // محاولة من sessionStorage
    const userIdFromSession = sessionStorage.getItem('userId');
    if (userIdFromSession) {
      return parseInt(userIdFromSession, 10);
    }

    return null;
  }

  // =========================================================
  // إعادة تحميل البيانات
  // =========================================================

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
    }
  }

  // =========================================================
  // دوال مساعدة للعرض
  // =========================================================

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

  // =========================================================
  // الحصول على الحرف الأول من الاسم
  // =========================================================

  getInitial(name: string | undefined): string {
    if (!name) return 'م';
    const trimmed = name.trim();
    return trimmed.length > 0 ? trimmed[0] : 'م';
  }

  // =========================================================
  // الحصول على تخصص المدرب أو وصفه
  // =========================================================

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

  // =========================================================
  // الحصول على قسم المشرف أو منصبه
  // =========================================================

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

  // =========================================================
  // التحقق من انتهاء موعد المهمة
  // =========================================================

  isTaskOverdue(dueDate: string | Date): boolean {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    return due < today;
  }

  // =========================================================
  // التواصل مع المدرب
  // =========================================================

  contactTrainer(): void {
    const trainer = this.trainerData();
    if (!trainer) return;

    console.log('Contact trainer:', trainer);
  }

  // =========================================================
  // الحصول على أيام متبقية للمهمة (للعرض الإضافي)
  // =========================================================

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
