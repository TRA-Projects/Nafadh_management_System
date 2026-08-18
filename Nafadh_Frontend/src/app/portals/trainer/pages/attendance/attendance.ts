import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrainerApi } from '../../services/trainer-api';
import { ATTENDANCE_PICKABLE_STATUSES, ATTENDANCE_STATUS_LABELS } from '../../../../core/models/enums';
import { DailyAttendanceDto, ExcuseDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainer-attendance',
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.html',
})
export class TrainerAttendance implements OnInit {
  companyId = 1;
  rows = signal<DailyAttendanceDto[]>([]);
  excuses = signal<ExcuseDto[]>([]);
  pickable = ATTENDANCE_PICKABLE_STATUSES;
  labels = ATTENDANCE_STATUS_LABELS;

  // متغير لتتبع التبويب النشط (اليومي، الأسبوعي، الشهري)
  activeTab = signal<'daily' | 'weekly' | 'monthly'>('daily');

  constructor(private api: TrainerApi) {}

  ngOnInit() {
    this.loadAttendanceData('daily');
    this.api.getPendingExcuses().subscribe((d) => this.excuses.set(d ?? []));
  }

  // دالة لتغيير التبويب وجلب البيانات المناسبة
  switchTab(tab: 'daily' | 'weekly' | 'monthly') {
    this.activeTab.set(tab);
    this.loadAttendanceData(tab);
  }

  loadAttendanceData(tab: 'daily' | 'weekly' | 'monthly') {
    if (tab === 'daily') {
      this.api.getTodayAttendanceForCompany(this.companyId).subscribe({
        next: (d) => this.rows.set(d ?? []),
        error: () => this.rows.set([])
      });
    } else {
      // يمكنك هنا لاحقاً ربط دوال الأسبوعي أو الشهري الخاصة بالـ API عند توفرها
      this.rows.set([]); 
    }
  }

  setStatus(row: DailyAttendanceDto, status: string) {
    this.api.updateAttendance(row.dailyAttendanceId, { ...row, status }).subscribe(() => {
      this.rows.update((list) => list.map((r) => (r.dailyAttendanceId === row.dailyAttendanceId ? { ...r, status: status as any } : r)));
    });
  }

  reviewExcuse(ex: ExcuseDto, approve: boolean) {
    this.api.reviewExcuse(ex.excuseId, { status: approve ? 'Approved' : 'Rejected' }).subscribe(() => {
      this.excuses.update((list) => list.filter((e) => e.excuseId !== ex.excuseId));
    });
  }

  reportAbsence(row: DailyAttendanceDto) {
    this.api.reportRepeatedAbsence({ scope: 'Trainee', enrollmentId: row.enrollmentId, type: 'Attendance', level: 'Medium', evidence: 'غياب متكرر بدون عذر', raisedByUserId: 3 }).subscribe();
  }
}