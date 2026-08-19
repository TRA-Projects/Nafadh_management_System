import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TraineeApi } from '../../services/trainee-api';
import {
  ProgramDto,
  ModuleDto,
  LessonDto,
  TraineeModuleProgressDto,
  EnrollmentDto,
  ProgressSummaryDto,
  UserResponseDto
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

  // ===================================================
  // IDs
  // ===================================================

  programId: number = 0;
  userId: number = 0;
  traineeId: number = 0;
  enrollmentId: number = 0;

  // ===================================================
  // User Data
  // ===================================================

  user = signal<UserResponseDto | null>(null);

  // ===================================================
  // Main Data
  // ===================================================

  program = signal<ProgramDto | null>(null);
  modules = signal<ModuleWithLessonsDto[]>([]);
  enrollment = signal<EnrollmentDto | null>(null);
  progress = signal<ProgressSummaryDto | null>(null);
  moduleProgress = signal<TraineeModuleProgressDto[]>([]);

  // ===================================================
  // Statistics
  // ===================================================

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

  // ===================================================
  // State
  // ===================================================

  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  // ===================================================
  // Computed
  // ===================================================

  overallProgress = computed(() => this.stats().overallProgress || 0);
  totalModules = computed(() => this.stats().totalModules || 0);
  totalAssignments = computed(() => this.stats().totalAssignments || 0);

  // ===================================================
  // Constructor
  // ===================================================

  constructor(
    private route: ActivatedRoute,
    private traineeApi: TraineeApi
  ) {}

  // ===================================================
  // INIT - جلب بيانات المستخدم من localStorage
  // ===================================================

  ngOnInit(): void {
    // Get user information from localStorage
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        this.user.set(user);
        this.userId = user.userId || user.id || 0;
        this.traineeId = user.traineeId || user.userId || 0;
        
        console.log('✅ User loaded:', {
          userId: this.userId,
          traineeId: this.traineeId,
          fullName: user.fullName,
          email: user.email
        });
      } catch (error) {
        console.error('❌ Error parsing userData:', error);
        this.userId = 0;
        this.traineeId = 0;
      }
    } else {
      console.warn('⚠️ No userData found in localStorage');
    }

    // Get Program ID from route
    this.route.params.subscribe(params => {
      this.programId = +params['id'];
      console.log('📌 Program ID from route:', this.programId);
      
      if (this.programId && this.traineeId) {
        this.loadProgramData();
      } else if (this.programId) {
        this.loadProgramData();
      } else {
        this.error.set('لم يتم العثور على البرنامج');
        this.loading.set(false);
      }
    });
  }

  // ===================================================
  // LOAD PROGRAM DATA
  // ===================================================

  loadProgramData(): void {
    this.loading.set(true);
    this.error.set(null);

    console.log('🔄 Loading program data for:', {
      programId: this.programId,
      traineeId: this.traineeId,
      userId: this.userId
    });

    // 1. Get Program Details
    this.traineeApi.getProgram(this.programId).subscribe({
      next: (programData: ProgramDto) => {
        this.program.set(programData);
        console.log('✅ Program loaded:', programData.title);

        // 2. Get Program Modules
        this.traineeApi.getProgramModules(this.programId).subscribe({
          next: (modulesData: ModuleDto[]) => {
            console.log('✅ Modules loaded:', modulesData.length);
            
            // 3. Get Lessons for each module
            const moduleRequests = modulesData.map(module =>
              this.traineeApi.getModuleLessons(module.moduleId)
            );

            if (moduleRequests.length === 0) {
              this.modules.set([]);
              this.loadTraineeEnrollment();
              return;
            }

            import('rxjs').then(({ forkJoin }) => {
              forkJoin(moduleRequests).subscribe({
                next: (lessonsData: LessonDto[][]) => {
                  const modulesWithLessons: ModuleWithLessonsDto[] = modulesData.map((module, index) => {
                    const lessons = lessonsData[index] || [];
                    const lessonsWithProgress: LessonWithProgressDto[] = lessons.map(lesson => ({
                      ...lesson,
                      progressPercentage: 0
                    }));
                    return {
                      ...module,
                      lessons: lessonsWithProgress,
                      progressPercentage: 0
                    };
                  });

                  this.modules.set(modulesWithLessons);
                  console.log('✅ Lessons loaded for all modules');
                  this.loadTraineeEnrollment();
                },
                error: (error) => {
                  console.error('❌ Error loading lessons:', error);
                  const modulesWithLessons: ModuleWithLessonsDto[] = modulesData.map(module => ({
                    ...module,
                    lessons: [],
                    progressPercentage: 0
                  }));
                  this.modules.set(modulesWithLessons);
                  this.loadTraineeEnrollment();
                }
              });
            });
          },
          error: (error) => {
            console.error('❌ Error loading modules:', error);
            this.modules.set([]);
            this.loadTraineeEnrollment();
          }
        });
      },
      error: (error) => {
        console.error('❌ Error loading program:', error);
        this.error.set('حدث خطأ في تحميل بيانات البرنامج');
        this.loading.set(false);
        this.useMockData();
      }
    });
  }

  // ===================================================
  // LOAD TRAINEE ENROLLMENT - باستخدام traineeId من المستخدم
  // ===================================================

  loadTraineeEnrollment(): void {
    console.log('🔄 Loading enrollment for traineeId:', this.traineeId);
    
    this.traineeApi.getEnrollmentsByTrainee(this.traineeId).subscribe({
      next: (enrollments: EnrollmentDto[]) => {
        console.log('✅ Enrollments loaded:', enrollments.length);
        
        if (enrollments && enrollments.length > 0) {
          // Find enrollment for this program
          // For now, take the first one
          const enrollment = enrollments[0];
          this.enrollment.set(enrollment);
          this.enrollmentId = enrollment.enrollmentId;
          console.log('✅ Enrollment found:', {
            enrollmentId: this.enrollmentId,
            batchId: enrollment.batchId,
            traineeId: enrollment.traineeId
          });
          this.loadModuleProgress();
        } else {
          console.warn('⚠️ No enrollments found for trainee:', this.traineeId);
          this.calculateStatsFromModules();
          this.loading.set(false);
        }
      },
      error: (error) => {
        console.error('❌ Error loading enrollments:', error);
        this.calculateStatsFromModules();
        this.loading.set(false);
      }
    });
  }

  // ===================================================
  // LOAD MODULE PROGRESS - باستخدام traineeId من المستخدم
  // ===================================================

  loadModuleProgress(): void {
    console.log('🔄 Loading module progress for traineeId:', this.traineeId);
    
    this.traineeApi.getModuleProgress(this.traineeId).subscribe({
      next: (progressData: TraineeModuleProgressDto[]) => {
        console.log('✅ Module progress loaded:', progressData.length);
        this.moduleProgress.set(progressData);
        this.updateModulesWithProgress(progressData);

        if (this.enrollmentId) {
          this.traineeApi.getEnrollmentProgress(this.enrollmentId).subscribe({
            next: (summary: ProgressSummaryDto) => {
              this.progress.set(summary);
              console.log('✅ Progress summary:', summary.progressPercentage + '%');
              this.calculateStats();
              this.loading.set(false);
            },
            error: (error) => {
              console.error('❌ Error loading progress summary:', error);
              this.calculateStats();
              this.loading.set(false);
            }
          });
        } else {
          this.calculateStats();
          this.loading.set(false);
        }
      },
      error: (error) => {
        console.error('❌ Error loading module progress:', error);
        this.calculateStatsFromModules();
        this.loading.set(false);
      }
    });
  }

  // ===================================================
  // UPDATE MODULES WITH PROGRESS
  // ===================================================

  updateModulesWithProgress(progressData: TraineeModuleProgressDto[]): void {
    const updatedModules: ModuleWithLessonsDto[] = this.modules().map(module => {
      const progress = progressData.find(p => p.moduleId === module.moduleId);
      let progressPercentage = 0;

      if (progress) {
        switch (progress.status) {
          case 'Completed':
            progressPercentage = 100;
            break;
          case 'InProgress':
            progressPercentage = 50;
            break;
          case 'NotStarted':
          default:
            progressPercentage = 0;
            break;
        }
      }

      const updatedLessons: LessonWithProgressDto[] = (module.lessons || []).map(lesson => {
        let lessonProgress = 0;
        if (progressPercentage === 100) {
          lessonProgress = 100;
        } else if (progressPercentage > 0) {
          const lessonIndex = (module.lessons || []).indexOf(lesson);
          const totalLessons = (module.lessons || []).length;
          const completedCount = Math.round((progressPercentage / 100) * totalLessons);
          lessonProgress = lessonIndex < completedCount ? 100 : 0;
        }
        return {
          ...lesson,
          progressPercentage: lessonProgress
        };
      });

      return {
        ...module,
        lessons: updatedLessons,
        progressPercentage: progressPercentage
      };
    });

    this.modules.set(updatedModules);
  }

  // ===================================================
  // CALCULATE STATS
  // ===================================================

  calculateStats(): void {
    const modules = this.modules();
    const totalModules = modules.length;
    const completedModules = modules.filter(m => m.progressPercentage === 100).length;
    const totalLessons = modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
    const completedLessons = modules.reduce((sum, m) =>
      sum + (m.lessons?.filter(l => l.progressPercentage === 100).length || 0), 0
    );

    let overallProgress = 0;
    if (this.progress()) {
      overallProgress = this.progress()?.progressPercentage || 0;
    } else if (totalModules > 0) {
      overallProgress = Math.round((completedModules / totalModules) * 100);
    }

    this.stats.set({
      totalModules,
      completedModules,
      totalLessons,
      completedLessons,
      overallProgress,
      totalDays: this.calculateTotalDays(modules),
      totalAssignments: this.calculateTotalAssignments(modules),
      experienceYears: this.calculateExperienceYears(overallProgress)
    });
    
    console.log('📊 Stats calculated:', {
      totalModules,
      completedModules,
      overallProgress: overallProgress + '%'
    });
  }

  // ===================================================
  // CALCULATE STATS FROM MODULES
  // ===================================================

  calculateStatsFromModules(): void {
    const modules = this.modules();
    const totalModules = modules.length;
    const completedModules = modules.filter(m => m.progressPercentage === 100).length;
    const totalLessons = modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
    const completedLessons = modules.reduce((sum, m) =>
      sum + (m.lessons?.filter(l => l.progressPercentage === 100).length || 0), 0
    );

    const overallProgress = totalModules > 0
      ? Math.round((completedModules / totalModules) * 100)
      : 0;

    this.stats.set({
      totalModules,
      completedModules,
      totalLessons,
      completedLessons,
      overallProgress,
      totalDays: this.calculateTotalDays(modules),
      totalAssignments: this.calculateTotalAssignments(modules),
      experienceYears: this.calculateExperienceYears(overallProgress)
    });
  }

  // ===================================================
  // HELPER METHODS
  // ===================================================

  calculateTotalDays(modules: ModuleWithLessonsDto[]): number {
    return modules.length * 2;
  }

  calculateTotalAssignments(modules: ModuleWithLessonsDto[]): number {
    return modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
  }

  calculateExperienceYears(progress: number): number {
    if (progress >= 100) return 10;
    if (progress >= 75) return 7;
    if (progress >= 50) return 5;
    if (progress >= 25) return 3;
    return 1;
  }

  // ===================================================
  // MOCK DATA (للاختبار عند فشل الـ API)
  // ===================================================

  useMockData(): void {
    console.warn('⚠️ Using mock data as fallback');
    
    // Set user data
    this.user.set({
      userId: this.userId || 1,
      fullName: 'أحمد محمد',
      email: 'ahmed@example.com',
      roleId: 3,
      roleName: 'Trainee',
      status: 'Active',
      createdAt: new Date().toISOString()
    });

    this.program.set({
      programId: 1,
      title: 'برنامج تطوير مهارات الذكاء الاصطناعي',
      description: 'برنامج متكامل لتطوير مهارات الذكاء الاصطناعي. يتم إعداد الألعاب المتطورة لتطوير مهارات الذكاء الاصطناعي.',
      durationHours: 40,
      status: 'Active'
    });

    const mockModules: ModuleWithLessonsDto[] = [
      {
        moduleId: 1,
        programId: 1,
        title: 'مقدمة في الذكاء الاصطناعي',
        orderIndex: 1,
        isArchived: false,
        progressPercentage: 100,
        lessons: [
          { lessonId: 1, moduleId: 1, title: 'ما هو الذكاء الاصطناعي؟', contentBody: 'استعراض قائمة المتطورة للذكاء الاصطناعي. وظيفة الذكاء الاصطناعي. وظيفة الذكاء الاصطناعي. نظرة عامة للذكاء الاصطناعي. نظرة عامة للذكاء الاصطناعي.', orderIndex: 1, progressPercentage: 100 },
          { lessonId: 2, moduleId: 1, title: 'تطبيقات الذكاء الاصطناعي', contentBody: 'استكشاف تطبيقات الذكاء الاصطناعي في الحياة. تطبيقات الذكاء الاصطناعي.', orderIndex: 2, progressPercentage: 100 }
        ]
      },
      {
        moduleId: 2,
        programId: 1,
        title: 'أساليب Python للذكاء الاصطناعي',
        orderIndex: 2,
        isArchived: false,
        progressPercentage: 100,
        lessons: [
          { lessonId: 3, moduleId: 2, title: 'أساسيات Python', contentBody: 'تعلم أساسيات لغة Python للذكاء الاصطناعي.', orderIndex: 1, progressPercentage: 100 }
        ]
      },
      {
        moduleId: 3,
        programId: 1,
        title: 'تعلم اللغة Machine Learning',
        orderIndex: 3,
        isArchived: false,
        progressPercentage: 60,
        lessons: [
          { lessonId: 4, moduleId: 3, title: 'مقدمة في تعلم الآلة', contentBody: 'تعريف تعلم الآلة وأنواعه المختلفة.', orderIndex: 1, progressPercentage: 100 },
          { lessonId: 5, moduleId: 3, title: 'خوارزميات التصنيف', contentBody: 'خوارزميات التصنيف مثل SVM و KNN.', orderIndex: 2, progressPercentage: 50 }
        ]
      },
      {
        moduleId: 4,
        programId: 1,
        title: 'التعلم العميق Deep Learning',
        orderIndex: 4,
        isArchived: false,
        progressPercentage: 0,
        lessons: [
          { lessonId: 6, moduleId: 4, title: 'مقدمة في الشبكات العصبية', contentBody: 'مفاهيم أساسية حول الشبكات العصبية الاصطناعية.', orderIndex: 1, progressPercentage: 0 }
        ]
      }
    ];

    this.modules.set(mockModules);
    this.calculateStatsFromModules();
    this.loading.set(false);
    this.error.set(null);
  }

  // ===================================================
  // MARK ACHIEVEMENT - باستخدام userId و traineeId من المستخدم
  // ===================================================

  markAchievement(): void {
    console.log('🎯 Marking achievement:', {
      programId: this.programId,
      userId: this.userId,
      traineeId: this.traineeId,
      enrollmentId: this.enrollmentId
    });

    if (this.enrollmentId) {
      this.traineeApi.markAchievement(this.traineeId, this.programId).subscribe({
        next: (response) => {
          console.log('✅ Achievement marked successfully:', response);
          this.loadProgramData();
        },
        error: (error) => {
          console.error('❌ Error marking achievement:', error);
        }
      });
    } else {
      console.warn('⚠️ No enrollment found for this program');
    }
  }
}