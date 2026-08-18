import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  SessionDto,
  TrainerBatchDto
} from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class TrainerDashboard implements OnInit {

  trainerId = 1;

  batches = signal<TrainerBatchDto[]>([]);
  sessions = signal<SessionDto[]>([]);

  // الجلسات القادمة فقط
  upcomingSessions = computed(() => {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.sessions()
      .filter(session => {

        const sessionDate = new Date(session.sessionDate);
        sessionDate.setHours(0, 0, 0, 0);

        return (
          sessionDate >= today &&
          (
            session.status === 'Scheduled' ||
            session.status === 'Postponed'
          )
        );

      })
      .sort(
        (a, b) =>
          new Date(a.sessionDate).getTime() -
          new Date(b.sessionDate).getTime()
      );
  });


  // نعرض أول دفعتين في Dashboard فقط
  dashboardBatches = computed(() =>
    this.batches().slice(0, 2)
  );


  constructor(
    private api: TrainerApi,
    public auth: AuthService
  ) {}


  ngOnInit(): void {
    this.loadBatches();
    this.loadSessions();
  }


  private loadBatches(): void {

    this.api.getMyBatches(this.trainerId).subscribe({

      next: (data) => {
        this.batches.set(data ?? []);
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


  private loadSessions(): void {

    this.api.getTrainerSessions(this.trainerId).subscribe({

      next: (data) => {
        this.sessions.set(data ?? []);
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


  getBatchStatusLabel(status: string): string {

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


  getSessionStatusLabel(status: string): string {

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