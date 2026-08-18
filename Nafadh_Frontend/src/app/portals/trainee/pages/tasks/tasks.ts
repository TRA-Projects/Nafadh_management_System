
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

  traineeId = 1;
  batchId = 1;
  programId = 1;

  tab = signal<'assignments' | 'projects'>('assignments');

  tasks = signal<TaskDto[]>([]);
  submissions = signal<SubmissionDto[]>([]);
  projects = signal<ProjectDto[]>([]);

  selected = signal<TaskDto | null>(null);

  submissionLink = '';

  constructor(private api: TraineeApi) {}

  ngOnInit() {

    this.api
      .getTasks(this.batchId)
      .subscribe((d) => {
        this.tasks.set(d ?? []);
      });

    this.api
      .getSubmissions(this.traineeId)
      .subscribe((d) => {
        this.submissions.set(d ?? []);
      });

    this.api
      .getProjectsByProgram(this.programId)
      .subscribe((d) => {
        this.projects.set(d ?? []);
      });
  }


  // =========================================================
  // المهام
  // =========================================================

  submissionFor(taskId: number): SubmissionDto | undefined {

    return this.submissions().find(
      (s) => s.taskId === taskId
    );
  }


  // تحميل الرابط الموجود مسبقًا عند الضغط على تعديل التسليم
  loadExistingSubmission() {

    const task = this.selected();

    if (!task) {
      return;
    }

    const submission = this.submissionFor(task.taskId);

    if (!submission) {
      return;
    }

    this.submissionLink =
      this.getSubmissionUrl(submission);
  }


  // الحصول على رابط التسليم
  private getSubmissionUrl(submission: SubmissionDto): string {

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
  // =========================================================

  submit() {

    const task = this.selected();

    if (!task) {
      return;
    }

    const link = this.submissionLink.trim();

    if (!link) {
      return;
    }


    this.api
      .submitAssignment({
        taskId: task.taskId,
        traineeId: this.traineeId,
        fileUrl: link
      })
      .subscribe({

        next: () => {

          this.selected.set(null);

          this.submissionLink = '';

          this.refreshSubmissions();

        },

        error: (error) => {

          console.error(
            'حدث خطأ أثناء تسليم المهمة:',
            error
          );

        }

      });
  }


  private refreshSubmissions() {

    this.api
      .getSubmissions(this.traineeId)
      .subscribe((d) => {

        this.submissions.set(
          d ?? []
        );

      });
  }


  // =========================================================
  // حالات المهام
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


      case 'rejected':
      case 'returned':
        return 'var(--status-new-bg)';


      default:
        return 'var(--status-new-bg)';
    }
  }


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
  // المشاريع
  // =========================================================

  projectProgress(project: ProjectDto): number {

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


  projectStartDate(project: ProjectDto): any {

    const p = project as any;

    return (
      p.startDate ??
      p.startedAt ??
      p.projectStartDate ??
      null
    );
  }


  projectEndDate(project: ProjectDto): any {

    const p = project as any;

    return (
      p.endDate ??
      p.deadline ??
      p.dueDate ??
      p.projectEndDate ??
      null
    );
  }


  displayProjectStatus(project: ProjectDto): string {

    const p = project as any;

    const status =
      String(
        p.status ??
        ''
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


  projectStatusBackground(project: ProjectDto): string {

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


  projectStatusForeground(project: ProjectDto): string {

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
  // دائرة نسبة الإنجاز
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

  projectSteps(project: ProjectDto) {

    const progress =
      this.projectProgress(project);


    /*
      0%   = لا توجد مرحلة مكتملة
      1-25 = التخطيط
      26-50 = التطوير
      51-75 = الاختبار
      76-100 = التسليم
    */

    let currentStep = 1;


    if (progress >= 100) {

      currentStep = 4;

    } else if (progress >= 75) {

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
}