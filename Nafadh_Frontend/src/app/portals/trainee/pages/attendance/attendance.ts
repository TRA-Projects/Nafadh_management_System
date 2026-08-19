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
  enrollmentId = 0;
  traineeId = 1;
  trainee = signal<any>(null);

  rows = signal<any[]>([]);
  rate = signal(0);
  excuseOpenFor = signal<number | null>(null);
  excuseReason = '';
  labels = ATTENDANCE_STATUS_LABELS;

  selectedFileName = signal<string>('');

  constructor(private api: TraineeApi) {}

  ngOnInit() {
    this.getLoggedInUserId();
    this.loadTraineeData();
  }


private getLoggedInUserId() {
    try {
      // 1. البحث في كل المفاتيح المحتملة للـ Storage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key);
          if (val && val.startsWith('{')) {
            const parsed = JSON.parse(val);
            const foundId = parsed.traineeId || parsed.userId || parsed.id;
            if (foundId) {
              this.traineeId = Number(foundId);
              return;
            }
          }
        }
      }

      // 2. البحث في التوكن إن وجد
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || localStorage.getItem('user_session');
      if (token && token.includes('.')) {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        const id = payload.traineeId || payload.userId || payload.nameid || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
        if (id) {
          this.traineeId = Number(id);
        }
      }
    } catch (e) {
      console.warn('تنبيه قراءة التوكن:', e);
    }
  }

  loadTraineeData() {
  this.api.getTrainee(this.traineeId).subscribe({
    next: (t) => {
      if (t) {
        this.trainee.set(t);

        // Get EnrollmentId from the trainee
        this.enrollmentId = t.enrollmentId ?? 0;

        // Now load attendance
        this.loadAttendanceData();
      }
    },
    error: (err) => {
      console.error('خطأ في جلب البيانات:', err);

      if (this.traineeId !== 2) {
        this.traineeId = 2;
        this.loadTraineeData();
      }
    }
  });
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