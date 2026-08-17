import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TraineeApi } from '../../services/trainee-api';
import { ATTENDANCE_STATUS_LABELS } from '../../../../core/models/enums';
import { DailyAttendanceDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainee-attendance',
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.html',
})
export class TraineeAttendance implements OnInit {
  enrollmentId = 1;
  rows = signal<any[]>([]);
  rate = signal(0);
  excuseOpenFor = signal<number | null>(null);
  excuseReason = '';
  labels = ATTENDANCE_STATUS_LABELS;

  selectedFileName = signal<string>('');

  constructor(private api: TraineeApi) {}

  ngOnInit() {
    this.api.getAttendance(this.enrollmentId).subscribe((d) => this.rows.set(d ?? []));
    this.api.getComplianceRate(this.enrollmentId).subscribe({ next: (r) => this.rate.set(r), error: () => {} });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFileName.set(input.files[0].name);
    }
  }

  submitExcuse(row: DailyAttendanceDto) {
    if (!this.excuseReason.trim()) return;

    // تحديث تجريبي فوري للواجهة دون انتظار الـ API (لتجربة ظهور قيد المراجعة مباشرة)
    this.rows.update((items) =>
      items.map((item) =>
        item.dailyAttendanceId === row.dailyAttendanceId
          ? { ...item, excuseStatus: 'Pending', note: 'بانتظار المراجعة' }
          : item
      )
    );

    this.excuseOpenFor.set(null);
    this.excuseReason = '';
    this.selectedFileName.set('');

    // إرسال البيانات للـ API في الخلفية
    this.api.submitExcuse({ dailyAttendanceId: row.dailyAttendanceId, reason: this.excuseReason }).subscribe({
      error: (err) => console.error('Error submitting excuse:', err)
    });
  }
}