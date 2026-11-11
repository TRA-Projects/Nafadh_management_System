import { CatalogPicker } from '../../../../core/models/catalog-picker';
import { NafadhConstantsService } from '../../../../core/services/nafadh-constants.service';
import { inject, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';

import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  SubmissionDto,
  TaskDto,
  TrainerBatchDto,
  TrainerDto,
  ProjectDto,
  ProjectMemberDto
} from '../../../../core/models/dtos';

import { TaskPriority, TaskStatus } from '../../../../core/models/enums';


@Component({
  selector: 'app-trainer-tasks',
  standalone: true,
  imports: [CatalogPicker, CommonModule, FormsModule, RouterLink],
  templateUrl: './tasks.html',
  styleUrl: './tasks.scss',
})
export class TrainerTasks implements OnInit {
  activeTab = signal<'tasks' | 'projects'>('tasks');
selectedProject = signal<ProjectDto | null>(null);
showProjectMembersModal = signal(false);

openProjectMembers(project: ProjectDto): void {
  this.selectedProject.set(project);
  this.projectMembers.set([]);
  this.showProjectMembersModal.set(true);
  this.loadProjectMembers(project.projectId);
  this.loadBatchTraineesForProject();
}
projectMembers = signal<ProjectMemberDto[]>([]);
batchTrainees = signal<{ traineeId: number; fullName: string }[]>([]);
selectedProjectTraineeId = 0;
selectedProjectMemberRole: 'Lead' | 'Contributor' = 'Contributor';
addingProjectMember = signal(false);
loadingProjectMembers = signal(false);
projectMembersError = signal('');

loadProjectMembers(projectId: number): void {
  this.loadingProjectMembers.set(true);
  this.projectMembersError.set('');

  this.api.getProjectMembers(projectId).subscribe({
    next: (data) => {
      console.log('Project members API response:', data);
      this.projectMembers.set(data ?? []);
      this.loadingProjectMembers.set(false);
    },
    error: (error) => {
      console.error('Error loading project members:', error);
      this.projectMembersError.set('تعذر تحميل أعضاء الفريق');
      this.loadingProjectMembers.set(false);
    }
  });
}
loadBatchTraineesForProject(): void {
  if (!this.batchIdInput) {
    this.batchTrainees.set([]);
    return;
  }

  this.api.getBatchTrainees(this.batchIdInput).subscribe({
    next: (data) => {
      const trainees = (data ?? []) as {
        traineeId: number;
        fullName: string;
      }[];

  this.batchTrainees.set(trainees);
    },
    error: (error) => {
      console.error('Error loading batch trainees:', error);
      this.projectMembersError.set('تعذر تحميل متدربي الدفعة');
    }
  });
}
getProjectMemberName(traineeId: number): string {
  const trainee = this.batchTrainees().find(
    t => t.traineeId === traineeId
  );

  return trainee?.fullName ?? `متدرب رقم ${traineeId}`;
}
isProjectMember(traineeId: number): boolean {
  return this.projectMembers().some(
    member => member.traineeId === traineeId
  );
}
addMemberToProject(): void {
  const project = this.selectedProject();

  if (!project || !this.selectedProjectTraineeId) {
    this.projectMembersError.set('يرجى اختيار المتدرب أولاً');
    return;
  }

  if (this.projectMembers().some(
    m => m.traineeId === this.selectedProjectTraineeId
  )) {
    this.projectMembersError.set('المتدرب مضاف بالفعل إلى المشروع');
    return;
  }

  this.addingProjectMember.set(true);
  this.projectMembersError.set('');

  this.api.addProjectMember({
    projectId: project.projectId,
    traineeId: this.selectedProjectTraineeId,
    role: this.selectedProjectMemberRole
  }).subscribe({
    next: () => {
      this.addingProjectMember.set(false);
      this.selectedProjectTraineeId = 0;
      this.loadProjectMembers(project.projectId);
      this.loadBatchTraineesForProject();
    },
    error: (error) => {
      console.error('Error adding project member:', error);
      this.addingProjectMember.set(false);
      this.projectMembersError.set('تعذر إضافة المتدرب للمشروع');
    }
  });
}
memberPendingDelete = signal<ProjectMemberDto | null>(null);
showDeleteMemberModal = signal(false);

removeProjectMember(member: ProjectMemberDto): void {
  this.memberPendingDelete.set(member);
  this.showDeleteMemberModal.set(true);
}

confirmRemoveProjectMember(): void {
  const member = this.memberPendingDelete();
  if (!member) return;

  this.api.deleteProjectMember(member.memberId).subscribe({
    next: () => {
      this.showDeleteMemberModal.set(false);
      this.memberPendingDelete.set(null);

      const project = this.selectedProject();
      if (project) {
        this.loadProjectMembers(project.projectId);
      }
    },
    error: (error) => {
      console.error(error);
      this.projectMembersError.set('تعذر حذف عضو الفريق');
      this.showDeleteMemberModal.set(false);
    }
  });
}
setActiveTab(tab: 'tasks' | 'projects'): void {
  this.activeTab.set(tab);

  if (tab === 'projects') {
    this.projects.set([]);
    this.projectsError.set('');

    if (!this.batchIdInput) {
      this.projectsError.set('لا توجد دفعة محددة');
      return;
    }

    this.loadingProjects.set(true);

    this.api.getBatch(this.batchIdInput).subscribe({
      next: (batch) => {
        this.newProjectProgramId = batch.programId;
        this.loadProjects();
      },
      error: (error) => {
        console.error('Error loading batch:', error);
        this.loadingProjects.set(false);
        this.projectsError.set('تعذر تحميل بيانات الدفعة');
      }
    });
  }
}
  readonly constants = inject(NafadhConstantsService);

  // =====================================================
// PROJECTS
// =====================================================

showProjectCreateModal = signal(false);
// PROJECTS LIST
projects = signal<ProjectDto[]>([]);
loadingProjects = signal(false);
projectsError = signal('');

// PROJECT CREATE FORM
newProjectTitle = '';
newProjectDescription = '';
newProjectStartDate = '';
newProjectEndDate = '';

newProjectStatus:
  'Planned' | 'InProgress' | 'Completed' | 'Cancelled' = 'Planned';

newProjectProgramId = 0;
projectSaving = signal(false);
projectError = signal('');

openProjectCreateModal(): void {
  this.projectError.set('');

  if (!this.batchIdInput) {
    this.projectError.set('يرجى اختيار الدفعة أولاً');
    this.showProjectCreateModal.set(true);
    return;
  }

  this.newProjectProgramId = 0;

  this.api.getBatch(this.batchIdInput).subscribe({
    next: (batch) => {
      this.newProjectProgramId = batch.programId;
      this.showProjectCreateModal.set(true);
    },
    error: (error) => {
      console.error('Error loading batch program:', error);
      this.projectError.set('تعذر تحديد البرنامج المرتبط بالدفعة');
      this.showProjectCreateModal.set(true);
    }
  });
}

closeProjectCreateModal(): void {
  this.showProjectCreateModal.set(false);
  
}
loadProjects(): void {
  if (!this.newProjectProgramId) {
    this.projects.set([]);
    return;
  }

  this.loadingProjects.set(true);
  this.projectsError.set('');

  this.api.getProjectsByProgram(this.newProjectProgramId).subscribe({
    next: (data) => {
      this.projects.set(data ?? []);
      this.loadingProjects.set(false);
    },
    error: (error) => {
      console.error('Error loading projects:', error);
      this.projects.set([]);
      this.projectsError.set('تعذر تحميل المشاريع');
      this.loadingProjects.set(false);
    }
  });
}
  // =====================================================
  // TRAINER
  // =====================================================

  trainer = signal<TrainerDto | null>(null);


  // =====================================================
  // BATCHES
  // =====================================================

  batches = signal<TrainerBatchDto[]>([]);
  batchIdInput = 0;
  loadingBatches = signal(false);
  requestedBatchId: number | null = null;


  // =====================================================
  // TASKS
  // =====================================================

  tasks = signal<TaskDto[]>([]);
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');


  // =====================================================
  // TASK SUBMISSIONS
  // =====================================================

  submissionsByTask = signal<Record<number, SubmissionDto[]>>({});
  loadingSubmissions = signal(false);


  // =====================================================
  // SUBMISSIONS VIEW MODAL
  // =====================================================

  showSubmissionsModal = signal(false);
  selectedSubmissionsTask = signal<TaskDto | null>(null);
  modalLoadingSubmissions = signal(false);
  submissionsModalError = signal('');
// TASK SUBMISSION GRADING
gradingSubmissionId = signal<number | null>(null);
savingGrade = signal(false);
gradeInput: number | null = null;
feedbackInput = '';
gradeError = signal('');

  // =====================================================
  // TASK ACTIONS
  // =====================================================

  updatingTaskId = signal<number | null>(null);
  deletingTaskId = signal<number | null>(null);
  showDeleteModal = signal(false);
taskToDelete = signal<TaskDto | null>(null);


  // =====================================================
  // CREATE MODAL
  // =====================================================

  showCreateModal = signal(false);


  // =====================================================
  // CREATE TASK FORM
  // =====================================================

  newTaskTitle = '';
  newTaskDescription = '';
  newTaskDueDate = '';
  newTaskPriority: TaskPriority = 'Medium';
  newTaskStatus: TaskStatus = 'Open';


  // =====================================================
  // OPTIONS
  // =====================================================

  get priorityChoices() {
    return this.constants.supportedChoices('NFD_TSK_PRI', this.priorityOptions.map(value => ({value, label: value})));
  }
  readonly priorityOptions: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private api: TrainerApi,
    private auth: AuthService,
    private route: ActivatedRoute
  ) {}


  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    this.constants.ensure('NFD_TSK_PRI');
    const batchIdParam = this.route.snapshot.queryParamMap.get('batchId');

    if (batchIdParam) {
      const parsedBatchId = Number(batchIdParam);

      if (!Number.isNaN(parsedBatchId) && parsedBatchId > 0) {
        this.requestedBatchId = parsedBatchId;
      }
    }

    this.loadCurrentTrainer();
  }


  // =====================================================
  // CURRENT TRAINER
  // =====================================================

  private resetData(): void {
    this.trainer.set(null);
    this.batches.set([]);
    this.tasks.set([]);
    this.submissionsByTask.set({});
    this.batchIdInput = 0;
  }

  private loadCurrentTrainer(): void {
    const userId = this.auth.session()?.userId;

    if (!userId) {
      this.resetData();
      this.errorMessage.set('تعذر تحديد المستخدم الحالي');
      return;
    }

    this.loadingBatches.set(true);
    this.errorMessage.set('');

    this.api.getTrainerByUserId(userId).subscribe({
      next: (trainer) => {
        this.trainer.set(trainer);
        this.loadBatches(trainer.trainerId);
      },

      error: (error) => {
        console.error('Error loading current trainer:', error);
        this.resetData();
        this.loadingBatches.set(false);
        this.errorMessage.set('تعذر تحميل بيانات المدرب الحالي');
      }
    });
  }


  // =====================================================
  // LOAD BATCHES
  // =====================================================

  private loadBatches(trainerId: number): void {
    this.loadingBatches.set(true);
    this.errorMessage.set('');

    this.batches.set([]);
    this.tasks.set([]);
    this.submissionsByTask.set({});
    this.batchIdInput = 0;

    this.api.getMyBatches(trainerId).subscribe({
      next: (data) => {
        const result = data ?? [];

        this.batches.set(result);
        this.loadingBatches.set(false);

        if (result.length > 0) {
          const requestedBatch = this.requestedBatchId
            ? result.find(batch => batch.batchId === this.requestedBatchId)
            : undefined;

          this.batchIdInput = requestedBatch
            ? requestedBatch.batchId
            : result[0].batchId;

          this.loadTasks();
        } else {
          this.batchIdInput = 0;
          this.tasks.set([]);
          this.submissionsByTask.set({});
          this.errorMessage.set('لا توجد دفعات مسندة لهذا المدرب');
        }
      },

      error: (error) => {
        console.error('Error loading batches:', error);

        this.batches.set([]);
        this.tasks.set([]);
        this.submissionsByTask.set({});
        this.batchIdInput = 0;
        this.loadingBatches.set(false);
        this.errorMessage.set('تعذر تحميل دفعات المدرب');
      }
    });
  }


  // =====================================================
  // BATCH CHANGE
  // =====================================================

  onBatchChange(): void {
    if (!this.batchIdInput) {
      this.tasks.set([]);
      this.submissionsByTask.set({});
      return;
    }

    this.loadTasks();
  }


  // =====================================================
  // SELECTED BATCH
  // =====================================================

  selectedBatch(): TrainerBatchDto | undefined {
    return this.batches().find(batch => batch.batchId === this.batchIdInput);
  }


  // =====================================================
  // LOAD TASKS
  // =====================================================

  loadTasks(): void {
    if (!this.batchIdInput) {
      this.tasks.set([]);
      this.submissionsByTask.set({});
      return;
    }

    const batchIsAssigned = this.batches()
      .some(batch => batch.batchId === this.batchIdInput);

    if (!batchIsAssigned) {
      this.tasks.set([]);
      this.submissionsByTask.set({});
      this.errorMessage.set('هذه الدفعة غير مسندة للمدرب الحالي');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.submissionsByTask.set({});

    this.api.getTasksByBatch(this.batchIdInput).subscribe({
      next: (data) => {
        const result = data ?? [];

        this.tasks.set(result);
        this.loading.set(false);
        this.loadTaskSubmissions(result);
      },

      error: (error) => {
        console.error('Error loading tasks:', error);

        this.tasks.set([]);
        this.submissionsByTask.set({});
        this.errorMessage.set('تعذر تحميل المهام');
        this.loading.set(false);
      }
    });
  }


  // =====================================================
  // LOAD TASK SUBMISSIONS
  // =====================================================

  private loadTaskSubmissions(tasks: TaskDto[]): void {
    if (tasks.length === 0) {
      this.submissionsByTask.set({});
      this.loadingSubmissions.set(false);
      return;
    }

    this.loadingSubmissions.set(true);

    const requests = tasks.map(task =>
      this.api.getSubmissionsByTask(task.taskId).pipe(
        map(submissions => ({
          taskId: task.taskId,
          submissions: submissions ?? []
        })),

        catchError(error => {
          console.error(
            `Error loading submissions for task ${task.taskId}:`,
            error
          );

          return of({
            taskId: task.taskId,
            submissions: [] as SubmissionDto[]
          });
        })
      )
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        const resultMap: Record<number, SubmissionDto[]> = {};

        for (const result of results) {
          resultMap[result.taskId] = result.submissions;
        }

        this.submissionsByTask.set(resultMap);
        this.loadingSubmissions.set(false);
      },

      error: (error) => {
        console.error('Error loading task submissions:', error);
        this.submissionsByTask.set({});
        this.loadingSubmissions.set(false);
      }
    });
  }


  // =====================================================
  // SUBMISSION HELPERS
  // =====================================================

  taskSubmissions(taskId: number): SubmissionDto[] {
    return this.submissionsByTask()[taskId] ?? [];
  }

  totalSubmissions(taskId: number): number {
    return this.taskSubmissions(taskId).length;
  }

  submissionsNeedingReview(taskId: number): number {
    return this.taskSubmissions(taskId).filter(
      s =>
        s.status === 'Submitted' ||
        s.status === 'UnderReview' ||
        s.status === 'Late'
    ).length;
  }

  gradedSubmissions(taskId: number): number {
    return this.taskSubmissions(taskId)
      .filter(s => s.status === 'Graded').length;
  }

  returnedForRevisionSubmissions(taskId: number): number {
    return this.taskSubmissions(taskId)
      .filter(s => s.status === 'ReturnedForRevision').length;
  }


  // =====================================================
  // LATE CALCULATIONS
  // =====================================================

  /** عدد أيام التأخير (يُقرّب للأعلى) — 0 إذا لم يكن متأخرًا */
  lateDays(task: TaskDto, submission: SubmissionDto): number {
    const due = new Date(task.dueDate).getTime();
    const submitted = new Date(submission.submittedAt).getTime();

    if (Number.isNaN(due) || Number.isNaN(submitted) || submitted <= due) {
      return 0;
    }

    return Math.ceil((submitted - due) / 86400000);
  }

  /** ✅ هل التسليم متأخر؟ — يعتمد على مقارنة التواريخ فقط، يتجاهل status الباك إند */
  isSubmissionLate(task: TaskDto, submission: SubmissionDto): boolean {
    return this.lateDays(task, submission) > 0;
  }

  /** ✅ مدة التأخير نصًا — يعتمد على التواريخ فقط */
  lateDuration(task: TaskDto, submission: SubmissionDto): string {
    const due = new Date(task.dueDate).getTime();
    const submitted = new Date(submission.submittedAt).getTime();

    if (Number.isNaN(due) || Number.isNaN(submitted) || submitted <= due) {
      return '';
    }

    return this.formatDuration(submitted - due);
  }

  /** هل تجاوزت المهمة موعد التسليم الآن؟ */
  isTaskPastDue(task: TaskDto): boolean {
    const due = new Date(task.dueDate).getTime();
    return !Number.isNaN(due) && Date.now() > due;
  }

  /** المدة التي مرّت منذ موعد التسليم حتى الآن */
  overdueDuration(task: TaskDto): string {
    const due = new Date(task.dueDate).getTime();

    if (Number.isNaN(due) || Date.now() <= due) {
      return '';
    }

    return this.formatDuration(Date.now() - due);
  }

  /** عدد التسليمات المتأخرة للمهمة */
  lateSubmissionsCount(taskId: number): number {
    const task = this.tasks().find(t => t.taskId === taskId);

    if (!task) {
      return 0;
    }

    return this.taskSubmissions(taskId)
      .filter(s => this.isSubmissionLate(task, s)).length;
  }

  private formatDuration(ms: number): string {
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);

    const parts: string[] = [];

    if (days > 0) parts.push(`${days} يوم`);
    if (hours > 0) parts.push(`${hours} ساعة`);

    return parts.length ? parts.join(' و ') : 'أقل من ساعة';
  }


  // =====================================================
  // OPEN SUBMISSIONS MODAL
  // =====================================================

  openSubmissionsModal(task: TaskDto): void {
    this.selectedSubmissionsTask.set(task);
    this.showSubmissionsModal.set(true);
    this.modalLoadingSubmissions.set(true);
    this.submissionsModalError.set('');

    this.api.getTrainerTaskSubmissions(task.taskId).subscribe({
      next: (submissions) => {
        const currentMap = { ...this.submissionsByTask() };

        currentMap[task.taskId] = submissions ?? [];

        this.submissionsByTask.set(currentMap);
        this.modalLoadingSubmissions.set(false);
      },

      error: (error) => {
        console.error('Error loading trainer task submissions:', error);

        this.modalLoadingSubmissions.set(false);
        this.submissionsModalError.set('تعذر تحميل تسليمات المهمة.');
      }
    });
  }


  // =====================================================
  // CLOSE SUBMISSIONS MODAL
  // =====================================================

 closeSubmissionsModal(): void {
  if (this.savingGrade()) return;

  this.cancelSubmissionGrading();

  this.showSubmissionsModal.set(false);
  this.selectedSubmissionsTask.set(null);
  this.modalLoadingSubmissions.set(false);
  this.submissionsModalError.set('');
}


  // =====================================================
  // SELECTED TASK SUBMISSIONS
  // =====================================================
// OPEN SUBMISSION GRADING
openSubmissionGrading(submission: SubmissionDto): void {
  this.gradingSubmissionId.set(submission.submissionId);

  this.gradeInput =
    submission.grade !== null &&
    submission.grade !== undefined &&
    submission.grade !== ''
      ? Number(submission.grade)
      : null;

  this.feedbackInput = submission.feedback ?? '';
  this.gradeError.set('');
}

// CANCEL SUBMISSION GRADING
cancelSubmissionGrading(): void {
  if (this.savingGrade()) return;

  this.gradingSubmissionId.set(null);
  this.gradeInput = null;
  this.feedbackInput = '';
  this.gradeError.set('');
}
// SAVE SUBMISSION GRADE
saveSubmissionGrade(submission: SubmissionDto): void {
  this.gradeError.set('');

  if (
    this.gradeInput === null ||
    !Number.isFinite(this.gradeInput) ||
    this.gradeInput < 0 ||
    this.gradeInput > 100
  ) {
    this.gradeError.set('يرجى إدخال درجة صحيحة من 0 إلى 100');
    return;
  }

  if (this.savingGrade()) return;

  this.savingGrade.set(true);

 const payload = {
  grade: String(this.gradeInput),
  feedback: this.feedbackInput.trim()
};

  this.api.gradeSubmission(
    submission.submissionId,
    payload
  ).subscribe({
    next: () => {
      this.savingGrade.set(false);

      const task = this.selectedSubmissionsTask();

      if (task) {
        this.openSubmissionsModal(task);
      }

      this.cancelSubmissionGrading();
    },

    error: (error) => {
      console.error('Error grading submission:', error);
      this.savingGrade.set(false);
      this.gradeError.set('تعذر حفظ التقييم، يرجى المحاولة مرة أخرى');
    }
  });
}
  selectedTaskSubmissions(): SubmissionDto[] {
    const task = this.selectedSubmissionsTask();

    if (!task) {
      return [];
    }

    return this.taskSubmissions(task.taskId);
  }


  // =====================================================
  // SUBMISSION STATUS LABEL / CLASS
  // =====================================================

  submissionStatusLabel(status: SubmissionDto['status']): string {
    switch (status) {
      case 'Submitted': return 'تم التسليم';
      case 'UnderReview': return 'قيد المراجعة';
      case 'Graded': return 'تم التقييم';
      case 'ReturnedForRevision': return 'معاد للتعديل';
      case 'Late': return 'متأخر';
      default: return status;
    }
  }

  submissionStatusClass(status: SubmissionDto['status']): string {
    switch (status) {
      case 'Submitted': return 'submitted';
      case 'UnderReview': return 'review';
      case 'Graded': return 'graded';
      case 'ReturnedForRevision': return 'revision';
      case 'Late': return 'late';
      default: return '';
    }
  }


  // =====================================================
  // OPEN SUBMISSION FILE
  // =====================================================
openSubmissionFile(submission: SubmissionDto): void {
  this.submissionsModalError.set('');

  this.api.getSubmissionFile(submission.submissionId).subscribe({
    next: (blob) => {
      const fileUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `submission-${submission.submissionId}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
    },
    error: (error) => {
      console.error('Error downloading submission:', error);
      this.submissionsModalError.set(
        'تعذر تحميل ملف التسليم.'
      );
    }
  });
}

  // =====================================================
  // FILTER
  // =====================================================

  col(status: TaskStatus): TaskDto[] {
    return this.tasks().filter(task => task.status === status);
  }


  // =====================================================
  // UPDATE TASK STATUS
  // =====================================================

  updateTaskStatus(task: TaskDto, newStatus: TaskStatus): void {
      if (newStatus === 'Overdue') {
    this.errorMessage.set(
      'لا يمكن استخدام حالة متأخرة لاعتماد اكتمال التقييم.'
    );
    return;
  }
    if (this.updatingTaskId() !== null || this.deletingTaskId() !== null) {
      return;
    }

    this.errorMessage.set('');
    this.updatingTaskId.set(task.taskId);

    const payload = {
      title: task.title,
      description: task.description ?? '',
      dueDate: task.dueDate,
      priority: task.priority,
      status: newStatus,
      batchId: task.batchId,
      createdByUserId: task.createdByUserId
    };

    this.api.updateTask(task.taskId, payload).subscribe({
      next: () => {
        this.updatingTaskId.set(null);
        this.loadTasks();
      },

      error: (error) => {
        console.error('Error updating task status:', error);
        this.updatingTaskId.set(null);
        this.errorMessage.set('تعذر تحديث حالة المهمة');
      }
    });
  }


  // =====================================================
  // DELETE TASK
  // =====================================================
deleteTask(task: TaskDto): void {
  if (this.deletingTaskId() !== null || this.updatingTaskId() !== null) {
    return;
  }

  this.errorMessage.set('');

  this.api.getSubmissionsByTask(task.taskId).subscribe({
    next: (submissions) => {
      if (submissions && submissions.length > 0) {
        this.errorMessage.set(
          'لا يمكن حذف هذه المهمة لأنها تحتوي على تسليمات من المتدربين.'
        );
        return;
      }

      this.taskToDelete.set(task);
      this.showDeleteModal.set(true);
    },

    error: (error) => {
      console.error('Error checking task submissions:', error);
      this.errorMessage.set('تعذر التحقق من تسليمات المهمة.');
    }
  });

  }
closeDeleteModal(): void {
  this.showDeleteModal.set(false);
  this.taskToDelete.set(null);
}

confirmDeleteTask(): void {
  const task = this.taskToDelete();

  if (!task || this.deletingTaskId() !== null) {
    return;
  }

  this.deletingTaskId.set(task.taskId);

  this.api.deleteTask(task.taskId).subscribe({
    next: () => {
      this.deletingTaskId.set(null);
      this.closeDeleteModal();
      this.loadTasks();
    },
    error: (error) => {
      console.error('Error deleting task:', error);
      this.deletingTaskId.set(null);
      this.errorMessage.set('تعذر حذف المهمة.');
      this.closeDeleteModal();
    }
  });
}

  // =====================================================
  // OPEN / CLOSE CREATE MODAL
  // =====================================================

  openCreateModal(): void {
    if (!this.batchIdInput) {
      this.errorMessage.set('يرجى اختيار الدفعة أولاً');
      return;
    }

    this.resetCreateForm();
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    if (this.saving()) {
      return;
    }

    this.showCreateModal.set(false);
    this.errorMessage.set('');
  }


  // =====================================================
  // RESET FORM
  // =====================================================

  resetCreateForm(): void {
    this.newTaskTitle = '';
    this.newTaskDescription = '';
    this.newTaskDueDate = '';
    this.newTaskPriority = 'Medium';
    this.newTaskStatus = 'Open';
    this.errorMessage.set('');
  }


  // =====================================================
  // CURRENT LOGGED USER
  // =====================================================

  private getCreatedByUserId(): number {
    return this.auth.session()?.userId ?? 0;
  }


  // =====================================================
  // SAVE TASK
  // =====================================================

  saveTask(): void {
    this.errorMessage.set('');

    if (!this.constants.isSelectable('NFD_TSK_PRI', this.newTaskPriority)) {
      this.errorMessage.set('اختر أولوية مفعّلة للمهمة.');
      return;
    }
    if (!this.newTaskTitle.trim()) {
      this.errorMessage.set('يرجى إدخال عنوان المهمة');
      return;
    }

    if (!this.newTaskDueDate) {
      this.errorMessage.set('يرجى تحديد موعد التسليم');
      return;
    }

    if (!this.batchIdInput || this.batchIdInput <= 0) {
      this.errorMessage.set('يرجى اختيار الدفعة');
      return;
    }

    const batchIsAssigned = this.batches()
      .some(batch => batch.batchId === this.batchIdInput);

    if (!batchIsAssigned) {
      this.errorMessage.set('لا يمكن إنشاء مهمة لدفعة غير مسندة للمدرب الحالي');
      return;
    }

    const createdByUserId = this.getCreatedByUserId();

    if (!createdByUserId) {
      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي. تأكدي من بيانات تسجيل الدخول.'
      );
      return;
    }

    const payload = {
      title: this.newTaskTitle.trim(),
      description: this.newTaskDescription.trim(),
      dueDate: new Date(this.newTaskDueDate).toISOString(),
      priority: this.newTaskPriority,
      status: this.newTaskStatus,
      batchId: this.batchIdInput,
      createdByUserId
    };

    this.saving.set(true);

    this.api.createTask(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.showCreateModal.set(false);
        this.resetCreateForm();
        this.loadTasks();
      },

      error: (error) => {
        console.error('Error creating task:', error);
        this.errorMessage.set('حدث خطأ أثناء إنشاء المهمة');
        this.saving.set(false);
      }
    });
  }
  saveProject(): void {
  this.projectError.set('');

  if (!this.newProjectTitle.trim()) {
    this.projectError.set('يرجى إدخال عنوان المشروع');
    return;
  }

  if (!this.newProjectStartDate || !this.newProjectEndDate) {
    this.projectError.set('يرجى تحديد تاريخ البداية والنهاية');
    return;
  }

  if (this.newProjectEndDate < this.newProjectStartDate) {
    this.projectError.set('تاريخ النهاية يجب ألا يسبق تاريخ البداية');
    return;
  }

  if (this.newProjectProgramId <= 0) {
    this.projectError.set('تعذر تحديد برنامج المشروع');
    return;
  }

  const payload = {
    title: this.newProjectTitle.trim(),
    description: this.newProjectDescription.trim(),
    startDate: new Date(this.newProjectStartDate + 'T00:00:00').toISOString(),
    endDate: new Date(this.newProjectEndDate + 'T00:00:00').toISOString(),
    status: this.newProjectStatus,
    programId: this.newProjectProgramId
  };

  this.projectSaving.set(true);

  this.api.createProject(payload).subscribe({
    next: () => {
      this.projectSaving.set(false);
      this.closeProjectCreateModal();
       this.loadProjects();

      this.newProjectTitle = '';
      this.newProjectDescription = '';
      this.newProjectStartDate = '';
      this.newProjectEndDate = '';
      this.newProjectStatus = 'Planned';
    },
    error: (error) => {
      console.error('Error creating project:', error);
      this.projectSaving.set(false);
      this.projectError.set('تعذر إنشاء المشروع');
    }
  });
}

}