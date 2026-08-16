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
  rows = signal<DailyAttendanceDto[]>([]);
  rate = signal(0);
  excuseOpenFor = signal<number | null>(null);
  excuseReason = '';
  labels = ATTENDANCE_STATUS_LABELS;

  constructor(private api: TraineeApi) {}
  ngOnInit() {
    this.api.getAttendance(this.enrollmentId).subscribe((d) => this.rows.set(d ?? []));
    this.api.getComplianceRate(this.enrollmentId).subscribe({ next: (r) => this.rate.set(r), error: () => {} });
  }

  submitExcuse(row: DailyAttendanceDto) {
    this.api.submitExcuse({ dailyAttendanceId: row.dailyAttendanceId, reason: this.excuseReason }).subscribe(() => {
      this.excuseOpenFor.set(null);
      this.excuseReason = '';
    });
  }
}
