import {
  Component,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
  imports: [CommonModule,FormsModule],
  templateUrl: './live-attendance.html',
  styleUrl: './live-attendance.scss',
})
export class LiveAttendanceComponent implements OnInit {
  sessionId!: number;
  batchId!: number;

  rows = signal<LiveAttendanceRow[]>([]);
  loading = signal(false);
  errorMessage = signal('');
  searchQuery = signal('');

  isSearchOpen = signal(false);

  filteredRows = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) {
      return this.rows();
    }
    return this.rows().filter(row =>
      row.traineeName.toLowerCase().includes(query)
    );
  });
  constructor(
    private trainerApi: TrainerApi,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // التقاط sessionId من الـ URL (سواء كان Param أساسي أو QueryParam)
    this.route.paramMap.subscribe(params => {
      const sId = params.get('sessionId') || params.get('id') || this.route.snapshot.paramMap.get('sessionId');
      const bId = this.route.snapshot.queryParams['batchId'] || 1; // قيمة افتراضية للدفعة إن لم توجد

      this.sessionId = Number(sId) || 429; // رقم الجلسة الحالي الذي نعمل عليه
      this.batchId = Number(bId);

      if (this.sessionId && this.batchId) {
        this.loadAttendance();
      }
    });
  }
  toggleSearch() {
    this.isSearchOpen.update(value => !value);
    if (!this.isSearchOpen()) {
      this.searchQuery.set(''); // مسح نص البحث عند إغلاقه
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