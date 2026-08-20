import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  RouterLink,
  ActivatedRoute
} from '@angular/router';

import {
  catchError,
  forkJoin,
  map,
  of
} from 'rxjs';

import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  SubmissionDto,
  TaskDto,
  TrainerBatchDto,
  TrainerDto
} from '../../../../core/models/dtos';

import {
  TaskPriority,
  TaskStatus
} from '../../../../core/models/enums';


@Component({
  selector: 'app-trainer-tasks',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
    templateUrl: './tasks.html',
  styleUrl: './tasks.scss',

})
export class TrainerTasks implements OnInit {

  // =====================================================
  // TRAINER
  // =====================================================

  trainer =
    signal<TrainerDto | null>(
      null
    );


  // =====================================================
  // BATCHES
  // =====================================================

  batches =
    signal<TrainerBatchDto[]>(
      []
    );

  batchIdInput = 0;

  loadingBatches =
    signal(false);

  requestedBatchId:
    number | null = null;


  // =====================================================
  // TASKS
  // =====================================================

  tasks =
    signal<TaskDto[]>(
      []
    );

  loading =
    signal(false);

  saving =
    signal(false);

  errorMessage =
    signal('');


  // =====================================================
  // TASK SUBMISSIONS
  // =====================================================

  submissionsByTask =
    signal<
      Record<number, SubmissionDto[]>
    >({});

  loadingSubmissions =
    signal(false);


  // =====================================================
  // SUBMISSIONS VIEW MODAL
  // =====================================================

  showSubmissionsModal =
    signal(false);

  selectedSubmissionsTask =
    signal<TaskDto | null>(
      null
    );

  modalLoadingSubmissions =
    signal(false);

  submissionsModalError =
    signal('');


  // =====================================================
  // TASK ACTIONS
  // =====================================================

  updatingTaskId =
    signal<number | null>(
      null
    );

  deletingTaskId =
    signal<number | null>(
      null
    );


  // =====================================================
  // CREATE MODAL
  // =====================================================

  showCreateModal =
    signal(false);


  // =====================================================
  // CREATE TASK FORM
  // =====================================================

  newTaskTitle = '';

  newTaskDescription = '';

  newTaskDueDate = '';

  newTaskPriority:
    TaskPriority =
      'Medium';

  newTaskStatus:
    TaskStatus =
      'Open';


  // =====================================================
  // OPTIONS
  // =====================================================

  priorityOptions: {
    value: TaskPriority;
    label: string;
  }[] = [

    {
      value: 'Low',
      label: 'منخفضة'
    },

    {
      value: 'Medium',
      label: 'متوسطة'
    },

    {
      value: 'High',
      label: 'عالية'
    },

    {
      value: 'Critical',
      label: 'حرجة'
    }

  ];


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

    const batchIdParam =
      this.route
        .snapshot
        .queryParamMap
        .get('batchId');


    if (batchIdParam) {

      const parsedBatchId =
        Number(
          batchIdParam
        );


      if (
        !Number.isNaN(
          parsedBatchId
        ) &&
        parsedBatchId > 0
      ) {

        this.requestedBatchId =
          parsedBatchId;
      }
    }


    this.loadCurrentTrainer();
  }


  // =====================================================
  // CURRENT TRAINER
  // =====================================================

  private loadCurrentTrainer(): void {

    const userId =
      this.auth
        .session()
        ?.userId;


    if (!userId) {

      this.trainer.set(
        null
      );

      this.batches.set(
        []
      );

      this.tasks.set(
        []
      );

      this.submissionsByTask.set(
        {}
      );

      this.batchIdInput = 0;

      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي'
      );

      return;
    }


    this.loadingBatches.set(
      true
    );

    this.errorMessage.set(
      ''
    );


    this.api
      .getTrainerByUserId(
        userId
      )
      .subscribe({

        next: (trainer) => {

          this.trainer.set(
            trainer
          );


          this.loadBatches(
            trainer.trainerId
          );
        },


        error: (error) => {

          console.error(
            'Error loading current trainer:',
            error
          );


          this.trainer.set(
            null
          );

          this.batches.set(
            []
          );

          this.tasks.set(
            []
          );

          this.submissionsByTask.set(
            {}
          );

          this.batchIdInput = 0;

          this.loadingBatches.set(
            false
          );

          this.errorMessage.set(
            'تعذر تحميل بيانات المدرب الحالي'
          );
        }

      });
  }


  // =====================================================
  // LOAD BATCHES
  // =====================================================

  private loadBatches(
    trainerId: number
  ): void {

    this.loadingBatches.set(
      true
    );

    this.errorMessage.set(
      ''
    );


    this.batches.set(
      []
    );

    this.tasks.set(
      []
    );

    this.submissionsByTask.set(
      {}
    );

    this.batchIdInput = 0;


    this.api
      .getMyBatches(
        trainerId
      )
      .subscribe({

        next: (data) => {

          const result =
            data ?? [];


          this.batches.set(
            result
          );

          this.loadingBatches.set(
            false
          );


          if (
            result.length > 0
          ) {

            const requestedBatch =
              this.requestedBatchId

                ? result.find(
                    batch =>
                      batch.batchId ===
                      this.requestedBatchId
                  )

                : undefined;


            this.batchIdInput =
              requestedBatch

                ? requestedBatch.batchId

                : result[0].batchId;


            this.loadTasks();

          } else {

            this.batchIdInput =
              0;

            this.tasks.set(
              []
            );

            this.submissionsByTask.set(
              {}
            );

            this.errorMessage.set(
              'لا توجد دفعات مسندة لهذا المدرب'
            );
          }

        },


        error: (error) => {

          console.error(
            'Error loading batches:',
            error
          );


          this.batches.set(
            []
          );

          this.tasks.set(
            []
          );

          this.submissionsByTask.set(
            {}
          );

          this.batchIdInput = 0;

          this.loadingBatches.set(
            false
          );

          this.errorMessage.set(
            'تعذر تحميل دفعات المدرب'
          );
        }

      });
  }


  // =====================================================
  // BATCH CHANGE
  // =====================================================

  onBatchChange(): void {

    if (
      !this.batchIdInput
    ) {

      this.tasks.set(
        []
      );

      this.submissionsByTask.set(
        {}
      );

      return;
    }


    this.loadTasks();
  }


  // =====================================================
  // SELECTED BATCH
  // =====================================================

  selectedBatch():
    TrainerBatchDto | undefined {

    return this.batches()
      .find(
        batch =>
          batch.batchId ===
          this.batchIdInput
      );
  }


  // =====================================================
  // LOAD TASKS
  // =====================================================

  loadTasks(): void {

    if (
      !this.batchIdInput
    ) {

      this.tasks.set(
        []
      );

      this.submissionsByTask.set(
        {}
      );

      return;
    }


    const batchIsAssigned =
      this.batches()
        .some(
          batch =>
            batch.batchId ===
            this.batchIdInput
        );


    if (
      !batchIsAssigned
    ) {

      this.tasks.set(
        []
      );

      this.submissionsByTask.set(
        {}
      );

      this.errorMessage.set(
        'هذه الدفعة غير مسندة للمدرب الحالي'
      );

      return;
    }


    this.loading.set(
      true
    );

    this.errorMessage.set(
      ''
    );

    this.submissionsByTask.set(
      {}
    );


    this.api
      .getTasksByBatch(
        this.batchIdInput
      )
      .subscribe({

        next: (data) => {

          const result =
            data ?? [];


          this.tasks.set(
            result
          );


          this.loading.set(
            false
          );


          this.loadTaskSubmissions(
            result
          );
        },


        error: (error) => {

          console.error(
            'Error loading tasks:',
            error
          );


          this.tasks.set(
            []
          );

          this.submissionsByTask.set(
            {}
          );

          this.errorMessage.set(
            'تعذر تحميل المهام'
          );

          this.loading.set(
            false
          );
        }

      });
  }


  // =====================================================
  // LOAD TASK SUBMISSIONS
  // =====================================================

  private loadTaskSubmissions(
    tasks: TaskDto[]
  ): void {

    if (
      tasks.length === 0
    ) {

      this.submissionsByTask.set(
        {}
      );

      this.loadingSubmissions.set(
        false
      );

      return;
    }


    this.loadingSubmissions.set(
      true
    );


    const requests =
      tasks.map(
        task =>

          this.api
            .getSubmissionsByTask(
              task.taskId
            )
            .pipe(

              map(
                submissions => ({

                  taskId:
                    task.taskId,

                  submissions:
                    submissions ?? []

                })
              ),

              catchError(
                error => {

                  console.error(
                    `Error loading submissions for task ${task.taskId}:`,
                    error
                  );


                  return of({

                    taskId:
                      task.taskId,

                    submissions:
                      [] as SubmissionDto[]

                  });
                }
              )

            )
      );


    forkJoin(
      requests
    )
      .subscribe({

        next: (results) => {

          const resultMap:
            Record<
              number,
              SubmissionDto[]
            > = {};


          for (
            const result
            of results
          ) {

            resultMap[
              result.taskId
            ] =
              result.submissions;
          }


          this.submissionsByTask.set(
            resultMap
          );

          this.loadingSubmissions.set(
            false
          );
        },


        error: (error) => {

          console.error(
            'Error loading task submissions:',
            error
          );


          this.submissionsByTask.set(
            {}
          );

          this.loadingSubmissions.set(
            false
          );
        }

      });
  }


  // =====================================================
  // SUBMISSION HELPERS
  // =====================================================

  taskSubmissions(
    taskId: number
  ): SubmissionDto[] {

    return (
      this.submissionsByTask()[
        taskId
      ] ?? []
    );
  }


  totalSubmissions(
    taskId: number
  ): number {

    return this
      .taskSubmissions(
        taskId
      )
      .length;
  }


  submissionsNeedingReview(
    taskId: number
  ): number {

    return this
      .taskSubmissions(
        taskId
      )
      .filter(
        submission =>

          submission.status ===
            'Submitted' ||

          submission.status ===
            'UnderReview' ||

          submission.status ===
            'Late'
      )
      .length;
  }


  gradedSubmissions(
    taskId: number
  ): number {

    return this
      .taskSubmissions(
        taskId
      )
      .filter(
        submission =>
          submission.status ===
          'Graded'
      )
      .length;
  }


  returnedForRevisionSubmissions(
    taskId: number
  ): number {

    return this
      .taskSubmissions(
        taskId
      )
      .filter(
        submission =>
          submission.status ===
          'ReturnedForRevision'
      )
      .length;
  }


  // =====================================================
  // OPEN SUBMISSIONS MODAL
  // =====================================================

  openSubmissionsModal(
    task: TaskDto
  ): void {

    this.selectedSubmissionsTask.set(
      task
    );

    this.showSubmissionsModal.set(
      true
    );

    this.modalLoadingSubmissions.set(
      true
    );

    this.submissionsModalError.set(
      ''
    );


    // نجيب أحدث التسليمات من الباك إند
    this.api
      .getSubmissionsByTask(
        task.taskId
      )
      .subscribe({

        next: (submissions) => {

          const currentMap = {
            ...this.submissionsByTask()
          };


          currentMap[
            task.taskId
          ] =
            submissions ?? [];


          this.submissionsByTask.set(
            currentMap
          );

          this.modalLoadingSubmissions.set(
            false
          );
        },


        error: (error) => {

          console.error(
            'Error loading task submissions:',
            error
          );

          this.modalLoadingSubmissions.set(
            false
          );

          this.submissionsModalError.set(
            'تعذر تحميل تسليمات المهمة.'
          );
        }

      });
  }


  // =====================================================
  // CLOSE SUBMISSIONS MODAL
  // =====================================================

  closeSubmissionsModal(): void {

    this.showSubmissionsModal.set(
      false
    );

    this.selectedSubmissionsTask.set(
      null
    );

    this.modalLoadingSubmissions.set(
      false
    );

    this.submissionsModalError.set(
      ''
    );
  }


  // =====================================================
  // SELECTED TASK SUBMISSIONS
  // =====================================================

  selectedTaskSubmissions():
    SubmissionDto[] {

    const task =
      this.selectedSubmissionsTask();


    if (!task) {

      return [];
    }


    return this.taskSubmissions(
      task.taskId
    );
  }


  // =====================================================
  // SUBMISSION STATUS LABEL
  // =====================================================

  submissionStatusLabel(
    status: SubmissionDto['status']
  ): string {

    switch (status) {

      case 'Submitted':
        return 'تم التسليم';

      case 'UnderReview':
        return 'قيد المراجعة';

      case 'Graded':
        return 'تم التقييم';

      case 'ReturnedForRevision':
        return 'معاد للتعديل';

      case 'Late':
        return 'متأخر';

      default:
        return status;
    }
  }


  // =====================================================
  // SUBMISSION STATUS CLASS
  // =====================================================

  submissionStatusClass(
    status: SubmissionDto['status']
  ): string {

    switch (status) {

      case 'Submitted':
        return 'submitted';

      case 'UnderReview':
        return 'review';

      case 'Graded':
        return 'graded';

      case 'ReturnedForRevision':
        return 'revision';

      case 'Late':
        return 'late';

      default:
        return '';
    }
  }


  // =====================================================
  // FILTER
  // =====================================================

  col(
    status: TaskStatus
  ): TaskDto[] {

    return this.tasks()
      .filter(
        task =>
          task.status === status
      );
  }


  // =====================================================
  // UPDATE TASK STATUS
  // =====================================================

  updateTaskStatus(
    task: TaskDto,
    newStatus: TaskStatus
  ): void {

    if (
      this.updatingTaskId() !==
        null ||

      this.deletingTaskId() !==
        null
    ) {

      return;
    }


    this.errorMessage.set(
      ''
    );

    this.updatingTaskId.set(
      task.taskId
    );


    const payload = {

      title:
        task.title,

      description:
        task.description ?? '',

      dueDate:
        task.dueDate,

      priority:
        task.priority,

      status:
        newStatus,

      batchId:
        task.batchId,

      createdByUserId:
        task.createdByUserId

    };


    this.api
      .updateTask(
        task.taskId,
        payload
      )
      .subscribe({

        next: () => {

          this.updatingTaskId.set(
            null
          );

          this.loadTasks();
        },


        error: (error) => {

          console.error(
            'Error updating task status:',
            error
          );


          this.updatingTaskId.set(
            null
          );

          this.errorMessage.set(
            'تعذر تحديث حالة المهمة'
          );
        }

      });
  }


  // =====================================================
  // DELETE TASK
  // =====================================================

  deleteTask(
    task: TaskDto
  ): void {

    if (
      this.deletingTaskId() !==
        null ||

      this.updatingTaskId() !==
        null
    ) {

      return;
    }


    this.errorMessage.set(
      ''
    );


    this.api
      .getSubmissionsByTask(
        task.taskId
      )
      .subscribe({

        next: (submissions) => {

          if (
            submissions &&
            submissions.length > 0
          ) {

            this.errorMessage.set(
              'لا يمكن حذف هذه المهمة لأنها تحتوي على تسليمات من المتدربين.'
            );

            return;
          }


          const confirmed =
            window.confirm(
              `هل أنت متأكد من حذف المهمة "${task.title}"؟`
            );


          if (
            !confirmed
          ) {

            return;
          }


          this.deletingTaskId.set(
            task.taskId
          );


          this.api
            .deleteTask(
              task.taskId
            )
            .subscribe({

              next: () => {

                this.deletingTaskId.set(
                  null
                );


                this.loadTasks();
              },


              error: (error) => {

                console.error(
                  'Error deleting task:',
                  error
                );


                this.deletingTaskId.set(
                  null
                );

                this.errorMessage.set(
                  'تعذر حذف المهمة.'
                );
              }

            });
        },


        error: (error) => {

          console.error(
            'Error checking task submissions:',
            error
          );


          this.errorMessage.set(
            'تعذر التحقق من تسليمات المهمة.'
          );
        }

      });
  }


  // =====================================================
  // OPEN CREATE MODAL
  // =====================================================

  openCreateModal(): void {

    if (
      !this.batchIdInput
    ) {

      this.errorMessage.set(
        'يرجى اختيار الدفعة أولاً'
      );

      return;
    }


    this.resetCreateForm();


    this.showCreateModal.set(
      true
    );
  }


  // =====================================================
  // CLOSE CREATE MODAL
  // =====================================================

  closeCreateModal(): void {

    if (
      this.saving()
    ) {

      return;
    }


    this.showCreateModal.set(
      false
    );

    this.errorMessage.set(
      ''
    );
  }


  // =====================================================
  // RESET FORM
  // =====================================================

  resetCreateForm(): void {

    this.newTaskTitle = '';

    this.newTaskDescription = '';

    this.newTaskDueDate = '';

    this.newTaskPriority =
      'Medium';

    this.newTaskStatus =
      'Open';

    this.errorMessage.set(
      ''
    );
  }


  // =====================================================
  // CURRENT LOGGED USER
  // =====================================================

  private getCreatedByUserId():
    number {

    return (
      this.auth
        .session()
        ?.userId
      ?? 0
    );
  }


  // =====================================================
  // SAVE TASK
  // =====================================================

  saveTask(): void {

    this.errorMessage.set(
      ''
    );


    if (
      !this.newTaskTitle.trim()
    ) {

      this.errorMessage.set(
        'يرجى إدخال عنوان المهمة'
      );

      return;
    }


    if (
      !this.newTaskDueDate
    ) {

      this.errorMessage.set(
        'يرجى تحديد موعد التسليم'
      );

      return;
    }


    if (
      !this.batchIdInput ||
      this.batchIdInput <= 0
    ) {

      this.errorMessage.set(
        'يرجى اختيار الدفعة'
      );

      return;
    }


    const batchIsAssigned =
      this.batches()
        .some(
          batch =>
            batch.batchId ===
            this.batchIdInput
        );


    if (
      !batchIsAssigned
    ) {

      this.errorMessage.set(
        'لا يمكن إنشاء مهمة لدفعة غير مسندة للمدرب الحالي'
      );

      return;
    }


    const createdByUserId =
      this.getCreatedByUserId();


    if (
      !createdByUserId
    ) {

      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي. تأكدي من بيانات تسجيل الدخول.'
      );

      return;
    }


    const payload = {

      title:
        this.newTaskTitle.trim(),

      description:
        this.newTaskDescription.trim(),

      dueDate:
        new Date(
          this.newTaskDueDate
        ).toISOString(),

      priority:
        this.newTaskPriority,

      status:
        this.newTaskStatus,

      batchId:
        this.batchIdInput,

      createdByUserId:
        createdByUserId

    };


    this.saving.set(
      true
    );


    this.api
      .createTask(
        payload
      )
      .subscribe({

        next: () => {

          this.saving.set(
            false
          );

          this.showCreateModal.set(
            false
          );

          this.resetCreateForm();

          this.loadTasks();
        },


        error: (error) => {

          console.error(
            'Error creating task:',
            error
          );


          this.errorMessage.set(
            'حدث خطأ أثناء إنشاء المهمة'
          );

          this.saving.set(
            false
          );
        }

      });
  }

}