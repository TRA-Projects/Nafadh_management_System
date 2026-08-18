import { Component, OnInit, signal, computed, inject } from '@angular/core';
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
  ProgramDto
} from '../../../../core/models/dtos';
import { TRAINEE_STATUS_LABELS, TaskStatus } from '../../../../core/models/enums';
import { NfdIcon } from '../../../../shared/ui/icon/icon';

@Component({
  selector: 'app-trainee-dashboard',
  imports: [CommonModule, NfdIcon, RouterLink],
  templateUrl: './dashboard.html',
})
export class TraineeDashboard implements OnInit {
  // =========================================================
  // Injections
  // =========================================================

  private api = inject(TraineeApi);
  public auth = inject(AuthService);


  // =========================================================
  // IDs - يتم جلبها من قاعدة البيانات
  // =========================================================

  traineeId = signal<number | null>(null);
  companyId = signal<number | null>(null);
  batchId = signal<number | null>(null);
  enrollmentId = signal<number | null>(null);


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
  // البيانات الرئيسية
  // =========================================================

  summary = signal<TraineeDashboardSummaryDto | null>(null);
  tasks = signal<TaskDto[]>([]);
  announcements = signal<(AnnouncementDto & { source: string })[]>([]);


  // =========================================================
  // حالات التحميل
  // =========================================================

  loading = signal(false);
  loadingTasks = signal(false);
  loadingAnnouncements = signal(false);


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
  // OnInit
  // =========================================================

  ngOnInit() {
    this.loadTraineeData();
  }


  // =========================================================
  // تحميل بيانات المتدرب
  // =========================================================

  loadTraineeData(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    const userId = this.getCurrentUserId();

    if (!userId) {
      this.errorMessage.set('يرجى تسجيل الدخول أولاً.');
      this.loading.set(false);
      return;
    }

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
          this.errorMessage.set('لم يتم العثور على بيانات المتدرب.');
        }
      },
      error: (error: any) => {
        console.error('Error loading trainee:', error);
        this.loading.set(false);
        this.errorMessage.set('تعذر تحميل بيانات المتدرب.');
      }
    });
  }


  // =========================================================
  // تحميل ملخص لوحة التحكم
  // GET /api/Trainee/{id}/dashboard-summary
  // =========================================================

  loadDashboardSummary(traineeId: number): void {
    this.api.getDashboardSummary(traineeId).subscribe({
      next: (summary: TraineeDashboardSummaryDto) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading dashboard summary:', error);
        this.loading.set(false);
        this.errorMessage.set('تعذر تحميل ملخص لوحة التحكم.');
      }
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
          const activeEnrollment = enrollments.find(e =>
            e.completionStatus === 'Active' ||
            e.completionStatus === 'InProgress'
          ) || enrollments[0];

          this.enrollmentData.set(activeEnrollment);
          this.enrollmentId.set(activeEnrollment.enrollmentId);
          this.batchId.set(activeEnrollment.batchId);

          if (activeEnrollment.batchName) {
            this.batchName.set(activeEnrollment.batchName);
          }

          this.loadBatchData(activeEnrollment.batchId);
          this.loadTasks(activeEnrollment.batchId);
          this.loadAnnouncements(activeEnrollment.batchId);
        } else {
          this.loading.set(false);
          this.errorMessage.set('لا توجد تسجيلات نشطة للمتدرب.');
        }
      },
      error: (error: any) => {
        console.error('Error loading enrollments:', error);
        this.loading.set(false);
        this.errorMessage.set('تعذر تحميل تسجيلات المتدرب.');
      }
    });
  }


  // =========================================================
  // تحميل بيانات الباتش
  // GET /api/Batch/{id}
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
      }
    });
  }


  // =========================================================
  // تحميل بيانات البرنامج
  // GET /api/Program/{id}
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
      }
    });
  }


  // =========================================================
  // تحميل المهام
  // GET /api/Task/batch/{batchId}
  // =========================================================

  loadTasks(batchId: number): void {
    this.loadingTasks.set(true);

    this.api.getTasks(batchId).subscribe({
      next: (tasks: TaskDto[]) => {
        this.tasks.set((tasks ?? []).slice(0, 3));
        this.loadingTasks.set(false);
      },
      error: (error: any) => {
        console.error('Error loading tasks:', error);
        this.tasks.set([]);
        this.loadingTasks.set(false);
      }
    });
  }


  // =========================================================
  // تحميل الإعلانات من مصادر متعددة
  // =========================================================

  loadAnnouncements(batchId: number): void {
    this.loadingAnnouncements.set(true);
    this.announcements.set([]);

    this.api.getPlatformAnnouncements().subscribe({
      next: (items: AnnouncementDto[]) => {
        this.mergeAnnouncements(items, 'الهيئة');
        this.loadingAnnouncements.set(false);
      },
      error: (error: any) => {
        console.error('Error loading platform announcements:', error);
        this.loadingAnnouncements.set(false);
      }
    });

    const companyId = this.companyId();
    if (companyId) {
      this.api.getCompanyAnnouncements(companyId).subscribe({
        next: (items: AnnouncementDto[]) => {
          this.mergeAnnouncements(items, 'الشركة');
        },
        error: (error: any) => {
          console.error('Error loading company announcements:', error);
        }
      });
    }

    this.api.getBatchAnnouncements(batchId).subscribe({
      next: (items: AnnouncementDto[]) => {
        this.mergeAnnouncements(items, 'المدرب');
      },
      error: (error: any) => {
        console.error('Error loading batch announcements:', error);
      }
    });
  }


  // =========================================================
  // دمج الإعلانات
  // =========================================================

  private mergeAnnouncements(items: AnnouncementDto[], source: string) {
    this.announcements.update((list) => {
      const newItems = (items ?? []).map((a) => ({ ...a, source }));
      const combined = [...list, ...newItems];
      combined.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
      return combined;
    });
  }


  // =========================================================
  // الحصول على معرف المستخدم الحالي
  // =========================================================

  private getCurrentUserId(): number {
    // محاولة الحصول من AuthService
    try {
      const currentUser = (this.auth as any).currentUser;
      if (currentUser?.userId) {
        return currentUser.userId;
      }
    } catch (e) {
      console.warn('Could not get user from AuthService');
    }

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

    // مؤقتاً
    return 1;
  }


  // =========================================================
  // إعادة تحميل البيانات
  // =========================================================

  refreshData(): void {
    const traineeId = this.traineeId();
    const batchId = this.batchId();

    if (traineeId) {
      this.loadDashboardSummary(traineeId);
    }

    if (batchId) {
      this.loadTasks(batchId);
      this.loadAnnouncements(batchId);
    }
  }


  // =========================================================
  // دوال مساعدة للعرض
  // =========================================================

  getStatusColor(status: string): string {
    const statusMap: Record<string, string> = {
      'Active': 'var(--status-active-bg)',
      'InProgress': 'var(--status-active-bg)',
      'Completed': 'var(--status-completed-bg)',
      'Graduated': 'var(--status-completed-bg)',
      'Dropped': 'var(--status-new-bg)',
      'Suspended': 'var(--status-new-bg)'
    };
    return statusMap[status] || 'var(--status-new-bg)';
  }

  getStatusTextColor(status: string): string {
    const statusMap: Record<string, string> = {
      'Active': 'var(--status-active-fg)',
      'InProgress': 'var(--status-active-fg)',
      'Completed': 'var(--status-completed-fg)',
      'Graduated': 'var(--status-completed-fg)',
      'Dropped': 'var(--status-new-fg)',
      'Suspended': 'var(--status-new-fg)'
    };
    return statusMap[status] || 'var(--status-new-fg)';
  }


  // =========================================================
  // عدد المهام العالقة (مقارنة كسلاسل نصية)
  // =========================================================

  getPendingTasksCount(): number {
    const tasks = this.tasks();
    return tasks.filter(t => {
      const status = String(t.status).toLowerCase();
      return status === 'new' || status === 'pending';
    }).length;
  }


  // =========================================================
  // عدد المهام المكتملة (مقارنة كسلاسل نصية)
  // =========================================================

  getCompletedTasksCount(): number {
    const tasks = this.tasks();
    return tasks.filter(t => {
      const status = String(t.status).toLowerCase();
      return status === 'completed' || status === 'graded';
    }).length;
  }
}