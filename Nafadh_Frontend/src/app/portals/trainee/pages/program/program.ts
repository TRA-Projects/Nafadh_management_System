
import { NafadhConstantsService } from '../../../../core/services/nafadh-constants.service';
import { moduleProgressKey } from '../../../../core/models/administrative-constants';
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
  templateUrl: './program.html',
  styleUrl: './program.scss',
})
export class TraineeProgram implements OnInit {

  // =====================================================
  // INJECT
  // =====================================================

  private api = inject(TraineeApi);
  readonly constants = inject(NafadhConstantsService);
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
  // TOAST NOTIFICATION
  // =====================================================

  notificationMessage = signal('');
  notificationType = signal<'success' | 'error'>('success');
  notificationVisible = signal(false);

  private notificationTimer?: ReturnType<typeof setTimeout>;

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
  // LESSON SIDEBAR / VIEWER
  // =====================================================

  showLessonSidebar = signal(false);
  lessonViewerVisible = signal(false);
  lessonViewerUrl = signal<SafeUrl | null>(null);
  lessonViewerTitle = signal('');

  selectedLesson = signal<LessonWithProgressDto | null>(null);
  selectedModule = signal<ModuleWithLessonsDto | null>(null);

  lessonSidebarTab = signal<'notes' | 'rating'>('notes');
  lessonNote = signal('');
  lessonRating = signal(0);
  lessonVideoCompleted = signal(false);

  ratingTooltipLessonId = signal<number | null>(null);
  private ratingTooltipTimer?: ReturnType<typeof setTimeout>;

  lessonFeedbackExists = signal(false);
  lessonFeedbackLoading = signal(false);

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    this.constants.ensure('NFD_MOD_STAT');
    console.log('🎓 Trainee Program Page');
    this.loadCurrentTrainee();
  }

  // =====================================================
  // SHOW NOTIFICATION
  // =====================================================

  showNotification(
    message: string,
    type: 'success' | 'error' = 'success'
  ): void {
    this.notificationMessage.set(message);
    this.notificationType.set(type);
    this.notificationVisible.set(true);

    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
    }

    this.notificationTimer = setTimeout(() => {
      this.notificationVisible.set(false);
    }, 7000);
  }

  private showRatingTooltip(lessonId: number): void {
    this.ratingTooltipLessonId.set(Number(lessonId));

    if (this.ratingTooltipTimer) {
      clearTimeout(this.ratingTooltipTimer);
    }

    this.ratingTooltipTimer = setTimeout(() => {
      this.ratingTooltipLessonId.set(null);
    }, 3000);
  }

  // =====================================================
  // LOAD CURRENT TRAINEE
  // =====================================================

  private loadCurrentTrainee(): void {
    const session = this.auth.session?.();

    let currentUserId: number | null = null;

    if (session?.userId) {
      currentUserId = Number(session.userId);
    } else {
      currentUserId = this.getUserIdFromStorage();
    }

    if (!currentUserId || Number.isNaN(currentUserId)) {
      this.error.set('يرجى تسجيل الدخول أولاً.');
      this.loading.set(false);
      return;
    }

    this.userId.set(currentUserId);
    this.loadTrainee(currentUserId);
  }

  // =====================================================
  // LOAD TRAINEE
  // =====================================================

  private loadTrainee(userId: number): void {
    this.api.getTrainee(userId).subscribe({
      next: (trainee: TraineeProfileDto) => {
        this.traineeData.set(trainee);

        const id = Number(trainee.traineeId);

        if (!id || Number.isNaN(id)) {
          this.error.set('لم يتم العثور على معرف المتدرب.');
          this.loading.set(false);
          return;
        }

        this.traineeId.set(id);
        this.loadEnrollment(id);
      },

      error: error => {
        console.error('Trainee API Error:', error);
        this.error.set('تعذر تحميل بيانات المتدرب.');
        this.loading.set(false);
      }
    });
  }

  // =====================================================
  // LOAD ENROLLMENT
  // =====================================================

  private loadEnrollment(traineeId: number): void {
    console.log('Loading enrollments for trainee:', traineeId);

    this.api.getEnrollmentsByTrainee(traineeId).subscribe({
      next: (enrollments: EnrollmentDto[]) => {
        if (!enrollments || enrollments.length === 0) {
          this.error.set('لا توجد تسجيلات للمتدرب.');
          this.loading.set(false);
          return;
        }

        const activeEnrollment =
          enrollments.find(e => {
            const status = String(
              e.completionStatus ?? ''
            ).toLowerCase();

            return status === 'active' || status === 'inprogress';
          }) ?? enrollments[0];

        this.enrollment.set(activeEnrollment);
        this.enrollmentId.set(
          Number(activeEnrollment.enrollmentId)
        );

        const batchId = Number(activeEnrollment.batchId);
        this.batchId.set(batchId);

        this.loadBatchSessions(batchId);
        this.loadBatchAndProgram(batchId);
      },

      error: error => {
        console.error('Enrollment API Error:', error);
        this.error.set('تعذر تحميل تسجيل المتدرب.');
        this.loading.set(false);
      }
    });
  }

  // =====================================================
  // LOAD BATCH
  // =====================================================

  private loadBatchAndProgram(batchId: number): void {
    if (!batchId || Number.isNaN(batchId)) {
      this.error.set('لم يتم العثور على الدفعة.');
      this.loading.set(false);
      return;
    }

    this.api.getBatch(batchId).subscribe({
      next: batch => {
        const programId = Number(batch.programId);

        if (!programId || Number.isNaN(programId)) {
          this.error.set(
            'لم يتم العثور على البرنامج المرتبط بالدفعة.'
          );
          this.loading.set(false);
          return;
        }

        this.programId.set(programId);
        this.loadProgramData(programId);
      },

      error: error => {
        console.error('Batch API Error:', error);
        this.error.set('تعذر تحميل بيانات الدفعة.');
        this.loading.set(false);
      }
    });
  }

  // =====================================================
  // LOAD PROGRAM
  // =====================================================

  loadProgramData(programId?: number): void {
    const id = programId ?? this.programId();

    if (!id || Number.isNaN(Number(id))) {
      this.error.set('لم يتم العثور على معرف البرنامج.');
      this.loading.set(false);
      return;
    }

    this.programId.set(Number(id));

    this.api.getProgram(Number(id)).subscribe({
      next: program => {
        this.program.set(program);
        this.loadModules();
      },

      error: error => {
        console.error('Program API Error:', error);
        this.error.set('تعذر تحميل بيانات البرنامج.');
        this.loading.set(false);
      }
    });
  }

  // =====================================================
  // LOAD MODULES
  // =====================================================

  private loadModules(): void {
    const programId = this.programId();

    if (!programId) {
      this.loading.set(false);
      return;
    }

    this.api.getProgramModules(programId).subscribe({
      next: (modules: ModuleDto[]) => {
        if (!modules || modules.length === 0) {
          this.modules.set([]);
          this.loadModuleProgress();
          return;
        }

        this.loadModuleLessons(modules);
      },

      error: error => {
        console.error('Modules API Error:', error);
        this.modules.set([]);
        this.loadModuleProgress();
      }
    });
  }

  // =====================================================
  // LOAD LESSONS
  // =====================================================

  private loadModuleLessons(modules: ModuleDto[]): void {
    if (!modules.length) {
      this.modules.set([]);
      this.loadModuleProgress();
      return;
    }

    const requests = modules.map(module =>
      this.api.getModuleLessons(module.moduleId)
    );

    import('rxjs').then(({ forkJoin }) => {
      forkJoin(requests).subscribe({
        next: lessonsData => {
          const result: ModuleWithLessonsDto[] =
            modules.map((module, index) => ({
              ...module,
              progressPercentage: 0,
              prerequisitePassed: true,
              isLocked: false,
              lessons: (lessonsData[index] ?? []).map(lesson => ({
                ...lesson,
                progressPercentage: 0
              }))
            }));

          this.modules.set(result);
          this.loadModuleProgress();
        },

        error: error => {
          console.error('Lessons API Error:', error);

          this.modules.set(
            modules.map(module => ({
              ...module,
              progressPercentage: 0,
              prerequisitePassed: true,
              isLocked: false,
              lessons: []
            }))
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
    const traineeId = this.traineeId();

    if (!traineeId) {
      this.calculateStats();
      this.loading.set(false);
      return;
    }

    this.api.getModuleProgress(traineeId).subscribe({
      next: (progressData: TraineeModuleProgressDto[]) => {
        this.moduleProgress.set(progressData ?? []);
        this.updateModulesWithProgress(progressData ?? []);
        this.loadEnrollmentProgress();
      },

      error: error => {
        console.error('Module Progress API Error:', error);
        this.moduleProgress.set([]);
        this.calculateStats();
        this.loading.set(false);
      }
    });
  }

  // =====================================================
  // UPDATE MODULES WITH PROGRESS
  // =====================================================

  private updateModulesWithProgress(
    progressData: TraineeModuleProgressDto[]
  ): void {
    const updatedModules = this.modules().map(module => {
      const progress = progressData.find(
        p => Number(p.moduleId) === Number(module.moduleId)
      );

      let percentage = 0;

      if (progress) {
        const status = moduleProgressKey(progress.status);

        if (status === 'Completed') {
          percentage = 100;
        } else if (status === 'InProgress') {
          percentage = 50;
        }
      }

      const lessons = module.lessons ?? [];

      const completedCount =
        percentage === 100
          ? lessons.length
          : percentage > 0
            ? Math.round((percentage / 100) * lessons.length)
            : 0;

      const updatedLessons = lessons.map((lesson, index) => ({
        ...lesson,
        progressPercentage: index < completedCount ? 100 : 0
      }));

      return {
        ...module,
        progressPercentage: percentage,
        lessons: updatedLessons
      };
    });

    this.modules.set(this.restoreLocallyCompletedLessons(updatedModules));
  }

  // =====================================================
  // LOAD ENROLLMENT PROGRESS
  // =====================================================

  private loadEnrollmentProgress(): void {
    const enrollmentId = this.enrollmentId();

    if (!enrollmentId) {
      this.calculateStats();
      this.loading.set(false);
      return;
    }

    this.api.getEnrollmentProgress(enrollmentId).subscribe({
      next: progress => {
        this.progress.set(progress);
        this.calculateStats();
        this.loading.set(false);
      },

      error: error => {
        console.error('Enrollment Progress API Error:', error);
        this.calculateStats();
        this.loading.set(false);
      }
    });
  }

  // =====================================================
  // CALCULATE STATISTICS
  // =====================================================

  private calculateStats(): void {
    const modules = this.modules();

    const totalModules = modules.length;

    const completedModules = modules.filter(
      m => m.progressPercentage === 100
    ).length;

    const totalLessons = modules.reduce(
      (sum, module) => sum + (module.lessons?.length ?? 0),
      0
    );

    const completedLessons = modules.reduce(
      (sum, module) =>
        sum +
        (module.lessons?.filter(
          lesson => lesson.progressPercentage === 100
        ).length ?? 0),
      0
    );

    const summary = this.progress();

    const overallProgress = summary
      ? Number(summary.progressPercentage ?? 0)
      : totalModules > 0
        ? Math.round((completedModules / totalModules) * 100)
        : 0;

    this.stats.set({
      totalModules,
      completedModules,
      totalLessons,
      completedLessons,
      overallProgress,
      totalDays: this.calculateTotalDays(),
      totalAssignments: this.calculateTotalAssignments(),
      experienceYears: this.calculateExperienceYears(overallProgress)
    });
  }

  private calculateTotalDays(): number {
    const durationHours = Number(
      this.program()?.durationHours ?? 0
    );

    return durationHours > 0
      ? Math.ceil(durationHours / 8)
      : this.modules().length * 2;
  }

  private calculateTotalAssignments(): number {
    return this.modules().reduce(
      (sum, module) => sum + (module.lessons?.length ?? 0),
      0
    );
  }

  private calculateExperienceYears(progress: number): number {
    if (progress >= 100) return 10;
    if (progress >= 75) return 7;
    if (progress >= 50) return 5;
    if (progress >= 25) return 3;
    return 1;
  }

  // =====================================================
  // LOAD BATCH SESSIONS
  // =====================================================

  private loadBatchSessions(batchId: number): void {
    if (!batchId || Number.isNaN(batchId)) return;

    this.api.getSessionsByBatch(batchId).subscribe({
      next: sessions => {
        this.sessions.set(sessions ?? []);
      },

      error: error => {
        console.error('Sessions API Error:', error);
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
    const rawType = material.fileType as string | number;

    if (
      rawType === 1 ||
      String(rawType).toLowerCase() === 'video'
    ) {
      return true;
    }

    const fileUrl = String(material.fileUrl ?? '')
      .split('?')[0]
      .split('#')[0]
      .toLowerCase();

    return /\.(mp4|webm|mov|m4v|ogg)$/i.test(fileUrl);
  }

  private findVideoMaterial(
    materials: TrainingMaterialDto[]
  ): TrainingMaterialDto | null {
    const videos = materials.filter(material =>
      this.isVideoMaterial(material)
    );

    if (!videos.length) return null;

    return [...videos].sort(
      (a, b) =>
        new Date(b.uploadDate).getTime() -
        new Date(a.uploadDate).getTime()
    )[0];
  }

  // =====================================================
  // VIEW LESSON
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

    const lessonId = Number(lesson.lessonId);

    if (!lessonId || Number.isNaN(lessonId)) {
      this.showNotification('معرف الدرس غير صالح.', 'error');
      return;
    }

    this.selectedLesson.set(lesson);
    this.selectedModule.set(module);
    this.lessonViewerTitle.set(lesson.title || 'الدرس');
    this.lessonViewerVisible.set(false);
    this.lessonViewerUrl.set(null);

    this.lessonVideoCompleted.set(
      lesson.progressPercentage === 100
    );
    this.lessonSidebarTab.set('notes');
    this.lessonNote.set('');
    this.lessonRating.set(0);
    this.lessonFeedbackExists.set(false);

    this.loadLessonFeedback(lessonId);

    this.api.getTrainingMaterials(lessonId).subscribe({
      next: (materials: TrainingMaterialDto[]) => {
        if (
          Number(this.selectedLesson()?.lessonId) !== lessonId
        ) {
          return;
        }

        this.lessonMaterials.update(current => ({
          ...current,
          [lessonId]: materials ?? []
        }));

        if (!materials || materials.length === 0) {
          this.showNotification(
            'لا توجد مواد تدريبية لهذا الدرس حاليًا.',
            'error'
          );
          return;
        }

        const videoMaterial = this.findVideoMaterial(materials);

        if (!videoMaterial?.fileUrl) {
          this.showNotification(
            'لا يوجد فيديو مرفوع لهذا الدرس حاليًا.',
            'error'
          );
          return;
        }

        const videoUrl = this.api.getFileUrl(
          videoMaterial.fileUrl
        );

        if (!videoUrl) {
          this.showNotification(
            'رابط فيديو الدرس غير متوفر حاليًا.',
            'error'
          );
          return;
        }

        this.openLessonViewer(videoUrl, lesson);
      },

      error: error => {
        console.error('Training Material API Error:', error);
        this.showNotification(
          'تعذر تحميل فيديو الدرس حاليًا.',
          'error'
        );
      }
    });
  }

  // =====================================================
  // OPEN LESSON VIEWER
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

    this.selectedLesson.set(lesson);
    this.lessonViewerTitle.set(lesson.title || 'الدرس');

    this.lessonViewerUrl.set(
      this.sanitizer.bypassSecurityTrustUrl(url)
    );

    this.lessonVideoCompleted.set(
      lesson.progressPercentage === 100
    );
    this.lessonViewerVisible.set(true);
    this.lessonSidebarTab.set('notes');
    this.showLessonSidebar.set(true);
  }

  // =====================================================
  // VIDEO ENDED
  // =====================================================

  onLessonVideoEnded(): void {
    const lesson = this.selectedLesson();

    if (!lesson) return;

    this.lessonVideoCompleted.set(true);
    this.markLessonAsViewed(lesson.lessonId);

    this.showNotification(
      'تمت مشاهدة الدرس بالكامل، يمكنك الآن تقييم الدرس.',
      'success'
    );
  }

  // =====================================================
  // MARK LESSON AS VIEWED
  // =====================================================

  private markLessonAsViewed(lessonId: number): void {
    const id = Number(lessonId);

    if (!id || Number.isNaN(id)) return;

    this.saveLocallyCompletedLesson(id);

    this.modules.update(modules =>
      modules.map(module => ({
        ...module,
        lessons: module.lessons?.map(lesson =>
          Number(lesson.lessonId) === id
            ? {
                ...lesson,
                progressPercentage: 100
              }
            : lesson
        )
      }))
    );

    const selectedLesson = this.selectedLesson();

    if (
      selectedLesson &&
      Number(selectedLesson.lessonId) === id
    ) {
      this.selectedLesson.set({
        ...selectedLesson,
        progressPercentage: 100
      });
    }

    this.calculateStats();
  }

  // =====================================================
  // DOWNLOAD LESSON VIDEO
  // =====================================================

  downloadLessonMaterials(
    lesson: LessonWithProgressDto,
    module: ModuleWithLessonsDto
  ): void {
    if (module.isLocked) {
      this.showNotification(
        'هذا المحتوى غير متاح حاليًا.',
        'error'
      );
      return;
    }

    if (lesson.progressPercentage !== 100) {
      this.showNotification(
        'يجب مشاهدة الدرس أولاً قبل تحميل الفيديو.',
        'error'
      );
      return;
    }

    const lessonId = Number(lesson.lessonId);

    if (!lessonId || Number.isNaN(lessonId)) {
      this.showNotification('تعذر تحديد الدرس.', 'error');
      return;
    }

    this.api.getTrainingMaterials(lessonId).subscribe({
      next: (materials: TrainingMaterialDto[]) => {
        if (!materials || materials.length === 0) {
          this.showNotification(
            'لا يوجد فيديو متاح لهذا الدرس.',
            'error'
          );
          return;
        }

        this.lessonMaterials.update(current => ({
          ...current,
          [lessonId]: materials
        }));

        const videoMaterial = this.findVideoMaterial(materials);

        if (!videoMaterial) {
          this.showNotification(
            'لا يوجد فيديو متاح للتحميل.',
            'error'
          );
          return;
        }

        const materialId = Number(videoMaterial.materialId);

        if (!materialId || Number.isNaN(materialId)) {
          this.showNotification(
            'معرف المادة التدريبية غير صالح.',
            'error'
          );
          return;
        }

        this.api.getTrainingMaterialDownloadUrl(materialId).subscribe({
          next: (response: {
            DownloadUrl?: string;
            downloadUrl?: string;
          }) => {
            const downloadUrl =
              response?.downloadUrl ?? response?.DownloadUrl;

            if (!downloadUrl) {
              this.showNotification(
                'رابط تحميل المادة التدريبية غير متوفر.',
                'error'
              );
              return;
            }

            const fullUrl = this.api.getFileUrl(downloadUrl);

            window.open(fullUrl, '_blank');
          },

          error: (error: unknown) => {
            console.error(
              'Training material download failed:',
              error
            );

            this.showNotification(
              'حدث خطأ أثناء تحميل المادة التدريبية.',
              'error'
            );
          }
        });
      },

      error: (error: unknown) => {
        console.error(
          'Lesson materials loading failed:',
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

    this.selectedLesson.set(lesson);
    this.selectedModule.set(module);
    this.lessonSidebarTab.set('notes');
    this.lessonViewerVisible.set(false);
    this.lessonViewerUrl.set(null);

    this.lessonVideoCompleted.set(
      lesson.progressPercentage === 100
    );
    this.lessonNote.set('');
    this.lessonRating.set(0);
    this.lessonFeedbackExists.set(false);

    this.loadLessonFeedback(lesson.lessonId);
    this.showLessonSidebar.set(true);
  }

  // =====================================================
  // OPEN LESSON RATING
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

    const completed =
      this.lessonVideoCompleted() ||
      lesson.progressPercentage === 100;

    if (!completed) {
      this.showRatingTooltip(lesson.lessonId);
      return;
    }

    this.ratingTooltipLessonId.set(null);
    this.selectedLesson.set(lesson);
    this.selectedModule.set(module);
    this.lessonVideoCompleted.set(true);
    this.lessonSidebarTab.set('rating');
    this.lessonViewerVisible.set(false);
    this.lessonViewerUrl.set(null);

    this.lessonNote.set('');
    this.lessonRating.set(0);
    this.lessonFeedbackExists.set(false);

    this.loadLessonFeedback(lesson.lessonId);
    this.showLessonSidebar.set(true);
  }

  // =====================================================
  // LOAD LESSON FEEDBACK
  // =====================================================

  private loadLessonFeedback(lessonId: number): void {
    const id = Number(lessonId);

    if (!id || Number.isNaN(id)) return;

    this.lessonFeedbackLoading.set(true);

    this.api.getLessonFeedback(id).subscribe({
      next: feedback => {
        if (
          Number(this.selectedLesson()?.lessonId) !== id
        ) {
          return;
        }

        this.lessonFeedbackExists.set(true);
        this.lessonNote.set(feedback.note ?? '');
        this.lessonRating.set(Number(feedback.rating ?? 0));
        this.lessonFeedbackLoading.set(false);
      },

      error: error => {
        if (
          Number(this.selectedLesson()?.lessonId) !== id
        ) {
          return;
        }

        if (error?.status === 404) {
          this.lessonFeedbackExists.set(false);
          this.lessonNote.set('');
          this.lessonRating.set(0);
        } else {
          console.error('Lesson Feedback API Error:', error);
        }

        this.lessonFeedbackLoading.set(false);
      }
    });
  }

  // =====================================================
  // SWITCH SIDEBAR TAB
  // =====================================================

  switchLessonSidebarTab(
    tab: 'notes' | 'rating'
  ): void {
    const lesson = this.selectedLesson();

    if (!lesson) return;

    const completed =
      this.lessonVideoCompleted() ||
      lesson.progressPercentage === 100;

    if (tab === 'rating' && !completed) {
      this.showNotification(
        'يجب إكمال مشاهدة الفيديو أولاً قبل تقييم الدرس.',
        'error'
      );
      return;
    }

    this.lessonSidebarTab.set(tab);
  }

  // =====================================================
  // CLOSE SIDEBAR
  // =====================================================

  closeLessonSidebar(): void {
    this.showLessonSidebar.set(false);
    this.lessonViewerVisible.set(false);
    this.lessonViewerUrl.set(null);
    this.lessonViewerTitle.set('');
    this.selectedLesson.set(null);
    this.selectedModule.set(null);
    this.lessonNote.set('');
    this.lessonRating.set(0);
    this.lessonVideoCompleted.set(false);
    this.lessonFeedbackExists.set(false);
    this.lessonFeedbackLoading.set(false);
  }

  // =====================================================
  // UPDATE NOTE
  // =====================================================

  updateLessonNote(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.lessonNote.set(textarea.value);
  }

  // =====================================================
  // SAVE NOTE
  // =====================================================

  saveLessonNote(): void {
    const lesson = this.selectedLesson();

    if (!lesson) return;

    const note = this.lessonNote().trim();
    const rating = this.lessonRating();

    if (!note) {
      this.showNotification(
        'يرجى كتابة ملاحظتك أولاً.',
        'error'
      );
      return;
    }

    const dto = {
      note,
      rating: rating > 0 ? rating : null
    };

    const request = this.lessonFeedbackExists()
      ? this.api.updateLessonFeedback(lesson.lessonId, dto)
      : this.api.createLessonFeedback(lesson.lessonId, dto);

    request.subscribe({
      next: feedback => {
        this.lessonFeedbackExists.set(true);
        this.lessonNote.set(feedback.note ?? '');
        this.lessonRating.set(Number(feedback.rating ?? 0));

        this.showNotification(
          'تم حفظ ملاحظتك بنجاح.',
          'success'
        );
      },

      error: error => {
        console.error('Save Lesson Feedback Error:', error);

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

  selectLessonRating(rating: number): void {
    const lesson = this.selectedLesson();

    const completed =
      this.lessonVideoCompleted() ||
      lesson?.progressPercentage === 100;

    if (lesson && !completed) {
      this.showNotification(
        'يجب إكمال مشاهدة الفيديو أولاً قبل تقييم الدرس.',
        'error'
      );
      return;
    }

    this.lessonRating.set(rating);
  }

  // =====================================================
  // SAVE RATING
  // =====================================================

  saveLessonRating(): void {
    const lesson = this.selectedLesson();
    const rating = this.lessonRating();

    if (!lesson) return;

    const completed =
      this.lessonVideoCompleted() ||
      lesson.progressPercentage === 100;

    if (!completed) {
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

    const note = this.lessonNote().trim();

    const dto = {
      note: note || null,
      rating
    };

    const request = this.lessonFeedbackExists()
      ? this.api.updateLessonFeedback(lesson.lessonId, dto)
      : this.api.createLessonFeedback(lesson.lessonId, dto);

    request.subscribe({
      next: feedback => {
        this.lessonFeedbackExists.set(true);
        this.lessonNote.set(feedback.note ?? '');
        this.lessonRating.set(Number(feedback.rating ?? rating));

        this.showNotification(
          'تم إرسال تقييمك بنجاح.',
          'success'
        );

        this.closeLessonSidebar();
      },

      error: error => {
        console.error('Save Lesson Rating Error:', error);

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
  // LOCAL LESSON COMPLETION STORAGE
  // =====================================================

  private getCompletedLessonsStorageKey(): string | null {
    const traineeId = this.traineeId();
    const programId = this.programId();

    if (!traineeId || !programId) {
      return null;
    }

    return `nafadh_completed_lessons_${traineeId}_${programId}`;
  }

  private getLocallyCompletedLessonIds(): number[] {
    const key = this.getCompletedLessonsStorageKey();

    if (!key) return [];

    try {
      const saved = localStorage.getItem(key);

      if (!saved) return [];

      const parsed: unknown = JSON.parse(saved);

      if (!Array.isArray(parsed)) return [];

      return parsed
        .map(value => Number(value))
        .filter(value =>
          Number.isInteger(value) && value > 0
        );
    } catch (error) {
      console.warn(
        'Unable to restore completed lessons:',
        error
      );
      return [];
    }
  }

  private saveLocallyCompletedLesson(lessonId: number): void {
    const key = this.getCompletedLessonsStorageKey();

    if (!key) return;

    try {
      const completedIds = new Set(
        this.getLocallyCompletedLessonIds()
      );

      completedIds.add(Number(lessonId));

      localStorage.setItem(
        key,
        JSON.stringify([...completedIds])
      );
    } catch (error) {
      console.warn(
        'Unable to save completed lesson locally:',
        error
      );
    }
  }

  private restoreLocallyCompletedLessons(
    modules: ModuleWithLessonsDto[]
  ): ModuleWithLessonsDto[] {
    const completedIds = new Set(
      this.getLocallyCompletedLessonIds()
    );

    if (!completedIds.size) {
      return modules;
    }

    return modules.map(module => ({
      ...module,
      lessons: module.lessons?.map(lesson => ({
        ...lesson,
        progressPercentage:
          completedIds.has(Number(lesson.lessonId))
            ? 100
            : lesson.progressPercentage
      }))
    }));
  }

  // =====================================================
  // OPEN MODULE
  // =====================================================

  openModule(module: ModuleWithLessonsDto): void {
    if (module.isLocked) {
      console.warn('Prerequisite not completed');
      return;
    }

    console.log('Module selected:', module.moduleId);
  }

  // =====================================================
  // ACHIEVEMENT
  // =====================================================

  markAchievement(): void {
    const traineeId = this.traineeId();
    const programId = this.programId();

    if (!traineeId || !programId) return;

    this.api.markAchievement(
      traineeId,
      programId
    ).subscribe({
      next: response => {
        console.log('Achievement marked:', response);
        this.loadProgramData(programId);
      },

      error: error => {
        console.error('Achievement Error:', error);
      }
    });
  }

  // =====================================================
  // USER ID FROM STORAGE
  // =====================================================

  private getUserIdFromStorage(): number | null {
    const localUserId = localStorage.getItem('userId');

    if (localUserId) {
      const id = Number(localUserId);

      if (id && !Number.isNaN(id)) {
        return id;
      }
    }

    const sessionUserId = sessionStorage.getItem('userId');

    if (sessionUserId) {
      const id = Number(sessionUserId);

      if (id && !Number.isNaN(id)) {
        return id;
      }
    }

    const userData = localStorage.getItem('userData');

    if (userData) {
      try {
        const user = JSON.parse(userData);
        const id = Number(user.userId ?? user.id);

        if (id && !Number.isNaN(id)) {
          return id;
        }
      } catch {
        console.warn('Invalid userData');
      }
    }

    return null;
  }
}
