import { Component, OnInit, signal, computed } from '@angular/core';
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
  // جلب معرف المتدرب ديناميكياً بناءً على الحساب المسجل حالياً
  enrollmentId: number = this.getCurrentEnrollmentId();

  rows = signal<any[]>([]);
  rate = signal(0);
  excuseOpenFor = signal<number | null>(null);
  excuseReason = '';
  labels = ATTENDANCE_STATUS_LABELS;

  selectedFileName = signal<string>('');

  constructor(private api: TraineeApi) {}

  ngOnInit() {
    this.loadAttendanceData();
  }

  // دالة لجلب الـ ID الحقيقي للمتدرب من التخزين المحلي
  getCurrentEnrollmentId(): number {
    const storedUser = localStorage.getItem('currentUser') || localStorage.getItem('enrollmentId') || localStorage.getItem('traineeId');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        return parsed.enrollmentId || parsed.id || Number(storedUser) || 1;
      } catch {
        return Number(storedUser) || 1;
      }
    }
    return 1;
  }

  loadAttendanceData() {
    if (!this.enrollmentId) return;

    // جلب سجل الحضور والالتزام الخاص بالمتدرب الحالي فقط عبر الـ API
    this.api.getAttendance(this.enrollmentId).subscribe({
      next: (d) => this.rows.set(d ?? []),
      error: () => this.rows.set([])
    });

    this.api.getComplianceRate(this.enrollmentId).subscribe({
      next: (r) => this.rate.set(r),
      error: () => {}
    });
  }

  // دوال الحساب الديناميكية لملخص الحضور
  totalPresent = computed(() => 
    this.rows().filter(r => r.status === 'Present' || r.status === 'Late').length
  );

  totalAbsent = computed(() => 
    this.rows().filter(r => r.status === 'Absent').length
  );

  totalLate = computed(() => 
    this.rows().filter(r => r.status === 'Late').length
  );

  totalExcused = computed(() => 
    this.rows().filter(r => r.status === 'Excused' || r.excuseStatus === 'Approved' || r.note === 'بانتظار المراجعة').length
  );

  commitmentPercentage = computed(() => {
    const total = this.rows().length;
    if (total === 0) return 0;
    const presentCount = this.rows().filter(r => r.status === 'Present').length;
    return Math.round((presentCount / total) * 100);
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFileName.set(input.files[0].name);
    }
  }

  submitExcuse(row: DailyAttendanceDto) {
    if (!this.excuseReason.trim()) return;

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

    this.api.submitExcuse({ dailyAttendanceId: row.dailyAttendanceId, reason: this.excuseReason }).subscribe({
      error: (err) => console.error('Error submitting excuse:', err)
    });
  }
}