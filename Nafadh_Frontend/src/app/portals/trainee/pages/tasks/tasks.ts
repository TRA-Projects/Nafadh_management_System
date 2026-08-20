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

  private api = inject(TraineeApi);
  private auth = inject(AuthService);

  traineeId = signal<number | null>(null);
  batchId = signal<number | null>(null);
  programId = signal<number | null>(null);
  enrollmentId = signal<number | null>(null);

  traineeData = signal<TraineeProfileDto | null>(null);
  enrollmentData = signal<EnrollmentDto | null>(null);
  batchData = signal<BatchDto | null>(null);

  tab = signal<'assignments' | 'projects'>('assignments');

  tasks = signal<TaskDto[]>([]);
  submissions = signal<SubmissionDto[]>([]);
  projects = signal<ProjectDto[]>([]);

  selected = signal<TaskDto | null>(null);
  selectedProject = signal<ProjectDto | null>(null);

  submissionLink = '';

  loadingTasks = signal(false);
  loadingSubmissions = signal(false);
  loadingProjects = signal(false);
  loadingProfile = signal(false);
  submitting = signal(false);

  errorMessage = signal('');

  ngOnInit(): void {
    this.loadTraineeData();
  }

  // =========================================================
  // Trainee
  // =========================================================

  loadTraineeData(): void {

    this.loadingProfile.set(true);
    this.errorMessage.set('');

    const userId = this.auth.userId;

    if (!userId) {
      this.loadingProfile.set(false);
      this.errorMessage.set(
        'لم يتم العثور على المستخدم الحالي. يرجى تسجيل الدخول مرة أخرى.'
      );
      return;
    }

    this.api.getTrainee(userId).subscribe({

      next: (trainee: TraineeProfileDto) => {

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

        this.loadEnrollments(trainee.traineeId);
      },

      error: (error) => {

        console.error('Error loading trainee:', error);

        this.loadingProfile.set(false);
        this.errorMessage.set(
          'تعذر تحميل بيانات المتدرب.'
        );
      }
    });
  }

  // =========================================================
  // Enrollments
  // =========================================================

  loadEnrollments(traineeId: number): void {

    this.api.getEnrollmentsByTrainee(traineeId).subscribe({

      next: (enrollments: EnrollmentDto[]) => {

        if (!enrollments || enrollments.length === 0) {

          this.loadingProfile.set(false);
          this.errorMessage.set(
            'لا توجد تسجيلات لهذا المتدرب.'
          );

          return;
        }

        const activeEnrollment =
          enrollments.find(e =>
            e.completionStatus === 'Active' ||
            e.completionStatus === 'InProgress'
          ) ?? enrollments[0];

        this.enrollmentData.set(activeEnrollment);

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

        this.loadBatchData(
          activeEnrollment.batchId
        );

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
  // Batch
  // =========================================================

  loadBatchData(batchId: number): void {

    this.api.getBatch(batchId).subscribe({

      next: (batch: BatchDto) => {

        if (!batch) {

          this.loadingProfile.set(false);
          this.errorMessage.set(
            'لم يتم العثور على بيانات الدفعة.'
          );

          return;
        }

        this.batchData.set(batch);
        this.programId.set(batch.programId);

        this.loadTasks(batchId);

        if (batch.programId) {

          this.loadProjects(
            batch.programId
          );

        } else {

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
  // Tasks
  // =========================================================

  loadTasks(batchId: number): void {

    this.loadingTasks.set(true);

    this.api.getTasks(batchId).subscribe({

      next: (data: TaskDto[]) => {

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
  // Submissions
  // =========================================================

  loadSubmissions(traineeId: number): void {

    this.loadingSubmissions.set(true);

    this.api.getSubmissions(traineeId).subscribe({

      next: (data: SubmissionDto[]) => {

        this.submissions.set(data ?? []);
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
  // Projects
  // =========================================================

  loadProjects(programId: number): void {

    this.loadingProjects.set(true);

    this.api.getProjectsByProgram(programId).subscribe({

      next: (data: ProjectDto[]) => {

        this.projects.set(data ?? []);
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
  // Select Task
  // =========================================================

  selectTask(task: TaskDto): void {

    this.selected.set(task);
    this.selectedProject.set(null);
    this.submissionLink = '';

    const submission =
      this.submissionFor(task.taskId);

    if (submission) {

      this.submissionLink =
        this.getSubmissionUrl(submission);
    }
  }

  backToTasks(): void {

    this.selected.set(null);
    this.submissionLink = '';
    this.errorMessage.set('');
  }

  // =========================================================
  // Submission
  // =========================================================

  submissionFor(
    taskId: number
  ): SubmissionDto | undefined {

    return this.submissions().find(
      submission =>
        submission.taskId === taskId
    );
  }

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
  // Deadline
  // =========================================================

  isDeadlinePassed(
    task: TaskDto
  ): boolean {

    if (!task.dueDate) {
      return false;
    }

    return (
      new Date().getTime() >
      new Date(task.dueDate).getTime()
    );
  }

  // =========================================================
  // Can Submit
  // =========================================================

  canSubmit(
    task: TaskDto
  ): boolean {

    const submission =
      this.submissionFor(task.taskId);

    if (submission) {

      const status =
        String(submission.status ?? '')
          .toLowerCase()
          .replace(/\s/g, '');

      if (
        status === 'graded' ||
        status === 'completed' ||
        status === 'complete'
      ) {
        return false;
      }
    }

    return !this.isDeadlinePassed(task);
  }

  // =========================================================
  // Display Task Status
  // =========================================================

  displayStatus(
    status: any
  ): string {

    const value =
      String(status ?? '')
        .toLowerCase()
        .replace(/\s/g, '')
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
        return String(status ?? 'غير محدد');
    }
  }

  // =========================================================
  // Effective Task Status
  // =========================================================

  displayTaskStatus(
    task: TaskDto
  ): string {

    const submission =
      this.submissionFor(task.taskId);

    if (submission) {

      const status =
        String(submission.status ?? '')
          .toLowerCase()
          .replace(/\s/g, '');

      if (
        status === 'graded' ||
        status === 'completed' ||
        status === 'complete'
      ) {
        return 'مكتمل';
      }

      if (
        status === 'submitted' ||
        status === 'submit' ||
        status === 'submittedforreview' ||
        status === 'underreview' ||
        status === 'review'
      ) {
        return 'قيد المراجعة';
      }

      if (
        status === 'rejected' ||
        status === 'returned'
      ) {
        return 'مُعاد';
      }
    }

    if (this.isDeadlinePassed(task)) {
      return 'متأخر';
    }

    return 'جديد';
  }

  // =========================================================
  // Task Status Background
  // =========================================================

  statusBackground(
    status: any
  ): string {

    const value =
      String(status ?? '')
        .toLowerCase()
        .replace(/\s/g, '')
        .trim();

    switch (value) {

      case 'submitted':
      case 'submit':
      case 'submittedforreview':
      case 'underreview':
      case 'review':
        return 'var(--status-active-bg)';

      case 'graded':
      case 'completed':
      case 'complete':
        return 'var(--status-completed-bg)';

      case 'overdue':
      case 'late':
      case 'rejected':
      case 'returned':
        return 'var(--status-new-bg)';

      default:
        return 'var(--status-new-bg)';
    }
  }

  // =========================================================
  // Task Status Foreground
  // =========================================================

  statusForeground(
    status: any
  ): string {

    const value =
      String(status ?? '')
        .toLowerCase()
        .replace(/\s/g, '')
        .trim();

    switch (value) {

      case 'submitted':
      case 'submit':
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
  // Submit Assignment
  // =========================================================

  submit(): void {

    const task = this.selected();
    const traineeId = this.traineeId();

    if (!task || !traineeId) {
      return;
    }

    if (!this.canSubmit(task)) {

      this.errorMessage.set(
        'انتهى موعد تسليم هذه المهمة ولا يمكن إعادة التسليم.'
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
  // Select Project
  // =========================================================

  selectProject(
    project: ProjectDto
  ): void {

    this.selectedProject.set(project);
    this.selected.set(null);
    this.errorMessage.set('');
  }

  backToProjects(): void {

    this.selectedProject.set(null);
    this.errorMessage.set('');
  }

  // =========================================================
  // Project Progress
  // =========================================================

  projectProgress(
    project: ProjectDto
  ): number {

    const p = project as any;

    const rawValue =
      p.progressPercentage ??
      p.progress ??
      p.completionPercentage ??
      p.completion ??
      p.percentage ??
      0;

    const value = Number(rawValue);

    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(
        0,
        Math.round(value)
      )
    );
  }

  // =========================================================
  // Project Start Date
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
  // Project End Date
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
  // Project Status
  // =========================================================

  displayProjectStatus(
    project: ProjectDto
  ): string {

    const p = project as any;

    const rawStatus =
      String(p.status ?? '')
        .toLowerCase()
        .trim()
        .replace(/[\s_-]/g, '');

    const progress =
      this.projectProgress(project);

    if (
      rawStatus === 'completed' ||
      rawStatus === 'complete' ||
      rawStatus === 'مكتمل' ||
      progress === 100
    ) {
      return 'مكتمل';
    }

    if (
      rawStatus === 'new' ||
      rawStatus === 'pending' ||
      rawStatus === 'جديد'
    ) {
      return 'جديد';
    }

    if (
      rawStatus === 'active' ||
      rawStatus === 'inprogress' ||
      rawStatus === 'مستمر' ||
      rawStatus === 'قيدالتنفيذ'
    ) {
      return 'مستمر';
    }

    if (progress === 0) {
      return 'جديد';
    }

    if (progress > 0 && progress < 100) {
      return 'مستمر';
    }

    return 'مستمر';
  }

  // =========================================================
  // Project Status Background
  // =========================================================

  projectStatusBackground(
    project: ProjectDto
  ): string {

    switch (
      this.displayProjectStatus(project)
    ) {

      case 'مكتمل':
        return 'var(--status-completed-bg)';

      case 'جديد':
        return 'var(--status-new-bg)';

      default:
        return 'var(--status-active-bg)';
    }
  }

  // =========================================================
  // Project Status Foreground
  // =========================================================

  projectStatusForeground(
    project: ProjectDto
  ): string {

    switch (
      this.displayProjectStatus(project)
    ) {

      case 'مكتمل':
        return 'var(--status-completed-fg)';

      case 'جديد':
        return 'var(--status-new-fg)';

      default:
        return 'var(--status-active-fg)';
    }
  }

  // =========================================================
  // Project Progress Ring
  // =========================================================

  projectProgressBackground(
    progress: number
  ): string {

    const angle =
      Math.min(
        100,
        Math.max(0, progress)
      ) * 3.6;

    return `
      conic-gradient(
        var(--color-navy) 0deg ${angle}deg,
        var(--color-tint-indigo) ${angle}deg 360deg
      )
    `;
  }

  // =========================================================
  // Refresh
  // =========================================================

  refreshData(): void {

    const batchId = this.batchId();
    const traineeId = this.traineeId();
    const programId = this.programId();

    if (batchId) {
      this.loadTasks(batchId);
    }

    if (traineeId) {
      this.loadSubmissions(traineeId);
    }

    if (programId) {
      this.loadProjects(programId);
    }
  }
}