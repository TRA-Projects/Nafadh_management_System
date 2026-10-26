import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';

import { TrainerApi } from '../../services/trainer-api';

interface LiveAttendanceRow {
  traineeId: number;
  traineeName: string;
  isConnected: boolean;
}

@Component({
  selector: 'app-live-attendance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-attendance.html',
  styleUrl: './live-attendance.scss',
})
export class LiveAttendanceComponent implements OnChanges {
  // يمررهما المكوّن الأب عند ربط صفحة الحضور لاحقًا.
  @Input({ required: true }) sessionId!: number;
  @Input({ required: true }) batchId!: number;

  rows = signal<LiveAttendanceRow[]>([]);
  loading = signal(false);
  errorMessage = signal('');

  constructor(private trainerApi: TrainerApi) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['sessionId'] || changes['batchId']) &&
      this.sessionId > 0 &&
      this.batchId > 0
    ) {
      this.loadAttendance();
    }
  }

  private loadAttendance(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      trainees: this.trainerApi.getEnrollments(undefined, this.batchId),
      live: this.trainerApi.getLiveAttendance(this.sessionId),
    }).subscribe({
      next: ({ trainees, live }) => {
        const connectedIds = new Set(
          live.enrolledConnectedTrainees.map((item) => item.traineeId),
        );

        const attendanceRows: LiveAttendanceRow[] = trainees.map((trainee) => ({
          traineeId: trainee.traineeId,
          traineeName: trainee.traineeName,
          isConnected: connectedIds.has(trainee.traineeId),
        }));

        this.rows.set(attendanceRows);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load live attendance:', error);
        this.errorMessage.set('تعذر تحميل بيانات الحضور من النظام.');
        this.rows.set([]);
        this.loading.set(false);
      },
    });
  }

  get connectedCount(): number {
    return this.rows().filter((row) => row.isConnected).length;
  }

  get disconnectedCount(): number {
    return this.rows().filter((row) => !row.isConnected).length;
  }
}