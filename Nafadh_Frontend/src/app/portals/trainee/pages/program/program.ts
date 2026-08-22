import {
  Component,
  OnInit,
  signal,
  computed,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { TraineeApi } from '../../services/trainee-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  ProgramDto,
  ModuleDto,
  LessonDto,
  TraineeModuleProgressDto,
  EnrollmentDto,
  ProgressSummaryDto,
  TraineeProfileDto
} from '../../../../core/models/dtos';

// =====================================================
// Extended DTOs
// =====================================================

export interface LessonWithProgressDto extends LessonDto {
  progressPercentage?: number;
}

export interface ModuleWithLessonsDto extends ModuleDto {
  progressPercentage?: number;
  lessons?: LessonWithProgressDto[];
  isLocked?: boolean;
  prerequisitePassed?: boolean;
}

export interface ProgramStatsDto {
  totalModules: number;
  completedModules: number;
  totalLessons: number;
  completedLessons: number;
  overallProgress: number;
  totalDays: number;
  totalAssignments: number;
  experienceYears: number;
}

// =====================================================
// COMPONENT
// =====================================================

@Component({
  selector: 'app-trainee-program',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './program.html'
})
export class TraineeProgram implements OnInit {

  // =====================================================
  // INJECT
  // =====================================================

  private api = inject(TraineeApi);
  private auth = inject(AuthService);
  private router = inject(Router);

  // =====================================================
  // IDs
  // =====================================================

  programId = signal<number | null>(null);

  userId = signal<number | null>(null);

  traineeId = signal<number | null>(null);

  batchId = signal<number | null>(null);

  enrollmentId = signal<number | null>(null);

  // =====================================================
  // USER / TRAINEE
  // =====================================================

  traineeData = signal<TraineeProfileDto | null>(null);

  // =====================================================
  // MAIN DATA
  // =====================================================

  program = signal<ProgramDto | null>(null);

  modules = signal<ModuleWithLessonsDto[]>([]);

  enrollment = signal<EnrollmentDto | null>(null);

  progress = signal<ProgressSummaryDto | null>(null);

  moduleProgress = signal<TraineeModuleProgressDto[]>([]);

  // =====================================================
  // STATE
  // =====================================================

  loading = signal(true);

  error = signal<string | null>(null);

  // =====================================================
  // STATISTICS
  // =====================================================

  stats = signal<ProgramStatsDto>({
    totalModules: 0,
    completedModules: 0,
    totalLessons: 0,
    completedLessons: 0,
    overallProgress: 0,
    totalDays: 0,
    totalAssignments: 0,
    experienceYears: 0
  });

  // =====================================================
  // COMPUTED
  // =====================================================

  overallProgress = computed(() =>
    this.stats().overallProgress || 0
  );

  totalModules = computed(() =>
    this.stats().totalModules || 0
  );

  completedModules = computed(() =>
    this.stats().completedModules || 0
  );

  totalLessons = computed(() =>
    this.stats().totalLessons || 0
  );

  completedLessons = computed(() =>
    this.stats().completedLessons || 0
  );

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {

    console.log('====================================');
    console.log('🎓 Trainee Program Page');
    console.log('====================================');

    this.loadCurrentTrainee();
  }

  // =====================================================
  // LOAD CURRENT TRAINEE
  // نفس طريقة Dashboard
  // =====================================================

  private loadCurrentTrainee(): void {

    const session = this.auth.session?.();

    console.log('🔐 Auth session:', session);

    let currentUserId: number | null = null;

    if (session?.userId) {

      currentUserId = Number(session.userId);

    } else {

      currentUserId = this.getUserIdFromStorage();
    }

    if (!currentUserId || Number.isNaN(currentUserId)) {

      console.error('❌ User ID not found');

      this.error.set(
        'يرجى تسجيل الدخول أولاً.'
      );

      this.loading.set(false);

      return;
    }

    this.userId.set(currentUserId);

    console.log(
      '✅ Current User ID:',
      currentUserId
    );

    this.loadTrainee(currentUserId);
  }

  // =====================================================
  // LOAD TRAINEE
  // GET /api/Trainee/{userId}
  // =====================================================

  private loadTrainee(userId: number): void {

    this.api.getTrainee(userId).subscribe({

      next: (trainee: TraineeProfileDto) => {

        console.log(
          '✅ Trainee:',
          trainee
        );

        this.traineeData.set(trainee);

        const id =
          Number(trainee.traineeId);

        if (!id || Number.isNaN(id)) {

          console.error(
            '❌ Invalid traineeId:',
            trainee
          );

          this.error.set(
            'لم يتم العثور على معرف المتدرب.'
          );

          this.loading.set(false);

          return;
        }

        this.traineeId.set(id);

        console.log(
          '✅ Trainee ID:',
          id
        );

        this.loadEnrollment(id);
      },

      error: error => {

        console.error(
          '❌ Trainee API Error:',
          error
        );

        this.error.set(
          'تعذر تحميل بيانات المتدرب.'
        );

        this.loading.set(false);
      }
    });
  }

  // =====================================================
  // LOAD ENROLLMENT
  // نفس API المستخدم في Dashboard
  //
  // GET /api/Enrollment/trainee/{traineeId}
  // =====================================================

  private loadEnrollment(traineeId: number): void {

    console.log(
      '📚 Loading enrollments for trainee:',
      traineeId
    );

    this.api
      .getEnrollmentsByTrainee(traineeId)
      .subscribe({

        next: (enrollments: EnrollmentDto[]) => {

          console.log(
            '✅ Enrollments:',
            enrollments
          );

          if (
            !enrollments ||
            enrollments.length === 0
          ) {

            this.error.set(
              'لا توجد تسجيلات للمتدرب.'
            );

            this.loading.set(false);

            return;
          }

          // =================================================
          // نفس منطق Dashboard
          // =================================================

          const activeEnrollment =
            enrollments.find(e => {

              const status =
                String(
                  e.completionStatus ?? ''
                ).toLowerCase();

              return (
                status === 'active' ||
                status === 'inprogress'
              );

            }) || enrollments[0];

          console.log(
            '✅ Selected enrollment:',
            activeEnrollment
          );

          this.enrollment.set(
            activeEnrollment
          );

          this.enrollmentId.set(
            Number(
              activeEnrollment.enrollmentId
            )
          );

          this.batchId.set(
            Number(
              activeEnrollment.batchId
            )
          );

          // =================================================
          // IMPORTANT
          // ProgramId يأتي من Batch
          // وليس من route
          // =================================================

          this.loadBatchAndProgram(
            Number(activeEnrollment.batchId)
          );
        },

        error: error => {

          console.error(
            '❌ Enrollment API Error:',
            error
          );

          this.error.set(
            'تعذر تحميل تسجيل المتدرب.'
          );

          this.loading.set(false);
        }
      });
  }

  // =====================================================
  // LOAD BATCH
  // GET /api/Batch/{batchId}
  // =====================================================

  private loadBatchAndProgram(
    batchId: number
  ): void {

    if (
      !batchId ||
      Number.isNaN(batchId)
    ) {

      console.error(
        '❌ Invalid batchId:',
        batchId
      );

      this.error.set(
        'لم يتم العثور على الدفعة.'
      );

      this.loading.set(false);

      return;
    }

    console.log(
      '📦 Loading batch:',
      batchId
    );

    this.api.getBatch(batchId).subscribe({

      next: batch => {

        console.log(
          '✅ Batch:',
          batch
        );

        const programId =
          Number(batch.programId);

        if (
          !programId ||
          Number.isNaN(programId)
        ) {

          console.error(
            '❌ Invalid programId from batch:',
            batch
          );

          this.error.set(
            'لم يتم العثور على البرنامج المرتبط بالدفعة.'
          );

          this.loading.set(false);

          return;
        }

        this.programId.set(
          programId
        );

        console.log(
          '🎯 Program ID:',
          programId
        );

        this.loadProgramData(programId);
      },

      error: error => {

        console.error(
          '❌ Batch API Error:',
          error
        );

        this.error.set(
          'تعذر تحميل بيانات الدفعة.'
        );

        this.loading.set(false);
      }
    });
  }

  // =====================================================
  // LOAD PROGRAM
  //
  // GET /api/Program/{programId}
  //
  // هذه الدالة موجودة حتى يتوافق معها HTML
  // =====================================================

  loadProgramData(
    programId?: number
  ): void {

    const id =
      programId ??
      this.programId();

    if (
      !id ||
      Number.isNaN(Number(id))
    ) {

      console.error(
        '❌ Program ID is invalid:',
        id
      );

      this.error.set(
        'لم يتم العثور على معرف البرنامج.'
      );

      this.loading.set(false);

      return;
    }

    this.programId.set(
      Number(id)
    );

    console.log(
      '🎓 Loading Program:',
      id
    );

    this.api.getProgram(
      Number(id)
    ).subscribe({

      next: program => {

        console.log(
          '✅ Program loaded:',
          program
        );

        this.program.set(
          program
        );

        // بعد تحميل البرنامج
        this.loadModules();
      },

      error: error => {

        console.error(
          '❌ Program API Error:',
          error
        );

        this.error.set(
          'تعذر تحميل بيانات البرنامج.'
        );

        this.loading.set(false);
      }
    });
  }

  // =====================================================
  // LOAD MODULES
  //
  // GET /api/Program/{programId}/modules
  // =====================================================

  private loadModules(): void {

    const programId =
      this.programId();

    if (
      !programId ||
      Number.isNaN(Number(programId))
    ) {

      console.error(
        '❌ Cannot load modules. Program ID missing.'
      );

      this.loading.set(false);

      return;
    }

    console.log(
      '📚 Loading modules for program:',
      programId
    );

    this.api
      .getProgramModules(programId)
      .subscribe({

        next: (modules: ModuleDto[]) => {

          console.log(
            '✅ Modules:',
            modules
          );

          if (
            !modules ||
            modules.length === 0
          ) {

            this.modules.set([]);

            this.loadModuleProgress();

            return;
          }

          this.loadModuleLessons(
            modules
          );
        },

        error: error => {

          console.error(
            '❌ Modules API Error:',
            error
          );

          this.modules.set([]);

          this.loadModuleProgress();
        }
      });
  }

  // =====================================================
  // LOAD LESSONS
  // =====================================================

  private loadModuleLessons(
    modules: ModuleDto[]
  ): void {

    if (
      !modules ||
      modules.length === 0
    ) {

      this.modules.set([]);

      this.loadModuleProgress();

      return;
    }

    const requests =
      modules.map(module =>
        this.api.getModuleLessons(
          module.moduleId
        )
      );

    import('rxjs').then(({ forkJoin }) => {

      forkJoin(requests).subscribe({

        next: lessonsData => {

          const result:
            ModuleWithLessonsDto[] =
            modules.map(
              (module, index) => {

                const lessons =
                  lessonsData[index] ?? [];

                return {

                  ...module,

                  progressPercentage: 0,

                  prerequisitePassed: true,

                  isLocked: false,

                  lessons:
                    lessons.map(
                      lesson => ({
                        ...lesson,
                        progressPercentage: 0
                      })
                    )
                };
              }
            );

          this.modules.set(
            result
          );

          console.log(
            '✅ Modules + Lessons:',
            result
          );

          this.loadModuleProgress();
        },

        error: error => {

          console.error(
            '❌ Lessons API Error:',
            error
          );

          const result =
            modules.map(module => ({

              ...module,

              progressPercentage: 0,

              prerequisitePassed: true,

              isLocked: false,

              lessons: []

            }));

          this.modules.set(
            result
          );

          this.loadModuleProgress();
        }
      });

    });
  }

  // =====================================================
  // LOAD MODULE PROGRESS
  //
  // نفس API الموجود في المشروع
  // =====================================================

  private loadModuleProgress(): void {

    const traineeId =
      this.traineeId();

    if (
      !traineeId ||
      Number.isNaN(Number(traineeId))
    ) {

      console.warn(
        '⚠️ traineeId missing.'
      );

      this.calculateStats();

      this.loading.set(false);

      return;
    }

    this.api
      .getModuleProgress(traineeId)
      .subscribe({

        next:
          (
            progressData:
            TraineeModuleProgressDto[]
          ) => {

            console.log(
              '✅ Module Progress:',
              progressData
            );

            this.moduleProgress.set(
              progressData ?? []
            );

            this.updateModulesWithProgress(
              progressData ?? []
            );

            this.loadEnrollmentProgress();
          },

        error: error => {

          console.error(
            '❌ Module Progress API Error:',
            error
          );

          this.calculateStats();

          this.loading.set(false);
        }
      });
  }

  // =====================================================
  // LOAD ENROLLMENT PROGRESS
  //
  // GET /api/Enrollment/{id}/progress-summary
  // =====================================================

  private loadEnrollmentProgress(): void {

    const enrollmentId =
      this.enrollmentId();

    if (
      !enrollmentId ||
      Number.isNaN(Number(enrollmentId))
    ) {

      console.warn(
        '⚠️ Enrollment ID missing.'
      );

      this.calculateStats();

      this.loading.set(false);

      return;
    }

    this.api
      .getEnrollmentProgress(
        enrollmentId
      )
      .subscribe({

        next:
          (
            summary:
            ProgressSummaryDto
          ) => {

            console.log(
              '✅ Progress Summary:',
              summary
            );

            this.progress.set(
              summary
            );

            this.calculateStats();

            this.loading.set(false);
          },

        error: error => {

          console.error(
            '❌ Progress Summary Error:',
            error
          );

          this.calculateStats();

          this.loading.set(false);
        }
      });
  }

  // =====================================================
  // UPDATE MODULE PROGRESS
  // =====================================================

  private updateModulesWithProgress(
    progressData:
      TraineeModuleProgressDto[]
  ): void {

    const updatedModules =
      this.modules().map(module => {

        const progress =
          progressData.find(
            p =>
              p.moduleId ===
              module.moduleId
          );

        let percentage = 0;

        if (progress) {

          const status =
            String(
              progress.status ?? ''
            ).toLowerCase();

          if (
            status === 'completed'
          ) {

            percentage = 100;

          } else if (
            status === 'inprogress' ||
            status === 'in_progress'
          ) {

            percentage = 50;

          } else {

            percentage = 0;
          }
        }

        const lessons =
          module.lessons ?? [];

        const completedCount =
          percentage === 100
            ? lessons.length
            : percentage > 0
              ? Math.round(
                  (
                    percentage / 100
                  ) *
                  lessons.length
                )
              : 0;

        const updatedLessons =
          lessons.map(
            (lesson, index) => ({

              ...lesson,

              progressPercentage:
                index < completedCount
                  ? 100
                  : 0

            })
          );

        return {

          ...module,

          progressPercentage:
            percentage,

          lessons:
            updatedLessons

        };
      });

    this.modules.set(
      updatedModules
    );

    this.checkModulePrerequisites();
  }

  // =====================================================
  // PREREQUISITES
  // =====================================================

  private checkModulePrerequisites(): void {

    const traineeId =
      this.traineeId();

    if (!traineeId) {
      return;
    }

    const modules =
      this.modules();

    modules.forEach(
      (module, index) => {

        // أول Module مفتوح
        if (index === 0) {

          this.updateModuleLock(
            module.moduleId,
            true
          );

          return;
        }

        this.api
          .checkPrerequisite(
            module.moduleId,
            traineeId
          )
          .subscribe({

            next: passed => {

              this.updateModuleLock(
                module.moduleId,
                passed
              );
            },

            error: error => {

              console.warn(
                `⚠️ Prerequisite API failed for module ${module.moduleId}`,
                error
              );

              /*
               * مهم:
               * في حالة فشل API لا نقفل الواجهة.
               */
              this.updateModuleLock(
                module.moduleId,
                true
              );
            }
          });
      }
    );
  }

  // =====================================================
  // UPDATE LOCK
  // =====================================================

  private updateModuleLock(
    moduleId: number,
    passed: boolean
  ): void {

    this.modules.update(
      modules =>
        modules.map(module =>

          module.moduleId === moduleId

            ? {

                ...module,

                prerequisitePassed:
                  passed,

                isLocked:
                  !passed

              }

            : module
        )
    );
  }

  // =====================================================
  // CALCULATE STATS
  // =====================================================

  private calculateStats(): void {

    const modules =
      this.modules();

    const totalModules =
      modules.length;

    const completedModules =
      modules.filter(
        m =>
          m.progressPercentage === 100
      ).length;

    const totalLessons =
      modules.reduce(
        (sum, module) =>
          sum +
          (
            module.lessons?.length ?? 0
          ),
        0
      );

    const completedLessons =
      modules.reduce(
        (sum, module) =>
          sum +
          (
            module.lessons?.filter(
              lesson =>
                lesson.progressPercentage ===
                100
            ).length ?? 0
          ),
        0
      );

    let overallProgress = 0;

    const summary =
      this.progress();

    if (summary) {

      overallProgress =
        Number(
          summary.progressPercentage ?? 0
        );

    } else if (
      totalModules > 0
    ) {

      overallProgress =
        Math.round(
          (
            completedModules /
            totalModules
          ) * 100
        );
    }

    this.stats.set({

      totalModules,

      completedModules,

      totalLessons,

      completedLessons,

      overallProgress,

      totalDays:
        this.calculateTotalDays(),

      totalAssignments:
        this.calculateTotalAssignments(),

      experienceYears:
        this.calculateExperienceYears(
          overallProgress
        )

    });
  }

  // =====================================================
  // TOTAL DAYS
  // =====================================================

  private calculateTotalDays(): number {

    const durationHours =
      Number(
        this.program()?.durationHours ?? 0
      );

    if (
      durationHours > 0
    ) {

      return Math.ceil(
        durationHours / 8
      );
    }

    return this.modules().length * 2;
  }

  // =====================================================
  // TOTAL ASSIGNMENTS
  // =====================================================

  private calculateTotalAssignments(): number {

    return this.modules().reduce(
      (sum, module) =>
        sum +
        (
          module.lessons?.length ?? 0
        ),
      0
    );
  }

  // =====================================================
  // EXPERIENCE
  // =====================================================

  private calculateExperienceYears(
    progress: number
  ): number {

    if (progress >= 100) {
      return 10;
    }

    if (progress >= 75) {
      return 7;
    }

    if (progress >= 50) {
      return 5;
    }

    if (progress >= 25) {
      return 3;
    }

    return 1;
  }

  // =====================================================
  // OPEN LESSON
  // =====================================================

  openLesson(
    lesson: LessonWithProgressDto,
    module: ModuleWithLessonsDto
  ): void {

    if (module.isLocked) {

      console.warn(
        '🔒 Module is locked'
      );

      return;
    }

    if (!lesson.lessonId) {

      console.warn(
        '⚠️ Invalid lesson ID'
      );

      return;
    }

    console.log(
      '📖 Opening lesson:',
      lesson.lessonId
    );

    this.router.navigate([
      '/trainee/lessons',
      lesson.lessonId
    ]);
  }

  // =====================================================
  // OPEN MODULE
  // =====================================================

  openModule(
    module: ModuleWithLessonsDto
  ): void {

    if (module.isLocked) {

      console.warn(
        '🔒 Prerequisite not completed'
      );

      return;
    }

    console.log(
      '📚 Module selected:',
      module.moduleId
    );
  }

  // =====================================================
  // ACHIEVEMENT
  // =====================================================

  markAchievement(): void {

    const traineeId =
      this.traineeId();

    const programId =
      this.programId();

    if (!traineeId) {

      console.warn(
        '⚠️ No trainee ID'
      );

      return;
    }

    if (!programId) {

      console.warn(
        '⚠️ No program ID'
      );

      return;
    }

    this.api
      .markAchievement(
        traineeId,
        programId
      )
      .subscribe({

        next: response => {

          console.log(
            '✅ Achievement marked:',
            response
          );

          /*
           * إعادة تحميل البرنامج
           */
          this.loadProgramData(
            programId
          );
        },

        error: error => {

          console.error(
            '❌ Achievement Error:',
            error
          );
        }
      });
  }

  // =====================================================
  // USER ID FROM STORAGE
  // =====================================================

  private getUserIdFromStorage(): number | null {

    const localUserId =
      localStorage.getItem(
        'userId'
      );

    if (localUserId) {

      const id =
        Number(localUserId);

      if (
        id &&
        !Number.isNaN(id)
      ) {

        return id;
      }
    }

    const sessionUserId =
      sessionStorage.getItem(
        'userId'
      );

    if (sessionUserId) {

      const id =
        Number(sessionUserId);

      if (
        id &&
        !Number.isNaN(id)
      ) {

        return id;
      }
    }

    /*
     * محاولة إضافية من userData
     */
    const userData =
      localStorage.getItem(
        'userData'
      );

    if (userData) {

      try {

        const user =
          JSON.parse(userData);

        const id =
          Number(
            user.userId ??
            user.id
          );

        if (
          id &&
          !Number.isNaN(id)
        ) {

          return id;
        }

      } catch {

        console.warn(
          '⚠️ Invalid userData'
        );
      }
    }

    return null;
  }
}