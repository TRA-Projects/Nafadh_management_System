import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TraineeApi } from '../../services/trainee-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  ProjectDto,
  SubmissionDto,
  TaskDto,
  TraineeProfileDto,
  EnrollmentDto,
  BatchDto
} from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainee-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tasks.html'
})
export class TraineeTasks implements OnInit {

  // =========================================================
  // Services
  // =========================================================

  private api = inject(TraineeApi);
  private auth = inject(AuthService);


  // =========================================================
  // IDs
  // =========================================================

  traineeId = signal<number | null>(null);
  batchId = signal<number | null>(null);
  programId = signal<number | null>(null);
  enrollmentId = signal<number | null>(null);


  // =========================================================
  // بيانات المستخدم
  // =========================================================

  traineeData = signal<TraineeProfileDto | null>(null);
  enrollmentData = signal<EnrollmentDto | null>(null);
  batchData = signal<BatchDto | null>(null);


  // =========================================================
  // التبويب
  // =========================================================

  tab = signal<'assignments' | 'projects'>('assignments');


  // =========================================================
  // البيانات
  // =========================================================

  tasks = signal<TaskDto[]>([]);
  submissions = signal<SubmissionDto[]>([]);
  projects = signal<ProjectDto[]>([]);


  // =========================================================
  // العناصر المحددة
  // =========================================================

  selected = signal<TaskDto | null>(null);
  selectedProject = signal<ProjectDto | null>(null);


  // =========================================================
  // رابط التسليم
  // =========================================================

  submissionLink = '';


  // =========================================================
  // Loading states
  // =========================================================

  loadingTasks = signal(false);
  loadingSubmissions = signal(false);
  loadingProjects = signal(false);
  loadingProfile = signal(false);
  submitting = signal(false);


  // =========================================================
  // Error
  // =========================================================

  errorMessage = signal('');


  // =========================================================
  // OnInit
  // =========================================================

  ngOnInit(): void {
    this.loadTraineeData();
  }


  // =========================================================
  // تحميل بيانات المتدرب
  // =========================================================

  loadTraineeData(): void {

    this.loadingProfile.set(true);
    this.errorMessage.set('');

    // استخدام AuthService بدل localStorage.getItem('userId')
    const userId = this.auth.userId;

    console.log('Current User ID:', userId);

    if (!userId) {

      this.loadingProfile.set(false);

      this.errorMessage.set(
        'لم يتم العثور على المستخدم الحالي. يرجى تسجيل الدخول مرة أخرى.'
      );

      return;
    }


    // =======================================================
    // GET /api/User/{userId}/trainee
    // =======================================================

    this.api.getTrainee(userId).subscribe({

      next: (trainee: TraineeProfileDto) => {

        console.log('Trainee:', trainee);

        if (!trainee) {

          this.loadingProfile.set(false);

          this.errorMessage.set(
            'لم يتم العثور على بيانات المتدرب.'
          );

          return;
        }


        this.traineeData.set(trainee);

        this.traineeId.set(trainee.traineeId);


        if (!trainee.traineeId) {

          this.loadingProfile.set(false);

          this.errorMessage.set(
            'لم يتم العثور على معرف المتدرب.'
          );

          return;
        }


        // تحميل التسجيلات
        this.loadEnrollments(trainee.traineeId);

      },

      error: (error) => {

        console.error(
          'Error loading trainee:',
          error
        );

        this.loadingProfile.set(false);

        this.errorMessage.set(
          'تعذر تحميل بيانات المتدرب.'
        );
      }

    });
  }


  // =========================================================
  // تحميل التسجيلات
  // GET /api/Enrollment/trainee/{traineeId}
  // =========================================================

  loadEnrollments(traineeId: number): void {

    this.api.getEnrollmentsByTrainee(traineeId).subscribe({

      next: (enrollments: EnrollmentDto[]) => {

        console.log(
          'Trainee Enrollments:',
          enrollments
        );


        if (!enrollments || enrollments.length === 0) {

          this.loadingProfile.set(false);

          this.errorMessage.set(
            'لا توجد تسجيلات لهذا المتدرب.'
          );

          return;
        }


        // البحث عن التسجيل النشط
        const activeEnrollment =
          enrollments.find(e =>
            e.completionStatus === 'Active' ||
            e.completionStatus === 'InProgress'
          ) ?? enrollments[0];


        console.log(
          'Selected Enrollment:',
          activeEnrollment
        );


        this.enrollmentData.set(
          activeEnrollment
        );

        this.enrollmentId.set(
          activeEnrollment.enrollmentId
        );


        this.batchId.set(
          activeEnrollment.batchId
        );


        if (!activeEnrollment.batchId) {

          this.loadingProfile.set(false);

          this.errorMessage.set(
            'لم يتم العثور على الدفعة الخاصة بالتسجيل.'
          );

          return;
        }


        // تحميل بيانات الباتش
        this.loadBatchData(
          activeEnrollment.batchId
        );


        // تحميل التسليمات
        this.loadSubmissions(
          traineeId
        );

      },

      error: (error) => {

        console.error(
          'Error loading enrollments:',
          error
        );

        this.loadingProfile.set(false);

        this.errorMessage.set(
          'تعذر تحميل تسجيلات المتدرب.'
        );
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

        console.log(
          'Batch:',
          batch
        );


        if (!batch) {

          this.loadingProfile.set(false);

          this.errorMessage.set(
            'لم يتم العثور على بيانات الدفعة.'
          );

          return;
        }


        this.batchData.set(batch);

        this.programId.set(
          batch.programId
        );


        // ===================================================
        // تحميل المهام
        // ===================================================

        this.loadTasks(batchId);


        // ===================================================
        // تحميل المشاريع
        // ===================================================

        if (batch.programId) {

          this.loadProjects(
            batch.programId
          );

        } else {

          console.warn(
            'Batch does not contain programId'
          );

          this.projects.set([]);
        }


        this.loadingProfile.set(false);

      },

      error: (error) => {

        console.error(
          'Error loading batch:',
          error
        );

        this.loadingProfile.set(false);

        this.errorMessage.set(
          'تعذر تحميل بيانات الدفعة.'
        );
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

      next: (data: TaskDto[]) => {

        console.log(
          'Tasks:',
          data
        );


        this.tasks.set(
          data ?? []
        );

        this.loadingTasks.set(false);

      },

      error: (error) => {

        console.error(
          'Error loading tasks:',
          error
        );

        this.tasks.set([]);

        this.loadingTasks.set(false);

      }

    });
  }


  // =========================================================
  // تحميل التسليمات
  // GET /api/Submission/trainee/{traineeId}
  // =========================================================

  loadSubmissions(traineeId: number): void {

    this.loadingSubmissions.set(true);


    this.api.getSubmissions(traineeId).subscribe({

      next: (data: SubmissionDto[]) => {

        console.log(
          'Submissions:',
          data
        );


        this.submissions.set(
          data ?? []
        );

        this.loadingSubmissions.set(false);

      },

      error: (error) => {

        console.error(
          'Error loading submissions:',
          error
        );

        this.submissions.set([]);

        this.loadingSubmissions.set(false);

      }

    });
  }


  // =========================================================
  // تحميل المشاريع
  // GET /api/Project/program/{programId}
  // =========================================================

  loadProjects(programId: number): void {

    this.loadingProjects.set(true);


    this.api.getProjectsByProgram(programId).subscribe({

      next: (data: ProjectDto[]) => {

        console.log(
          'Projects:',
          data
        );


        this.projects.set(
          data ?? []
        );

        this.loadingProjects.set(false);

      },

      error: (error) => {

        console.error(
          'Error loading projects:',
          error
        );

        this.projects.set([]);

        this.loadingProjects.set(false);

      }

    });
  }


  // =========================================================
  // اختيار المهمة
  // =========================================================

  selectTask(task: TaskDto): void {

    this.selected.set(task);

    this.submissionLink = '';


    const submission =
      this.submissionFor(task.taskId);


    if (submission) {

      this.submissionLink =
        this.getSubmissionUrl(submission);

    }
  }


  // =========================================================
  // العودة للمهام
  // =========================================================

  backToTasks(): void {

    this.selected.set(null);

    this.submissionLink = '';

  }


  // =========================================================
  // البحث عن تسليم المهمة
  // =========================================================

  submissionFor(
    taskId: number
  ): SubmissionDto | undefined {

    return this.submissions().find(
      submission =>
        submission.taskId === taskId
    );
  }


  // =========================================================
  // رابط التسليم
  // =========================================================

  private getSubmissionUrl(
    submission: SubmissionDto
  ): string {

    const data = submission as any;

    return (
      data.fileUrl ??
      data.fileURL ??
      data.url ??
      data.submissionUrl ??
      ''
    );
  }


  // =========================================================
  // تسليم المهمة
  // POST /api/Submission
  // =========================================================

  submit(): void {

    const task = this.selected();

    const traineeId =
      this.traineeId();


    if (!task) {
      return;
    }


    if (!traineeId) {

      this.errorMessage.set(
        'لم يتم تحديد المتدرب.'
      );

      return;
    }


    const link =
      this.submissionLink.trim();


    if (!link) {

      this.errorMessage.set(
        'يرجى إدخال رابط التسليم.'
      );

      return;
    }


    this.submitting.set(true);

    this.errorMessage.set('');


    this.api.submitAssignment({

      taskId: task.taskId,

      traineeId: traineeId,

      fileUrl: link

    }).subscribe({

      next: () => {

        this.submitting.set(false);

        this.submissionLink = '';

        this.selected.set(null);


        this.loadSubmissions(
          traineeId
        );

      },

      error: (error) => {

        console.error(
          'Error submitting assignment:',
          error
        );

        this.submitting.set(false);

        this.errorMessage.set(
          'حدث خطأ أثناء تسليم المهمة.'
        );
      }

    });
  }


  // =========================================================
  // حالة المهمة
  // =========================================================

  displayStatus(status: any): string {

    const value =
      String(status ?? '')
        .toLowerCase()
        .trim();


    switch (value) {

      case 'submitted':
      case 'submit':
      case 'submittedforreview':
      case 'underreview':
      case 'review':
        return 'قيد المراجعة';


      case 'graded':
      case 'completed':
      case 'complete':
        return 'مكتمل';


      case 'rejected':
      case 'returned':
        return 'مُعاد';


      case 'late':
      case 'overdue':
        return 'متأخر';


      case 'new':
      case 'pending':
      case '':
        return 'جديد';


      default:
        return String(status);
    }
  }


  // =========================================================
  // خلفية الحالة
  // =========================================================

  statusBackground(status: any): string {

    const value =
      String(status ?? '')
        .toLowerCase()
        .trim();


    switch (value) {

      case 'submitted':
      case 'submittedforreview':
      case 'underreview':
      case 'review':
        return 'var(--status-active-bg)';


      case 'graded':
      case 'completed':
      case 'complete':
        return 'var(--status-completed-bg)';


      default:
        return 'var(--status-new-bg)';
    }
  }


  // =========================================================
  // لون الحالة
  // =========================================================

  statusForeground(status: any): string {

    const value =
      String(status ?? '')
        .toLowerCase()
        .trim();


    switch (value) {

      case 'submitted':
      case 'submittedforreview':
      case 'underreview':
      case 'review':
        return 'var(--status-active-fg)';


      case 'graded':
      case 'completed':
      case 'complete':
        return 'var(--status-completed-fg)';


      default:
        return 'var(--status-new-fg)';
    }
  }


  // =========================================================
  // اختيار المشروع
  // =========================================================

  selectProject(
    project: ProjectDto
  ): void {

    this.selectedProject.set(
      project
    );
  }


  // =========================================================
  // العودة للمشاريع
  // =========================================================

  backToProjects(): void {

    this.selectedProject.set(null);

  }


  // =========================================================
  // نسبة إنجاز المشروع
  // =========================================================

  projectProgress(
    project: ProjectDto
  ): number {

    const p = project as any;


    const value =
      p.progressPercentage ??
      p.progress ??
      p.completionPercentage ??
      p.completion ??
      p.percentage ??
      0;


    const number =
      Number(value);


    if (Number.isNaN(number)) {
      return 0;
    }


    return Math.min(
      100,
      Math.max(
        0,
        Math.round(number)
      )
    );
  }


  // =========================================================
  // تاريخ بداية المشروع
  // =========================================================

  projectStartDate(
    project: ProjectDto
  ): any {

    const p = project as any;


    return (
      p.startDate ??
      p.startedAt ??
      p.projectStartDate ??
      null
    );
  }


  // =========================================================
  // تاريخ نهاية المشروع
  // =========================================================

  projectEndDate(
    project: ProjectDto
  ): any {

    const p = project as any;


    return (
      p.endDate ??
      p.deadline ??
      p.dueDate ??
      p.projectEndDate ??
      null
    );
  }


  // =========================================================
  // حالة المشروع
  // =========================================================

  displayProjectStatus(
    project: ProjectDto
  ): string {

    const p = project as any;


    const status =
      String(p.status ?? '')
        .toLowerCase()
        .trim();


    const progress =
      this.projectProgress(project);


    if (
      status === 'completed' ||
      status === 'complete' ||
      progress === 100
    ) {

      return 'مكتمل';
    }


    if (
      status === 'new' ||
      status === 'pending' ||
      progress === 0
    ) {

      return 'جديد';
    }


    if (
      status === 'active' ||
      status === 'inprogress' ||
      status === 'in progress'
    ) {

      return 'مستمر';
    }


    return p.status || 'مستمر';
  }


  // =========================================================
  // خلفية حالة المشروع
  // =========================================================

  projectStatusBackground(
    project: ProjectDto
  ): string {

    const status =
      this.displayProjectStatus(
        project
      );


    if (status === 'مكتمل') {

      return 'var(--status-completed-bg)';
    }


    if (status === 'جديد') {

      return 'var(--status-new-bg)';
    }


    return 'var(--status-active-bg)';
  }


  // =========================================================
  // لون حالة المشروع
  // =========================================================

  projectStatusForeground(
    project: ProjectDto
  ): string {

    const status =
      this.displayProjectStatus(
        project
      );


    if (status === 'مكتمل') {

      return 'var(--status-completed-fg)';
    }


    if (status === 'جديد') {

      return 'var(--status-new-fg)';
    }


    return 'var(--status-active-fg)';
  }


  // =========================================================
  // دائرة الإنجاز
  // =========================================================

  projectProgressBackground(
    progress: number
  ): string {

    const angle =
      progress * 3.6;


    return `
      conic-gradient(
        var(--color-navy) 0deg ${angle}deg,
        var(--color-tint-indigo) ${angle}deg 360deg
      )
    `;
  }


  // =========================================================
  // مراحل المشروع
  // =========================================================

  projectSteps(
    project: ProjectDto
  ) {

    const progress =
      this.projectProgress(project);


    let currentStep = 1;


    if (progress >= 75) {

      currentStep = 4;

    } else if (progress >= 50) {

      currentStep = 3;

    } else if (progress >= 25) {

      currentStep = 2;

    }


    return [

      {
        number: 1,
        name: 'التخطيط',
        completed: progress >= 25,
        current: currentStep === 1
      },

      {
        number: 2,
        name: 'التطوير',
        completed: progress >= 50,
        current: currentStep === 2
      },

      {
        number: 3,
        name: 'الاختبار',
        completed: progress >= 75,
        current: currentStep === 3
      },

      {
        number: 4,
        name: 'التسليم',
        completed: progress >= 100,
        current: currentStep === 4
      }

    ];
  }


  // =========================================================
  // Refresh
  // =========================================================

  refreshData(): void {

    const batchId =
      this.batchId();

    const traineeId =
      this.traineeId();

    const programId =
      this.programId();


    if (batchId) {

      this.loadTasks(
        batchId
      );
    }


    if (traineeId) {

      this.loadSubmissions(
        traineeId
      );
    }


    if (programId) {

      this.loadProjects(
        programId
      );
    }

  }

}