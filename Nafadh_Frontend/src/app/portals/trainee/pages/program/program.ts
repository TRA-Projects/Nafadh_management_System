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

import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

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
  private sanitizer = inject(DomSanitizer);


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
  // LESSON SIDEBAR / VIEWER
  // =====================================================

  showLessonSidebar =
    signal(false);

  lessonViewerVisible =
    signal(false);

  lessonViewerUrl =
    signal<SafeUrl | null>(null);

  lessonViewerTitle =
    signal('');

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

  /*
   * Indicates that the currently opened lesson video
   * has been watched until the end.
   *
   * Notes are available immediately after opening
   * the video, while rating is available only after
   * the video ends.
   */
  lessonVideoCompleted =
    signal(false);

  lessonFeedbackExists =
    signal(false);

  lessonFeedbackLoading =
    signal(false);


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
  // LOAD BATCH SESSIONS
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
  // TRAINING MATERIAL HELPERS
  // =====================================================

  private isVideoMaterial(
    material: TrainingMaterialDto
  ): boolean {

    const fileUrl =
      String(
        material.fileUrl ?? ''
      )
        .split('?')[0]
        .toLowerCase();

    return /\.(mp4|webm|mov|m4v|ogg)$/i.test(
      fileUrl
    );
  }


  private findVideoMaterial(
    materials: TrainingMaterialDto[]
  ): TrainingMaterialDto | null {

    const videos =
      materials.filter(
        material =>
          this.isVideoMaterial(
            material
          )
      );


    if (
      videos.length === 0
    ) {

      return null;
    }


    /*
     * If there is more than one video,
     * use the latest uploaded video.
     */
    return videos.sort(
      (a, b) =>
        new Date(
          b.uploadDate
        ).getTime()
        -
        new Date(
          a.uploadDate
        ).getTime()
    )[0];
  }


  // =====================================================
  // VIEW LESSON
  // OPEN VIDEO INSIDE SAME PAGE
  // =====================================================

  viewLesson(
    lesson: LessonWithProgressDto,
    module: ModuleWithLessonsDto
  ): void {

    if (module.isLocked) {

      this.showNotification(
        'هذه الوحدة مقفلة حاليًا.',
        'error'
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

      this.showNotification(
        'معرف الدرس غير صالح.',
        'error'
      );

      return;
    }


    this.selectedLesson.set(
      lesson
    );


    this.selectedModule.set(
      module
    );


    this.lessonViewerTitle.set(
      lesson.title || 'الدرس'
    );


    this.lessonViewerVisible.set(
      false
    );


    this.lessonViewerUrl.set(
      null
    );


    /*
     * Every time a new lesson is opened,
     * its video completion state starts as false.
     */
    this.lessonVideoCompleted.set(
      false
    );


    this.lessonSidebarTab.set(
      'notes'
    );


    /*
     * Get the actual training materials
     * uploaded for this lesson.
     */
    this.api
      .getTrainingMaterials(lessonId)
      .subscribe({

        next:
          materials => {

            console.log(
              '✅ Lesson Training Materials:',
              materials
            );


            this.lessonMaterials.update(
              current => ({

                ...current,

                [lessonId]:
                  materials ?? []

              })
            );


            if (
              !materials ||
              materials.length === 0
            ) {

              this.showNotification(
                'لا توجد مواد تدريبية لهذا الدرس حاليًا.',
                'error'
              );

              return;
            }


            /*
             * Find the real video based on
             * the file extension.
             *
             * We intentionally do NOT rely on
             * fileType because some existing records
             * have incorrect fileType values.
             */
            const videoMaterial =
              this.findVideoMaterial(
                materials
              );


            if (
              !videoMaterial ||
              !videoMaterial.fileUrl
            ) {

              console.warn(
                '⚠️ No video material found:',
                materials
              );


              this.showNotification(
                'لا يوجد فيديو مرفوع لهذا الدرس حاليًا.',
                'error'
              );

              return;
            }


            const videoUrl =
              this.api.getFileUrl(
                videoMaterial.fileUrl
              );


            if (!videoUrl) {

              this.showNotification(
                'رابط فيديو الدرس غير متوفر حاليًا.',
                'error'
              );

              return;
            }


            console.log(
              '🎥 Video Material:',
              videoMaterial
            );


            console.log(
              '🎬 Video URL:',
              videoUrl
            );


            this.openLessonViewer(
              videoUrl,
              lesson
            );

          },


        error:
          error => {

            console.error(
              '❌ Training Material API Error:',
              error
            );


            this.showNotification(
              'تعذر تحميل فيديو الدرس حاليًا.',
              'error'
            );

          }

      });
  }


  // =====================================================
  // OPEN LESSON VIEWER
  // SAME PAGE
  // =====================================================

  private openLessonViewer(
    url: string,
    lesson: LessonWithProgressDto
  ): void {

    if (!url) {

      this.showNotification(
        'رابط الدرس غير متوفر حاليًا.',
        'error'
      );

      return;
    }


    console.log(
      '🎬 Opening lesson video inside same page:',
      url
    );


    this.selectedLesson.set(
      lesson
    );


    this.lessonViewerTitle.set(
      lesson.title || 'الدرس'
    );


    /*
     * Video uses a normal URL context,
     * not an iframe ResourceUrl context.
     */
    this.lessonViewerUrl.set(
      this.sanitizer.bypassSecurityTrustUrl(
        url
      )
    );


    /*
     * The video has just been opened.
     *
     * Notes are available immediately,
     * but rating will remain unavailable
     * until the video fires the "ended" event.
     */
    this.lessonVideoCompleted.set(
      false
    );


    this.lessonViewerVisible.set(
      true
    );


    this.lessonSidebarTab.set(
      'notes'
    );


    this.showLessonSidebar.set(
      true
    );

  }


  // =====================================================
  // VIDEO ENDED
  // ENABLE RATING AFTER FULL VIDEO WATCH
  // =====================================================

  onLessonVideoEnded(): void {

    const lesson =
      this.selectedLesson();


    if (!lesson) {
      return;
    }


    console.log(
      '🎬 Lesson video completed:',
      lesson.lessonId
    );


    /*
     * Mark the video as fully watched.
     */
    this.lessonVideoCompleted.set(
      true
    );


    /*
     * Mark the lesson as viewed/completed
     * only after the video reaches the end.
     */
    this.markLessonAsViewed(
      lesson.lessonId
    );


    this.showNotification(
      'تمت مشاهدة الدرس بالكامل، يمكنك الآن تقييم الدرس.',
      'success'
    );
  }


  // =====================================================
  // MARK LESSON AS VIEWED
  // FRONTEND ONLY
  // =====================================================

  private markLessonAsViewed(
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
      return;
    }


    this.modules.update(
      modules =>
        modules.map(
          module => ({

            ...module,

            lessons:
              module.lessons?.map(
                lesson =>

                  Number(lesson.lessonId) === id

                    ? {
                        ...lesson,
                        progressPercentage: 100
                      }

                    : lesson

              )

          })
        )
    );


    this.calculateStats();


    console.log(
      '✅ Lesson marked as viewed:',
      id
    );
  }


  // =====================================================
  // TRAINING MATERIALS
  // =====================================================

  downloadLessonMaterials(
    lesson: LessonWithProgressDto,
    module: ModuleWithLessonsDto
  ): void {

    if (module.isLocked) {

      console.warn(
        '🔒 Module is locked'
      );

      this.showNotification(
        'هذا المحتوى غير متاح حاليًا.',
        'error'
      );

      return;
    }


    /*
     * Lesson must be watched first.
     */
    if (
      lesson.progressPercentage !== 100
    ) {

      this.showNotification(
        'يجب مشاهدة الدرس أولاً قبل تحميل المواد.',
        'error'
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

      this.showNotification(
        'تعذر تحديد الدرس.',
        'error'
      );

      return;
    }


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

              this.showNotification(
                'لا توجد مواد تدريبية متاحة لهذا الدرس.',
                'error'
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


            /*
             * Video is for viewing only.
             *
             * Download only non-video materials
             * such as PDF, Word, images, etc.
             */
            const downloadableMaterials =
              materials.filter(
                material =>
                  !this.isVideoMaterial(
                    material
                  )
              );


            if (
              downloadableMaterials.length === 0
            ) {

              this.showNotification(
                'لا توجد ملفات قابلة للتحميل لهذا الدرس.',
                'error'
              );

              return;
            }


            downloadableMaterials.forEach(
              material => {

                const materialId =
                  Number(
                    material.materialId
                  );


                if (
                  !materialId ||
                  Number.isNaN(materialId)
                ) {

                  console.warn(
                    '⚠️ Invalid material ID:',
                    material
                  );

                  return;
                }


                this.api
                  .getTrainingMaterialDownloadUrl(
                    materialId
                  )
                  .subscribe({

                    next:
                      response => {

                        const rawDownloadUrl =
                          response?.DownloadUrl;


                        if (
                          !rawDownloadUrl
                        ) {

                          this.showNotification(
                            'رابط تحميل المادة غير متوفر.',
                            'error'
                          );

                          return;
                        }


                        const downloadUrl =
                          this.api.getFileUrl(
                            rawDownloadUrl
                          );


                        if (!downloadUrl) {

                          this.showNotification(
                            'رابط تحميل المادة غير صالح.',
                            'error'
                          );

                          return;
                        }


                        console.log(
                          '⬇️ Download URL:',
                          downloadUrl
                        );


                        window.open(
                          downloadUrl,
                          '_blank',
                          'noopener,noreferrer'
                        );

                      },


                    error:
                      error => {

                        console.error(
                          '❌ Download URL API Error:',
                          error
                        );


                        this.showNotification(
                          'تعذر تحميل المادة التدريبية.',
                          'error'
                        );

                      }

                  });

              });

          },


        error:
          error => {

            console.error(
              '❌ Training Material API Error:',
              error
            );


            this.showNotification(
              'تعذر تحميل مواد الدرس حاليًا.',
              'error'
            );

          }

      });
  }


  // =====================================================
  // OPEN LESSON NOTES
  // NOTES ARE AVAILABLE IMMEDIATELY AFTER
  // OPENING THE VIDEO
  // =====================================================

  openLessonNotes(
    lesson: LessonWithProgressDto,
    module: ModuleWithLessonsDto
  ): void {

    if (module.isLocked) {

      this.showNotification(
        'هذه الوحدة مقفلة حاليًا.',
        'error'
      );

      return;
    }


    /*
     * Notes do not require the video to be completed.
     * They are available once the lesson has been opened.
     */
    this.selectedLesson.set(
      lesson
    );


    this.selectedModule.set(
      module
    );


    this.lessonSidebarTab.set(
      'notes'
    );


    this.lessonViewerVisible.set(
      false
    );


    this.lessonViewerUrl.set(
      null
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
  // RATING IS AVAILABLE ONLY AFTER VIDEO ENDS
  // =====================================================

  openLessonRating(
    lesson: LessonWithProgressDto,
    module: ModuleWithLessonsDto
  ): void {

    if (module.isLocked) {

      this.showNotification(
        'هذه الوحدة مقفلة حاليًا.',
        'error'
      );

      return;
    }


    /*
     * Rating is only available after the
     * current video has been watched until the end.
     */
    if (
      !this.lessonVideoCompleted()
    ) {

      this.showNotification(
        'يجب إكمال مشاهدة الفيديو أولاً قبل تقييم الدرس.',
        'error'
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


    this.lessonViewerVisible.set(
      false
    );


    this.lessonViewerUrl.set(
      null
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
              id
            );


            if (
              error?.status === 404
            ) {

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

    const lesson =
      this.selectedLesson();


    if (!lesson) {
      return;
    }


    /*
     * Notes are available immediately.
     *
     * Rating requires the video to have
     * reached the end.
     */
    if (
      tab === 'rating' &&
      !this.lessonVideoCompleted()
    ) {

      this.showNotification(
        'يجب إكمال مشاهدة الفيديو أولاً قبل تقييم الدرس.',
        'error'
      );

      return;
    }


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


    this.lessonViewerVisible.set(
      false
    );


    this.lessonViewerUrl.set(
      null
    );


    this.lessonViewerTitle.set(
      ''
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


    this.lessonVideoCompleted.set(
      false
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
  // NOTES CAN BE SAVED IMMEDIATELY
  // AFTER OPENING THE LESSON
  // =====================================================

  saveLessonNote(): void {

    const lesson =
      this.selectedLesson();


    if (!lesson) {
      return;
    }


    /*
     * No video completion check here.
     * Notes can be saved immediately after
     * opening the lesson.
     */
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


          if (
            error?.status === 409
          ) {

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

    const lesson =
      this.selectedLesson();


    /*
     * Extra protection:
     * Do not allow rating selection before
     * the video has ended.
     */
    if (
      lesson &&
      !this.lessonVideoCompleted()
    ) {

      this.showNotification(
        'يجب إكمال مشاهدة الفيديو أولاً قبل تقييم الدرس.',
        'error'
      );

      return;
    }


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


    /*
     * Rating can only be saved after
     * the video has completely ended.
     */
    if (
      !this.lessonVideoCompleted()
    ) {

      this.showNotification(
        'يجب إكمال مشاهدة الفيديو أولاً قبل تقييم الدرس.',
        'error'
      );

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


          if (
            error?.status === 409
          ) {

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