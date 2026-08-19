import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  SessionDto,
  TrainerBatchDto,
  TrainerDto
} from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class TrainerDashboard implements OnInit {

  // =====================================================
  // STATE
  // =====================================================

  trainer = signal<TrainerDto | null>(null);

  batches = signal<TrainerBatchDto[]>([]);

  sessions = signal<SessionDto[]>([]);


  // =====================================================
  // UPCOMING SESSIONS
  // =====================================================

  /**
   * Returns only future scheduled/postponed sessions,
   * ordered by session date and start time.
   */
  upcomingSessions = computed(() => {

    const now = Date.now();

    return [...this.sessions()]
      .filter(session => {

        const isUpcomingStatus =
          session.status === 'Scheduled' ||
          session.status === 'Postponed';

        const sessionDateTime =
          this.getSessionDateTime(session);

        return (
          isUpcomingStatus &&
          sessionDateTime >= now
        );
      })
      .sort(
        (a, b) =>
          this.getSessionDateTime(a) -
          this.getSessionDateTime(b)
      );
  });


  // =====================================================
  // DASHBOARD BATCHES
  // =====================================================

  /**
   * Shows the two most relevant trainer batches.
   * Ongoing batches appear first, followed by upcoming ones.
   */
  dashboardBatches = computed(() => {

    const priority: Record<
      TrainerBatchDto['status'],
      number
    > = {
      Ongoing: 0,
      Upcoming: 1,
      Completed: 2,
      Cancelled: 3
    };

    return [...this.batches()]
      .sort(
        (a, b) =>
          priority[a.status] -
          priority[b.status]
      )
      .slice(0, 2);
  });


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private api: TrainerApi,
    public auth: AuthService
  ) {}


  // =====================================================
  // INITIALIZATION
  // =====================================================

  ngOnInit(): void {
    this.loadCurrentTrainer();
  }


  // =====================================================
  // CURRENT TRAINER
  // =====================================================

  /**
   * Loads the trainer profile associated with the
   * currently logged-in user, then loads trainer data
   * using the real TrainerId instead of a hardcoded value.
   */
  private loadCurrentTrainer(): void {

    const userId = this.auth.session()?.userId;

    if (!userId) {
      console.error(
        'لم يتم العثور على UserId للمستخدم الحالي'
      );
      return;
    }

    this.api
      .getTrainerByUserId(userId)
      .subscribe({

        next: (trainer) => {

          this.trainer.set(trainer);

          this.loadBatches(
            trainer.trainerId
          );

          this.loadSessions(
            trainer.trainerId
          );
        },

        error: (err) => {

          console.error(
            'خطأ في تحميل بيانات المدرب:',
            err
          );
        }

      });
  }


  // =====================================================
  // BATCHES
  // =====================================================

  /**
   * Loads all batches assigned to the current trainer.
   */
  private loadBatches(
    trainerId: number
  ): void {

    this.api
      .getMyBatches(trainerId)
      .subscribe({

        next: (data) => {
          this.batches.set(
            data ?? []
          );
        },

        error: (err) => {

          console.error(
            'خطأ في تحميل دفعات المدرب:',
            err
          );

          this.batches.set([]);
        }

      });
  }


  // =====================================================
  // SESSIONS
  // =====================================================

  /**
   * Loads all sessions assigned to the current trainer.
   */
  private loadSessions(
    trainerId: number
  ): void {

    this.api
      .getTrainerSessions(trainerId)
      .subscribe({

        next: (data) => {
          this.sessions.set(
            data ?? []
          );
        },

        error: (err) => {

          console.error(
            'خطأ في تحميل جلسات المدرب:',
            err
          );

          this.sessions.set([]);
        }

      });
  }


  /**
   * Combines SessionDate and StartTime into one timestamp
   * so sessions can be filtered and sorted correctly.
   */
  private getSessionDateTime(
    session: SessionDto
  ): number {

    // Backend may return:
    // 2026-08-19
    // or:
    // 2026-08-19T00:00:00

    const datePart =
      session.sessionDate.split('T')[0];

    let timePart =
      session.startTime || '23:59:59';

    // Handles HH:mm values.
    if (timePart.length === 5) {
      timePart += ':00';
    }

    const timestamp =
      new Date(
        `${datePart}T${timePart}`
      ).getTime();

    return Number.isNaN(timestamp)
      ? 0
      : timestamp;
  }


  // =====================================================
  // DISPLAY LABELS
  // =====================================================

  getBatchStatusLabel(
    status: string
  ): string {

    switch (status) {

      case 'Upcoming':
        return 'قادمة';

      case 'Ongoing':
        return 'نشطة';

      case 'Completed':
        return 'مكتملة';

      case 'Cancelled':
        return 'ملغاة';

      default:
        return status;
    }
  }


  getSessionStatusLabel(
    status: string
  ): string {

    switch (status) {

      case 'Scheduled':
        return 'مجدولة';

      case 'Postponed':
        return 'مؤجلة';

      case 'Completed':
        return 'مكتملة';

      case 'Cancelled':
        return 'ملغاة';

      default:
        return status;
    }
  }
}