import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TraineeApi } from '../../services/trainee-api';

import {
  ProjectDto,
  SubmissionDto,
  TaskDto
} from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainee-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tasks.html',
})
export class TraineeTasks implements OnInit {

  // =========================================================
  // IDs
  // =========================================================

  // مؤقتًا إلى أن يتم ربطها بالمستخدم المسجل دخولًا
  traineeId = 1;

  // Batch الخاص بالمتدرب
  batchId = 1;

  // البرنامج التدريبي
  programId = 1;


  // =========================================================
  // الصفحة
  // =========================================================

  tab = signal<'assignments' | 'projects'>('assignments');


  // =========================================================
  // البيانات
  // =========================================================

  tasks = signal<TaskDto[]>([]);

  submissions = signal<SubmissionDto[]>([]);

  projects = signal<ProjectDto[]>([]);


  // المهمة المحددة
  selected = signal<TaskDto | null>(null);


  // المشروع المحدد
  selectedProject = signal<ProjectDto | null>(null);


  // رابط التسليم
  submissionLink = '';


  // حالة التحميل
  loadingTasks = signal(false);

  loadingSubmissions = signal(false);

  loadingProjects = signal(false);

  submitting = signal(false);


  // رسالة الخطأ
  errorMessage = signal('');


  // =========================================================
  // Constructor
  // =========================================================

  constructor(
    private api: TraineeApi
  ) {}


  // =========================================================
  // OnInit
  // =========================================================

  ngOnInit(): void {

    this.loadTasks();

    this.loadSubmissions();

    this.loadProjects();

  }


  // =========================================================
  // تحميل المهام
  // GET /api/Task/batch/{batchId}
  // =========================================================

  loadTasks(): void {

    this.loadingTasks.set(true);

    this.errorMessage.set('');

    this.api
      .getTasks(this.batchId)
      .subscribe({

        next: (data) => {

          this.tasks.set(data ?? []);

          this.loadingTasks.set(false);

        },

        error: (error) => {

          console.error(
            'Error loading tasks:',
            error
          );

          this.tasks.set([]);

          this.loadingTasks.set(false);

          this.errorMessage.set(
            'تعذر تحميل المهام.'
          );

        }

      });

  }


  // =========================================================
  // تحميل تسليمات المتدرب
  // GET /api/Submission/trainee/{traineeId}
  // =========================================================

  loadSubmissions(): void {

    this.loadingSubmissions.set(true);

    this.api
      .getSubmissions(this.traineeId)
      .subscribe({

        next: (data) => {

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
  // تحميل مشاريع البرنامج
  // GET /api/Project/program/{programId}
  // =========================================================

  loadProjects(): void {

    this.loadingProjects.set(true);

    this.api
      .getProjectsByProgram(this.programId)
      .subscribe({

        next: (data) => {

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
  // العودة من تفاصيل المهمة
  // =========================================================

  backToTasks(): void {

    this.selected.set(null);

    this.submissionLink = '';

  }


  // =========================================================
  // الحصول على تسليم مهمة معينة
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
  // الحصول على رابط التسليم
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
  //
  // POST /api/Submission
  // =========================================================

  submit(): void {

    const task = this.selected();

    if (!task) {
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


    // إذا كان هناك تسليم سابق
    const existingSubmission =
      this.submissionFor(task.taskId);



    this.submitting.set(true);

    this.errorMessage.set('');


    this.api
      .submitAssignment({

        taskId: task.taskId,

        traineeId: this.traineeId,

        fileUrl: link

      })
      .subscribe({

        next: () => {

          this.submitting.set(false);

          this.submissionLink = '';

          this.selected.set(null);

          this.loadSubmissions();

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

  displayStatus(
    status: any
  ): string {

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
  // لون خلفية حالة المهمة
  // =========================================================

  statusBackground(
    status: any
  ): string {

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


      case 'rejected':
      case 'returned':

        return 'var(--status-new-bg)';


      default:

        return 'var(--status-new-bg)';

    }

  }


  // =========================================================
  // لون النص
  // =========================================================

  statusForeground(
    status: any
  ): string {

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

    this.selectedProject.set(project);

  }


  // =========================================================
  // العودة إلى المشاريع
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
      String(
        p.status ?? ''
      )
      .toLowerCase()
      .trim();


    if (
      status === 'completed' ||
      status === 'complete' ||
      this.projectProgress(project) === 100
    ) {

      return 'مكتمل';

    }


    if (
      status === 'new' ||
      status === 'pending' ||
      this.projectProgress(project) === 0
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
  // لون حالة المشروع
  // =========================================================

  projectStatusBackground(
    project: ProjectDto
  ): string {

    const status =
      this.displayProjectStatus(project);


    if (status === 'مكتمل') {

      return 'var(--status-completed-bg)';

    }


    if (status === 'جديد') {

      return 'var(--status-new-bg)';

    }


    return 'var(--status-active-bg)';

  }


  projectStatusForeground(
    project: ProjectDto
  ): string {

    const status =
      this.displayProjectStatus(project);


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

    }
    else if (progress >= 50) {

      currentStep = 3;

    }
    else if (progress >= 25) {

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

}