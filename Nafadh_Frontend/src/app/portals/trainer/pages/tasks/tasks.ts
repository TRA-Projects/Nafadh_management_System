import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TrainerApi } from '../../services/trainer-api';
import { TaskDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainer-tasks',
  imports: [CommonModule, FormsModule],
  templateUrl: './tasks.html',
})
export class TrainerTasks implements OnInit {

  batchIdInput = 1;

  tasks = signal<TaskDto[]>([]);

  showCreateModal = signal(false);

  newTaskTitle = '';

  constructor(private api: TrainerApi) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {

    this.api.getTasksByBatch(this.batchIdInput).subscribe({
      next: (data) => {

        console.log('Tasks API response:', data);

        /*
         * إذا الـ API عنده بيانات استخدمها.
         * إذا رجع [] نستخدم بيانات تجريبية فقط لعرض الـ UI.
         */
        if (data && data.length > 0) {
          this.tasks.set(data);
        } else {
          this.tasks.set(this.demoTasks());
        }

      },

      error: (error) => {

        console.error('Failed to load tasks:', error);

        // مؤقتًا حتى تظهر الصفحة مثل البروتوتايب
        this.tasks.set(this.demoTasks());

      }
    });

  }


  /**
   * Tasks grouped according to the real TaskStatus enum:
   *
   * Open    -> مجدولة
   * Closed  -> قيد المراجعة
   * Overdue -> مكتملة التقييم
   */
  col(status: TaskDto['status']): TaskDto[] {

    return this.tasks().filter(
      task => task.status === status
    );

  }


  /**
   * Demo data used only when the API returns no tasks.
   */
  private demoTasks(): TaskDto[] {

    return [

      {
        taskId: 1,
        title: 'بناء واجهة برمجية لتطبيقات',
        description: 'مهمة برمجية للمتدربين',
        dueDate: '2026-08-18',
        priority: 'High',
        status: 'Open',
        batchId: this.batchIdInput,
        createdByUserId: 1
      },

      {
        taskId: 2,
        title: 'تطبيق إدارة المتدربين',
        description: 'تنفيذ تطبيق لإدارة بيانات المتدربين',
        dueDate: '2026-08-23',
        priority: 'Medium',
        status: 'Closed',
        batchId: this.batchIdInput,
        createdByUserId: 1
      },

      {
        taskId: 3,
        title: 'ربط قواعد البيانات بإطار العمل',
        description: 'ربط قاعدة البيانات مع التطبيق',
        dueDate: '2026-08-10',
        priority: 'High',
        status: 'Overdue',
        batchId: this.batchIdInput,
        createdByUserId: 1
      }

    ];

  }


  openCreateModal(): void {

    this.newTaskTitle = '';

    this.showCreateModal.set(true);

  }


  closeCreateModal(): void {

    this.showCreateModal.set(false);

    this.newTaskTitle = '';

  }


  saveTask(): void {

    const title = this.newTaskTitle.trim();

    if (!title) {
      return;
    }

    this.api.createTask({
      title,
      batchId: this.batchIdInput,
    }).subscribe({

      next: () => {

        this.closeCreateModal();

        this.loadTasks();

      },

      error: (error) => {

        console.error(
          'Failed to create task:',
          error
        );

      }

    });

  }

}