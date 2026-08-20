import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';

import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
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

  trainer = signal<TrainerDto | null>(null);


  // =====================================================
  // BATCHES
  // =====================================================

  batches = signal<TrainerBatchDto[]>([]);

  batchIdInput = 0;

  loadingBatches = signal(false);

  // الدفعة القادمة من صفحة إدارة الدفعات
  requestedBatchId: number | null = null;


  // =====================================================
  // TASKS
  // =====================================================

  tasks = signal<TaskDto[]>([]);

  loading = signal(false);

  saving = signal(false);

  errorMessage = signal('');


  // =====================================================
  // TASK ACTIONS
  // =====================================================

  updatingTaskId = signal<number | null>(null);

  deletingTaskId = signal<number | null>(null);


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

  // أي مهمة جديدة تبدأ تلقائياً كمجدولة
  newTaskStatus: TaskStatus = 'Open';


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
      this.route.snapshot.queryParamMap.get('batchId');


    if (batchIdParam) {

      const parsedBatchId =
        Number(batchIdParam);


      if (
        !Number.isNaN(parsedBatchId) &&
        parsedBatchId > 0
      ) {

        this.requestedBatchId =
          parsedBatchId;
      }
    }


    // أولاً نحدد المدرب الحالي من المستخدم المسجل دخوله
    this.loadCurrentTrainer();
  }


  // =====================================================
  // CURRENT TRAINER
  // =====================================================

  /**
   * Gets the trainer profile linked to the
   * currently logged-in user.
   */
  private loadCurrentTrainer(): void {

    const userId =
      this.auth.session()?.userId;


    if (!userId) {

      this.trainer.set(null);

      this.batches.set([]);

      this.tasks.set([]);

      this.batchIdInput = 0;

      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي'
      );

      return;
    }


    this.loadingBatches.set(true);

    this.errorMessage.set('');


    this.api
      .getTrainerByUserId(userId)
      .subscribe({

        next: (trainer) => {

          this.trainer.set(
            trainer
          );

          // بعد معرفة TrainerId الحقيقي
          // نحمل دفعات هذا المدرب فقط
          this.loadBatches(
            trainer.trainerId
          );
        },


        error: (error) => {

          console.error(
            'Error loading current trainer:',
            error
          );

          this.trainer.set(null);

          this.batches.set([]);

          this.tasks.set([]);

          this.batchIdInput = 0;

          this.loadingBatches.set(false);

          this.errorMessage.set(
            'تعذر تحميل بيانات المدرب الحالي'
          );
        }

      });
  }


  // =====================================================
  // LOAD BATCHES
  // =====================================================

  /**
   * Loads only the batches assigned to
   * the currently logged-in trainer.
   */
  private loadBatches(
    trainerId: number
  ): void {

    this.loadingBatches.set(true);

    this.errorMessage.set('');

    // تنظيف بيانات المستخدم السابق
    this.batches.set([]);

    this.tasks.set([]);

    this.batchIdInput = 0;


    this.api
      .getMyBatches(trainerId)
      .subscribe({

        next: (data) => {

          const result =
            data ?? [];

          this.batches.set(
            result
          );

          this.loadingBatches.set(false);


          if (result.length > 0) {

            // إذا الصفحة جاءت مع batchId،
            // نتأكد أن الدفعة فعلاً مسندة للمدرب الحالي.
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

            this.batchIdInput = 0;

            this.tasks.set([]);

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

          this.batches.set([]);

          this.tasks.set([]);

          this.batchIdInput = 0;

          this.loadingBatches.set(false);

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

    if (!this.batchIdInput) {

      this.tasks.set([]);

      return;
    }


    this.loadTasks();
  }


  // =====================================================
  // SELECTED BATCH
  // =====================================================

  selectedBatch(): TrainerBatchDto | undefined {

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

    if (!this.batchIdInput) {

      this.tasks.set([]);

      return;
    }


    // حماية إضافية:
    // لا نحمل مهام دفعة غير مسندة للمدرب الحالي.
    const batchIsAssigned =
      this.batches().some(
        batch =>
          batch.batchId ===
          this.batchIdInput
      );


    if (!batchIsAssigned) {

      this.tasks.set([]);

      this.errorMessage.set(
        'هذه الدفعة غير مسندة للمدرب الحالي'
      );

      return;
    }


    this.loading.set(true);

    this.errorMessage.set('');


    this.api
      .getTasksByBatch(
        this.batchIdInput
      )
      .subscribe({

        next: (data) => {

          console.log(
            'TASKS FOR BATCH:',
            this.batchIdInput,
            data
          );

          this.tasks.set(
            data ?? []
          );

          this.loading.set(false);
        },


        error: (error) => {

          console.error(
            'Error loading tasks:',
            error
          );

          this.tasks.set([]);

          this.errorMessage.set(
            'تعذر تحميل المهام'
          );

          this.loading.set(false);
        }

      });
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
      this.updatingTaskId() !== null ||
      this.deletingTaskId() !== null
    ) {
      return;
    }


    this.errorMessage.set('');

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
      this.deletingTaskId() !== null ||
      this.updatingTaskId() !== null
    ) {
      return;
    }


    this.errorMessage.set('');


    this.api
      .getSubmissionsByTask(
        task.taskId
      )
      .subscribe({

        next: (submissions) => {

          // إذا توجد تسليمات، لا نحذف المهمة.
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


          if (!confirmed) {
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
  // OPEN MODAL
  // =====================================================

  openCreateModal(): void {

    if (!this.batchIdInput) {

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
  // CLOSE MODAL
  // =====================================================

  closeCreateModal(): void {

    if (this.saving()) {
      return;
    }


    this.showCreateModal.set(
      false
    );

    this.errorMessage.set('');
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

    this.errorMessage.set('');
  }


  // =====================================================
  // CURRENT LOGGED USER
  // =====================================================

  private getCreatedByUserId(): number {

    return (
      this.auth.session()?.userId
      ?? 0
    );
  }


  // =====================================================
  // SAVE TASK
  // =====================================================

  saveTask(): void {

    this.errorMessage.set('');


    if (!this.newTaskTitle.trim()) {

      this.errorMessage.set(
        'يرجى إدخال عنوان المهمة'
      );

      return;
    }


    if (!this.newTaskDueDate) {

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


    // نتأكد أن الدفعة المختارة
    // فعلاً من دفعات المدرب الحالي.
    const batchIsAssigned =
      this.batches().some(
        batch =>
          batch.batchId ===
          this.batchIdInput
      );


    if (!batchIsAssigned) {

      this.errorMessage.set(
        'لا يمكن إنشاء مهمة لدفعة غير مسندة للمدرب الحالي'
      );

      return;
    }


    const createdByUserId =
      this.getCreatedByUserId();


    if (!createdByUserId) {

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
      .createTask(payload)
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