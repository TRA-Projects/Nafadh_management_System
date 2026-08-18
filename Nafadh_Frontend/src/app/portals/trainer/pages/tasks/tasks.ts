import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  TaskDto,
  TrainerBatchDto
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
})
export class TrainerTasks implements OnInit {

  // =====================================================
  // TRAINER
  // =====================================================

  // مؤقت حالياً
  trainerId = 1;


  // =====================================================
  // BATCHES
  // =====================================================

  batches = signal<TrainerBatchDto[]>([]);

  batchIdInput = 0;

  loadingBatches = signal(false);


  // =====================================================
  // TASKS
  // =====================================================

  tasks = signal<TaskDto[]>([]);

  loading = signal(false);

  saving = signal(false);

  errorMessage = signal('');


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


  statusOptions: {
    value: TaskStatus;
    label: string;
  }[] = [
    {
      value: 'Open',
      label: 'مجدولة'
    },
    {
      value: 'Closed',
      label: 'قيد المراجعة'
    },
    {
      value: 'Overdue',
      label: 'مكتملة التقييم'
    }
  ];


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private api: TrainerApi,
    private auth: AuthService
  ) {}


  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    this.loadBatches();
  }


  // =====================================================
  // LOAD BATCHES
  // =====================================================

  loadBatches(): void {

    this.loadingBatches.set(true);

    this.errorMessage.set('');


    this.api
      .getMyBatches(this.trainerId)
      .subscribe({

        next: (data) => {

          const result = data ?? [];

          this.batches.set(result);

          this.loadingBatches.set(false);


          if (result.length > 0) {

            this.batchIdInput =
              result[0].batchId;

            this.loadTasks();

          } else {

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
          batch.batchId === this.batchIdInput
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


    this.loading.set(true);

    this.errorMessage.set('');


    this.api
      .getTasksByBatch(this.batchIdInput)
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

  col(status: TaskStatus): TaskDto[] {

    return this.tasks()
      .filter(
        task =>
          task.status === status
      );

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

    this.showCreateModal.set(true);

  }


  // =====================================================
  // CLOSE MODAL
  // =====================================================

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

    return this.auth.userId ?? 0;

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


    this.saving.set(true);


    this.api
      .createTask(payload)
      .subscribe({

        next: () => {

          this.saving.set(false);

          this.showCreateModal.set(false);

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

          this.saving.set(false);

        }

      });

  }

}