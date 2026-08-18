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
  CompanySupervisorDto
} from '../../../../core/models/dtos';
import { TRAINEE_STATUS_LABELS } from '../../../../core/models/enums';

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
  tasks = signal<TaskDto[]>([]);
  announcements = signal<(AnnouncementDto & { source: string })[]>([]);


  // =========================================================
  // حالات التحميل
  // =========================================================

  loading = signal(false);
  loadingTasks = signal(false);
  loadingAnnouncements = signal(false);
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
  // دالة مساعدة لمقارنة حالة المهمة (كسلاسل نصية)
  // =========================================================

  getTaskStatusDisplay(status: any): string {
    const statusStr = String(status).toLowerCase();
    if (statusStr === 'new' || statusStr === 'pending') return 'جديد';
    if (statusStr === 'completed' || statusStr === 'graded') return 'مكتمل';
    if (statusStr === 'submitted' || statusStr === 'underreview' || statusStr === 'review') return 'قيد المراجعة';
    return status;
  }

  getTaskStatusStyle(status: any): { background: string; color: string } {
    const statusStr = String(status).toLowerCase();
    if (statusStr === 'new' || statusStr === 'pending') {
      return { background: '#eff6ff', color: '#2563eb' };
    }
    if (statusStr === 'completed' || statusStr === 'graded') {
      return { background: '#f0fdf4', color: '#16a34a' };
    }
    if (statusStr === 'submitted' || statusStr === 'underreview' || statusStr === 'review') {
      return { background: '#fef3c7', color: '#d97706' };
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
      }
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
          // البحث عن تسجيل نشط
          const activeEnrollment = enrollments.find(e =>
            e.completionStatus === 'Active' ||
            e.completionStatus === 'InProgress'
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
          
          // تحميل المشرف إذا كان موجوداً
          if (activeEnrollment.supervisorId) {
            this.loadSupervisor(activeEnrollment.supervisorId);
          }

          // تحميل المهام والإعلانات
          this.loadTasks(activeEnrollment.batchId);
          this.loadAnnouncements(activeEnrollment.batchId);
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
      }
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
      console.log('Batch trainers response:', trainers); // للتأكد من البيانات
      
      if (trainers && trainers.length > 0) {
        // نأخذ أول مدرب في الدفعة
        const firstTrainer = trainers[0];
        
        // إذا كان الـ API يرجع TrainerDto كامل، نستخدمه مباشرة
        // ولكن إذا كان يرجع فقط { batchId, trainerId }، نحتاج لجلب البيانات الكاملة
        if (firstTrainer.trainerId) {
          // نحتاج لجلب بيانات المدرب كاملة
          this.api.getTrainer(firstTrainer.trainerId).subscribe({
            next: (trainer: TrainerDto) => {
              this.trainerData.set(trainer);
              this.loadingTrainer.set(false);
            },
            error: (error: any) => {
              console.error('Error loading trainer details:', error);
              this.loadingTrainer.set(false);
            }
          });
        } else {
          this.trainerData.set(null);
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
    }
  });
}

  // =========================================================
  // تحميل بيانات المشرف
  // GET /api/CompanySupervisor/{id}
  // =========================================================

  loadSupervisor(supervisorId: number): void {
    this.loadingSupervisor.set(true);

    this.api.getCompanySupervisor(supervisorId).subscribe({
      next: (supervisor: CompanySupervisorDto) => {
        this.supervisorData.set(supervisor);
        this.loadingSupervisor.set(false);
      },
      error: (error: any) => {
        console.error('Error loading supervisor:', error);
        this.supervisorData.set(null);
        this.loadingSupervisor.set(false);
      }
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
      }
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

    // إعلانات المنصة
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

    // إعلانات الشركة
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

    // إعلانات الدفعة
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

    if (traineeId) {
      this.loadDashboardSummary(traineeId);
    }

    if (batchId) {
      this.loadTasks(batchId);
      this.loadAnnouncements(batchId);
      this.loadTrainerByBatch(batchId);
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
    
    // إذا كان التخصص موجوداً
    if (trainer.specialty) {
      return trainer.specialty;
    }
    
    // إذا كانت الخبرة موجودة
    if (trainer.experienceYears !== undefined && trainer.experienceYears > 0) {
      return `خبرة ${trainer.experienceYears} سنوات`;
    }
    
    // إذا كانت السيرة الذاتية موجودة
    if (trainer.biography) {
      return trainer.biography.length > 30 ? trainer.biography.substring(0, 30) + '...' : trainer.biography;
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
  // التواصل مع المدرب (اختياري)
  // =========================================================

  contactTrainer(): void {
    const trainer = this.trainerData();
    if (!trainer) return;
    
    console.log('Contact trainer:', trainer);
    // يمكن توجيه المستخدم إلى صفحة المحادثة
    // this.router.navigate(['/messages', trainer.userId]);
  }
}