import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { TrainerBatchDto } from '../../../../core/models/dtos';
import { BatchStatus } from '../../../../core/models/enums';

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

  totalTrainees = 0;

  constructor(
    private api: TrainerApi,
    public auth: AuthService
  ) {}

  ngOnInit(): void {

    this.api.getMyBatches(this.trainerId).subscribe({

      next: (data) => {

        const batches = data ?? [];

        this.batches.set(batches);

        this.totalTrainees = batches.reduce(
          (total, batch) =>
            total + (batch.enrolledTraineesCount ?? 0),
          0
        );

      },

      error: (err) => {
        console.error('خطأ في تحميل بيانات لوحة المدرب:', err);
      }

    });
  }

  getBatchStatusLabel(status: BatchStatus): string {

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
}