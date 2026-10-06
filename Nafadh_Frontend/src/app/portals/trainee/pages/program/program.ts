
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
  TraineeProfileDto,
  TrainingMaterialDto,
  SessionDto
} from '../../../../core/models/dtos';


// =====================================================
// Extended DTOs
// =====================================================

export interface LessonWithProgressDto extends LessonDto {
  progressPercentage?: number;
  trainingMaterials?: TrainingMaterialDto[];
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
  // SESSION / TRAINING MATERIALS
  // =====================================================

  sessions = signal<SessionDto[]>([]);

  lessonMaterials =
    signal<Record<number, TrainingMaterialDto[]>>({});


  // =====================================================
  // USER / TRAINEE
  // =====================================================

  traineeData =
    signal<TraineeProfileDto | null>(null);


  // =====================================================
  // MAIN DATA
  // =====================================================

  program =
    signal<ProgramDto | null>(null);

  modules =
    signal<ModuleWithLessonsDto[]>([]);

  enrollment =
    signal<EnrollmentDto | null>(null);

  progress =
    signal<ProgressSummaryDto | null>(null);

  moduleProgress =
    signal<TraineeModuleProgressDto[]>([]);


  // =====================================================
  // STATE
  // =====================================================

  loading = signal(true);

  error =
    signal<string | null>(null);


  // =====================================================
  // TOAST NOTIFICATION
  // =====================================================

  notificationMessage =
    signal('');

  notificationType =
    signal<'success' | 'error'>('success');

  notificationVisible =
    signal(false);

  private notificationTimer?:
    ReturnType<typeof setTimeout>;


  // =====================================================
  // STATISTICS
  // =====================================================

  stats =
    signal<ProgramStatsDto>({
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
  // SHOW NOTIFICATION
  // =====================================================

  showNotification(
    message: string,
    type: 'success' | 'error' = 'success'
  ): void {

    this.notificationMessage.set(
      message
    );

    this.notificationType.set(
      type
    );

    this.notificationVisible.set(
      true
    );


    if (this.notificationTimer) {

      clearTimeout(
        this.notificationTimer
      );

    }


    this.notificationTimer =
      setTimeout(() => {

        this.notificationVisible.set(
          false
        );

      }, 3000);
  }


  // =====================================================
  // LOAD CURRENT TRAINEE
  // =====================================================

  private loadCurrentTrainee(): void {

    const session =
      this.auth.session?.();

    console.log(
      '🔐 Auth session:',
      session
    );

    let currentUserId: number | null = null;

    if (session?.userId) {

      currentUserId =
        Number(session.userId);

    } else {

      currentUserId =
        this.getUserIdFromStorage();

    }


    if (
      !currentUserId ||
      Number.isNaN(currentUserId)
    ) {

      console.error(
        '❌ User ID not found'
      );

      this.error.set(
        'يرجى تسجيل الدخول أولاً.'
      );

      this.loading.set(false);

      return;
    }


    this.userId.set(
      currentUserId
    );


    console.log(
      '✅ Current User ID:',
      currentUserId
    );


    this.loadTrainee(
      currentUserId
    );
  }


  // =====================================================
  // LOAD TRAINEE
  // GET /api/Trainee/traineeByUserID/{userId}
  // =====================================================

  private loadTrainee(
    userId: number
  ): void {

    this.api
      .getTrainee(userId)
      .subscribe({

        next:
          (
            trainee:
            TraineeProfileDto
          ) => {

            console.log(
              '✅ Trainee:',
              trainee
            );


            this.traineeData.set(
              trainee
            );


            const id =
              Number(
                trainee.traineeId
              );


            if (
              !id ||
              Number.isNaN(id)
            ) {

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


            this.traineeId.set(
              id
            );


            console.log(
              '✅ Trainee ID:',
              id
            );


            this.loadEnrollment(id);
          },


        error:
          error => {

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
  // GET /api/Enrollment/trainee/{traineeId}
  // =====================================================

  private loadEnrollment(
    traineeId: number
  ): void {

    console.log(
      '📚 Loading enrollments for trainee:',
      traineeId
    );


    this.api
      .getEnrollmentsByTrainee(
        traineeId
      )
      .subscribe({

        next:
          (
            enrollments:
            EnrollmentDto[]
          ) => {

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


            const activeEnrollment =
              enrollments.find(
                e => {

                  const status =
                    String(
                      e.completionStatus ?? ''
                    ).toLowerCase();

                  return (
                    status === 'active' ||
                    status === 'inprogress'
                  );

                }
              ) ||
              enrollments[0];


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


            const batchId =
              Number(
                activeEnrollment.batchId
              );


            this.batchId.set(
              batchId
            );


            this.loadBatchSessions(
              batchId
            );


            this.loadBatchAndProgram(
              batchId
            );

          },


        error:
          error => {

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
      Number.isNaN(Number(batchId))
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


    this.api
      .getBatch(batchId)
      .subscribe({

        next:
          batch => {

            console.log(
              '✅ Batch:',
              batch
            );


            const programId =
              Number(
                batch.programId
              );


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


            this.loadProgramData(
              programId
            );
          },


        error:
          error => {

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
  // GET /api/Program/{programId}
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


    this.api
      .getProgram(Number(id))
      .subscribe({

        next:
          program => {

            console.log(
              '✅ Program loaded:',
              program
            );


            this.program.set(
              program
            );


            this.loadModules();
          },


        error:
          error => {

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

        next:
          (
            modules:
            ModuleDto[]
          ) => {

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


        error:
          error => {

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
      modules.map(
        module =>
          this.api.getModuleLessons(
            module.moduleId
          )
      );


    import('rxjs')
      .then(({ forkJoin }) => {

        forkJoin(requests)
          .subscribe({

            next:
              lessonsData => {

                const result:
                  ModuleWithLessonsDto[] =
                  modules.map(
                    (
                      module,
                      index
                    ) => {

                      const lessons =
                        lessonsData[index] ?? [];


                      return {

                        ...module,

                        progressPercentage:
                          0,

                        prerequisitePassed:
                          true,

                        isLocked:
                          false,

                        lessons:
                          lessons.map(
                            lesson => ({

                              ...lesson,

                              progressPercentage:
                                0

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


            error:
              error => {

                console.error(
                  '❌ Lessons API Error:',
                  error
                );


                const result =
                  modules.map(
                    module => ({

                      ...module,

                      progressPercentage:
                        0,

                      prerequisitePassed:
                        true,

                      isLocked:
                        false,

                      lessons:
                        []

                    })
                  );


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


        error:
          error => {

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


        error:
          error => {

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
      this.modules().map(
        module => {

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
                      percentage /
                      100
                    ) *
                    lessons.length
                  )
                : 0;


          const updatedLessons =
            lessons.map(
              (
                lesson,
                index
              ) => ({

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

        }
      );


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
      (
        module,
        index
      ) => {

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

            next:
              passed => {

                this.updateModuleLock(
                  module.moduleId,
                  passed
                );

              },


            error:
              error => {

                console.warn(
                  `⚠️ Prerequisite API failed for module ${module.moduleId}`,
                  error
                );


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
        modules.map(
          module =>

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
        (
          sum,
          module
        ) =>
          sum +
          (
            module.lessons?.length ?? 0
          ),
        0
      );


    const completedLessons =
      modules.reduce(
        (
          sum,
          module
        ) =>
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
          ) *
          100
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
      (
        sum,
        module
      ) =>
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
  // SESSIONS
  // GET /api/Session/batch/{batchId}
  // =====================================================

  private loadBatchSessions(
    batchId: number
  ): void {

    if (
      !batchId ||
      Number.isNaN(Number(batchId))
    ) {
      return;
    }


    this.api
      .getSessionsByBatch(batchId)
      .subscribe({

        next:
          sessions => {

            console.log(
              '✅ Batch Sessions:',
              sessions
            );


            this.sessions.set(
              sessions ?? []
            );
          },


        error:
          error => {

            console.error(
              '❌ Sessions API Error:',
              error
            );


            this.sessions.set([]);
          }

      });
  }


  // =====================================================
  // ATTEND LESSON
  // =====================================================

  attendLesson(
    lesson: LessonWithProgressDto,
    module: ModuleWithLessonsDto
  ): void {

    if (module.isLocked) {

      console.warn(
        '🔒 Module is locked'
      );

      return;
    }


    const batchId =
      this.batchId();


    if (!batchId) {

      console.warn(
        '⚠️ Batch ID is missing'
      );


      alert(
        'لم يتم العثور على الدفعة.'
      );


      return;
    }


    const sessions =
      this.sessions();


    if (sessions.length) {

      this.findAndOpenSession(
        sessions,
        lesson
      );


      return;
    }


    this.api
      .getSessionsByBatch(batchId)
      .subscribe({

        next:
          data => {

            console.log(
              '✅ Batch Sessions:',
              data
            );


            const sessionData =
              data ?? [];


            this.sessions.set(
              sessionData
            );


            this.findAndOpenSession(
              sessionData,
              lesson
            );

          },


        error:
          error => {

            console.error(
              '❌ Failed to load sessions:',
              error
            );


            alert(
              'تعذر تحميل جلسات الدرس حاليًا.'
            );

          }

      });
  }


  // =====================================================
  // FIND SESSION + GET SESSION DETAILS
  // =====================================================

  private findAndOpenSession(
    sessions: SessionDto[],
    lesson: LessonWithProgressDto
  ): void {

    if (!sessions.length) {

      alert(
        'لا توجد جلسات متاحة لهذا الدرس حاليًا.'
      );

      return;
    }


    const selectedSession =
      sessions.find(
        session =>
          session.status === 'Scheduled'
      ) ??
      sessions.find(
        session =>
          !!session.meetingLink
      ) ??
      sessions.find(
        session =>
          session.status === 'Completed'
      );


    if (
      !selectedSession ||
      !selectedSession.sessionId
    ) {

      console.warn(
        '⚠️ No valid session found',
        {
          lessonId:
            lesson.lessonId,

          sessions
        }
      );


      alert(
        'لا توجد جلسة مرتبطة بهذا الدرس حاليًا.'
      );


      return;
    }


    const sessionId =
      Number(
        selectedSession.sessionId
      );


    if (
      !sessionId ||
      Number.isNaN(sessionId)
    ) {

      console.warn(
        '⚠️ Invalid sessionId:',
        selectedSession
      );


      alert(
        'معرف الجلسة غير صالح.'
      );


      return;
    }


    console.log(
      '🎯 Selected Session ID:',
      sessionId
    );


    this.api
      .getSession(sessionId)
      .subscribe({

        next:
          session => {

            console.log(
              '✅ Session Details:',
              session
            );


            if (
              session.status === 'Scheduled' &&
              session.meetingLink
            ) {

              console.log(
                '🎥 Opening meeting:',
                session.meetingLink
              );


              window.open(
                session.meetingLink,
                '_blank',
                'noopener,noreferrer'
              );


              return;
            }


            if (
              session.status === 'Completed' &&
              session.recordingUrl
            ) {

              console.log(
                '🎬 Opening recording:',
                session.recordingUrl
              );


              window.open(
                session.recordingUrl,
                '_blank',
                'noopener,noreferrer'
              );


              return;
            }


            if (
              session.meetingLink
            ) {

              console.log(
                '🎥 Opening available meeting link:',
                session.meetingLink
              );


              window.open(
                session.meetingLink,
                '_blank',
                'noopener,noreferrer'
              );


              return;
            }


            if (
              session.recordingUrl
            ) {

              console.log(
                '🎬 Opening available recording:',
                session.recordingUrl
              );


              window.open(
                session.recordingUrl,
                '_blank',
                'noopener,noreferrer'
              );


              return;
            }


            console.warn(
              '⚠️ No meetingLink or recordingUrl available',
              {
                lessonId:
                  lesson.lessonId,

                session
              }
            );


            alert(
              'لا يوجد رابط حضور أو تسجيل متاح لهذه الجلسة حاليًا.'
            );

          },


        error:
          error => {

            console.error(
              '❌ Session Details API Error:',
              error
            );


            alert(
              'تعذر تحميل بيانات الجلسة حاليًا.'
            );

          }

      });
  }


  // =====================================================
  // TRAINING MATERIALS
  // GET /api/TrainingMaterial/lesson/{lessonId}
  // =====================================================

  downloadLessonMaterials(
    lesson: LessonWithProgressDto,
    module: ModuleWithLessonsDto
  ): void {

    if (module.isLocked) {

      console.warn(
        '🔒 Module is locked'
      );

      return;
    }


    const lessonId =
      Number(
        lesson.lessonId
      );


    if (
      !lessonId ||
      Number.isNaN(lessonId)
    ) {

      console.warn(
        '⚠️ Invalid lesson ID'
      );


      return;
    }


    console.log(
      '📥 Loading training materials for lesson:',
      lessonId
    );


    this.api
      .getTrainingMaterials(lessonId)
      .subscribe({

        next:
          materials => {

            console.log(
              '✅ Training Materials:',
              materials
            );


            if (
              !materials ||
              materials.length === 0
            ) {

              alert(
                'لا توجد مواد تدريبية متاحة لهذا الدرس.'
              );


              return;
            }


            this.lessonMaterials.update(
              current => ({

                ...current,

                [lessonId]:
                  materials

              })
            );


            materials.forEach(
              material => {

                if (!material.fileUrl) {
                  return;
                }


                window.open(
                  material.fileUrl,
                  '_blank',
                  'noopener,noreferrer'
                );

              }
            );

          },


        error:
          error => {

            console.error(
              '❌ Training Material API Error:',
              error
            );


            alert(
              'تعذر تحميل مادة الدرس حاليًا.'
            );

          }

      });
  }


  // =====================================================
  // LESSON DETAILS SIDEBAR
  // =====================================================

  showLessonSidebar =
    signal(false);

  selectedLesson =
    signal<LessonWithProgressDto | null>(null);

  selectedModule =
    signal<ModuleWithLessonsDto | null>(null);

  lessonSidebarTab =
    signal<'notes' | 'rating'>('notes');

  lessonNote =
    signal('');

  lessonRating =
    signal(0);

    lessonFeedbackExists =
  signal(false);

lessonFeedbackLoading =
  signal(false);

 // =====================================================
// OPEN LESSON NOTES
// =====================================================

openLessonNotes(
  lesson: LessonWithProgressDto,
  module: ModuleWithLessonsDto
): void {

  if (module.isLocked) {

    console.warn(
      '🔒 Module is locked'
    );

    return;
  }


  this.selectedLesson.set(
    lesson
  );


  this.selectedModule.set(
    module
  );


  this.lessonSidebarTab.set(
    'notes'
  );


  this.loadLessonFeedback(
    lesson.lessonId
  );


  this.showLessonSidebar.set(
    true
  );
}

  // =====================================================
// OPEN LESSON RATING
// =====================================================

openLessonRating(
  lesson: LessonWithProgressDto,
  module: ModuleWithLessonsDto
): void {

  if (module.isLocked) {

    console.warn(
      '🔒 Module is locked'
    );

    return;
  }


  this.selectedLesson.set(
    lesson
  );


  this.selectedModule.set(
    module
  );


  this.lessonSidebarTab.set(
    'rating'
  );


  this.loadLessonFeedback(
    lesson.lessonId
  );


  this.showLessonSidebar.set(
    true
  );
}



// =====================================================
// LOAD LESSON FEEDBACK
// GET /api/LessonFeedback/lesson/{lessonId}
// =====================================================

private loadLessonFeedback(
  lessonId: number
): void {

  const id =
    Number(
      lessonId
    );


  if (
    !id ||
    Number.isNaN(id)
  ) {

    console.warn(
      '⚠️ Invalid lesson ID:',
      lessonId
    );

    return;
  }


  this.lessonFeedbackLoading.set(
    true
  );


  this.api
    .getLessonFeedback(id)
    .subscribe({

      next:
        feedback => {

          console.log(
            '✅ Lesson Feedback:',
            feedback
          );


          this.lessonFeedbackExists.set(
            true
          );


          this.lessonNote.set(
            feedback.note ?? ''
          );


          this.lessonRating.set(
            feedback.rating ?? 0
          );


          this.lessonFeedbackLoading.set(
            false
          );
        },


      error:
        error => {

          console.log(
            'ℹ️ No existing feedback for lesson:',
            id,
            error
          );


          /*
           * 404 means the trainee has not submitted
           * feedback for this lesson yet.
           */

          if (error?.status === 404) {

            this.lessonFeedbackExists.set(
              false
            );


            this.lessonNote.set(
              ''
            );


            this.lessonRating.set(
              0
            );

          } else {

            console.error(
              '❌ Lesson Feedback API Error:',
              error
            );

          }


          this.lessonFeedbackLoading.set(
            false
          );
        }

    });
}



  // =====================================================
  // SWITCH SIDEBAR TAB
  // =====================================================

  switchLessonSidebarTab(
    tab: 'notes' | 'rating'
  ): void {

    this.lessonSidebarTab.set(
      tab
    );
  }


// =====================================================
// CLOSE SIDEBAR
// =====================================================

closeLessonSidebar(): void {

  this.showLessonSidebar.set(
    false
  );


  this.selectedLesson.set(
    null
  );


  this.selectedModule.set(
    null
  );


  this.lessonNote.set(
    ''
  );


  this.lessonRating.set(
    0
  );


  this.lessonFeedbackExists.set(
    false
  );


  this.lessonFeedbackLoading.set(
    false
  );
}

  // =====================================================
  // UPDATE NOTE
  // =====================================================

  updateLessonNote(
    event: Event
  ): void {

    const textarea =
      event.target as HTMLTextAreaElement;


    this.lessonNote.set(
      textarea.value
    );
  }


  // =====================================================
// SAVE NOTE
// =====================================================

saveLessonNote(): void {

  const lesson =
    this.selectedLesson();


  if (!lesson) {
    return;
  }


  const note =
    this.lessonNote().trim();


  const rating =
    this.lessonRating();


  if (!note) {

    this.showNotification(
      'يرجى كتابة ملاحظتك أولاً.',
      'error'
    );

    return;
  }


  const dto = {

    note:
      note,

    rating:
      rating > 0
        ? rating
        : null

  };


  console.log(
    '📝 Saving lesson feedback:',
    {
      lessonId:
        lesson.lessonId,

      dto,

      exists:
        this.lessonFeedbackExists()
    }
  );


  const request =
    this.lessonFeedbackExists()

      ? this.api.updateLessonFeedback(
          lesson.lessonId,
          dto
        )

      : this.api.createLessonFeedback(
          lesson.lessonId,
          dto
        );


  request.subscribe({

    next:
      feedback => {

        console.log(
          '✅ Lesson feedback saved:',
          feedback
        );


        this.lessonFeedbackExists.set(
          true
        );


        this.lessonNote.set(
          feedback.note ?? ''
        );


        this.lessonRating.set(
          feedback.rating ?? 0
        );


        this.showNotification(
          'تم حفظ ملاحظتك بنجاح.',
          'success'
        );


        this.closeLessonSidebar();
      },


    error:
      error => {

        console.error(
          '❌ Save Lesson Feedback Error:',
          error
        );


        if (error?.status === 409) {

          this.showNotification(
            'الملاحظات لهذا الدرس موجودة مسبقًا، يرجى إعادة فتح الدرس.',
            'error'
          );

        } else {

          this.showNotification(
            'تعذر حفظ الملاحظة حاليًا.',
            'error'
          );

        }

      }

  });
}


  // =====================================================
  // SELECT RATING
  // =====================================================

  selectLessonRating(
    rating: number
  ): void {

    this.lessonRating.set(
      rating
    );
  }


 // =====================================================
// SAVE RATING
// =====================================================

saveLessonRating(): void {

  const lesson =
    this.selectedLesson();


  const rating =
    this.lessonRating();


  if (!lesson) {
    return;
  }


  if (!rating) {

    this.showNotification(
      'يرجى اختيار تقييم الدرس.',
      'error'
    );


    return;
  }


  const note =
    this.lessonNote().trim();


  const dto = {

    note:
      note
        ? note
        : null,

    rating:
      rating

  };


  console.log(
    '⭐ Saving lesson rating:',
    {
      lessonId:
        lesson.lessonId,

      dto,

      exists:
        this.lessonFeedbackExists()
    }
  );


  const request =
    this.lessonFeedbackExists()

      ? this.api.updateLessonFeedback(
          lesson.lessonId,
          dto
        )

      : this.api.createLessonFeedback(
          lesson.lessonId,
          dto
        );


  request.subscribe({

    next:
      feedback => {

        console.log(
          '✅ Lesson rating saved:',
          feedback
        );


        this.lessonFeedbackExists.set(
          true
        );


        this.lessonNote.set(
          feedback.note ?? ''
        );


        this.lessonRating.set(
          feedback.rating ?? 0
        );


        this.showNotification(
          'تم إرسال تقييمك بنجاح.',
          'success'
        );


        this.closeLessonSidebar();
      },


    error:
      error => {

        console.error(
          '❌ Save Lesson Rating Error:',
          error
        );


        if (error?.status === 409) {

          this.showNotification(
            'التقييم لهذا الدرس موجود مسبقًا، يرجى إعادة فتح الدرس.',
            'error'
          );

        } else {

          this.showNotification(
            'تعذر حفظ التقييم حاليًا.',
            'error'
          );

        }

      }

  });
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

        next:
          response => {

            console.log(
              '✅ Achievement marked:',
              response
            );


            this.loadProgramData(
              programId
            );
          },


        error:
          error => {

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


    const userData =
      localStorage.getItem(
        'userData'
      );


    if (userData) {

      try {

        const user =
          JSON.parse(
            userData
          );


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

