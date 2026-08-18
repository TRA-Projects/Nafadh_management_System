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


  // =====================================================
  // LOAD TASKS
  // =====================================================

  loadTasks(): void {

    // ---------------------------------------------------
    // API remains active.
    // We call it and keep the response in the console
    // for later integration.
    // ---------------------------------------------------

    this.api.getTasksByBatch(this.batchIdInput).subscribe({

      next: (data) => {

        console.log(
          'Tasks API response:',
          data
        );

        // -------------------------------------------------
        // TEMPORARY UI MODE
        //
        // The real API response is NOT used for the cards
        // yet.
        //
        // This keeps all three columns populated while
        // the UI is being completed.
        // -------------------------------------------------

        this.tasks.set(
          this.demoTasks()
        );

      },

      error: (error) => {

        console.error(
          'Failed to load tasks:',
          error
        );

        // -------------------------------------------------
        // If API fails, keep the UI working using demo data.
        // -------------------------------------------------

        this.tasks.set(
          this.demoTasks()
        );

      }

    });

  }


  // =====================================================
  // COLUMN FILTER
  // =====================================================

  /**
   * Uses the REAL backend TaskStatus values.
   *
   * Open    -> مجدولة
   * Closed  -> قيد المراجعة
   * Overdue -> مكتملة التقييم
   *
   * No status meaning is changed here.
   */

  col(status: TaskDto['status']): TaskDto[] {

    return this.tasks().filter(
      task => task.status === status
    );

  }


  // =====================================================
  // DEMO DATA
  // =====================================================

  /**
   * Temporary data for UI development only.
   *
   * The statuses are the real backend statuses.
   */

  private demoTasks(): TaskDto[] {

    return [

      // -------------------------------------------------
      // OPEN
      // مجدولة
      // -------------------------------------------------

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


      // -------------------------------------------------
      // CLOSED
      // قيد المراجعة
      // -------------------------------------------------

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


      // -------------------------------------------------
      // OVERDUE
      // مكتملة التقييم
      // -------------------------------------------------

      {
        taskId: 3,
        title: 'ربط قواعد البيانات بإطار العمل',
        description: 'ربط قاعدة البيانات مع التطبيق',
        dueDate: '2026-08-10',
        priority: 'High',
        status: 'Overdue',
        batchId: this.batchIdInput,
        createdByUserId: 1
      },


      // -------------------------------------------------
      // EXTRA OPEN TASK
      // مثال مشابه للمهمة التي ظهرت من الـ API
      // -------------------------------------------------

      {
        taskId: 4,
        title: 'توثيق النظام الفني',
        description: 'إعداد وتوثيق النظام الفني للمشروع',
        dueDate: '2026-08-25',
        priority: 'Medium',
        status: 'Open',
        batchId: this.batchIdInput,
        createdByUserId: 1
      }

    ];

  }


  // =====================================================
  // CREATE TASK MODAL
  // =====================================================

  openCreateModal(): void {

    this.newTaskTitle = '';

    this.showCreateModal.set(true);

  }


  closeCreateModal(): void {

    this.showCreateModal.set(false);

    this.newTaskTitle = '';

  }


  // =====================================================
  // SAVE TASK
  // =====================================================

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

        // -------------------------------------------------
        // Reload API.
        // The UI will continue displaying demo data
        // until we switch to real API mode.
        // -------------------------------------------------

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