import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TraineeApi } from '../../services/trainee-api';
import { ATTENDANCE_STATUS_LABELS } from '../../../../core/models/enums';
import { DailyAttendanceDto, ExcuseDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainee-attendance',
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.html',
})
export class TraineeAttendance implements OnInit {
  enrollmentId = 0;
  traineeId = 1;
  trainee = signal<any>(null);

  rows = signal<any[]>([]);
  rate = signal(0);
  excuseOpenFor = signal<number | null>(null);
  excuseReason = '';
  labels = ATTENDANCE_STATUS_LABELS;

  selectedFileName = signal<string>('');
  selectedFile = signal<File | null>(null);

  // Cache للأعذار
  excusesCache = new Map<number, ExcuseDto>();

  constructor(private api: TraineeApi) {}

  ngOnInit() {
    this.getLoggedInUserId();
    this.loadTraineeData();
  }

  private getLoggedInUserId() {
    try {
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
          this.enrollmentId = t.enrollmentId ?? 0;
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

    this.api.getAttendance(this.enrollmentId).subscribe({
      next: (d) => {
        const formattedRows = (d ?? []).map((item: any) => ({
          dailyAttendanceId: item.dailyAttendanceId || item.id,
          date: item.date || item.attendanceDate,
          checkInTime: item.checkInTime || item.checkIn || item.clockIn,
          checkOutTime: item.checkOutTime || item.checkOut || item.clockOut,
          status: item.status || item.attendanceStatus || 'Present',
          note: item.note || item.notes || item.remarks || '',
        }));
        this.rows.set(formattedRows);
        
        // جلب الأعذار لكل صف
        formattedRows.forEach(row => {
          this.api.getExcuse(row.dailyAttendanceId).subscribe({
            next: (excuse: ExcuseDto) => {
              if (excuse && excuse.excuseId) {
                this.excusesCache.set(row.dailyAttendanceId, excuse);
              }
            },
            error: () => {}
          });
        });
      },
      error: () => this.rows.set([])
    });

    this.api.getComplianceRate(this.enrollmentId).subscribe({
      next: (r) => this.rate.set(r),
      error: () => {}
    });
  }

  // التحقق من وجود عذر
  hasExcuse(dailyAttendanceId: number): boolean {
    return this.excusesCache.has(dailyAttendanceId);
  }

  // الحصول على العذر
  getExcuse(dailyAttendanceId: number): ExcuseDto | undefined {
    return this.excusesCache.get(dailyAttendanceId);
  }

  // الحصول على حالة العذر
  getExcuseStatus(dailyAttendanceId: number): string | null {
    const excuse = this.excusesCache.get(dailyAttendanceId);
    return excuse ? excuse.status : null;
  }

  // التحقق من إمكانية إرفاق عذر
  canSubmitExcuse(row: any): boolean {
    // إذا كان هناك عذر مسبق
    if (this.hasExcuse(row.dailyAttendanceId)) {
      return false;
    }
    // إذا كان الحضور مسجل
    if (row.status === 'Present') {
      return false;
    }
    // فقط للحالات Absent أو Late
    return row.status === 'Absent' || row.status === 'Late';
  }

  // دالة عرض العذر
  viewExcuse(dailyAttendanceId: number) {
    const excuse = this.excusesCache.get(dailyAttendanceId);
    if (excuse) {
      const statusMap: {[key: string]: {text: string, emoji: string}} = {
        'Pending': {text: 'قيد المراجعة', emoji: '⏳'},
        'Approved': {text: 'مقبول', emoji: '✅'},
        'Rejected': {text: 'مرفوض', emoji: '❌'}
      };
      const statusInfo = statusMap[excuse.status] || {text: excuse.status, emoji: ''};
      
      alert(`📋 تفاصيل العذر:\n\n📝 السبب: ${excuse.reason}\n📌 الحالة: ${statusInfo.emoji} ${statusInfo.text}\n${excuse.proofUrl ? '📎 يوجد مرفق' : ''}`);
    } else {
      // جلب من الـ API إذا لم يكن في الكاش
      this.api.getExcuse(dailyAttendanceId).subscribe({
        next: (excuse: ExcuseDto) => {
          if (excuse && excuse.excuseId) {
            this.excusesCache.set(dailyAttendanceId, excuse);
            this.viewExcuse(dailyAttendanceId);
          } else {
            alert('لا توجد تفاصيل إضافية للعذر');
          }
        },
        error: () => {
          alert('لا توجد تفاصيل إضافية للعذر');
        }
      });
    }
  }

  totalPresent = computed(() => 
    this.rows().filter(r => r.status === 'Present').length
  );

  totalAbsent = computed(() => 
    this.rows().filter(r => r.status === 'Absent').length
  );

  totalLate = computed(() => 
    this.rows().filter(r => r.status === 'Late').length
  );

  totalExcused = computed(() => {
    let count = 0;
    this.rows().forEach(row => {
      const excuse = this.excusesCache.get(row.dailyAttendanceId);
      if (excuse && excuse.status === 'Approved') {
        count++;
      }
    });
    return count;
  });

  commitmentPercentage = computed(() => {
    const total = this.rows().length;
    if (total === 0) return 0;
    const presentCount = this.rows().filter(r => r.status === 'Present').length;
    return Math.round((presentCount / total) * 100);
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFileName.set(file.name);
      this.selectedFile.set(file);
    }
  }

  submitExcuse(row: any) {
    if (!this.excuseReason.trim()) {
      alert('يرجى كتابة سبب العذر');
      return;
    }

    // التحقق من وجود عذر مسبق
    if (this.hasExcuse(row.dailyAttendanceId)) {
      alert('⚠️ يوجد عذر مسبق لهذا اليوم، لا يمكن إرسال عذر جديد');
      this.excuseOpenFor.set(null);
      this.excuseReason = '';
      this.selectedFileName.set('');
      this.selectedFile.set(null);
      return;
    }

    // إعداد بيانات العذر
    const excuseData = {
      dailyAttendanceId: row.dailyAttendanceId,
      reason: this.excuseReason
    };

    const currentDailyAttendanceId = row.dailyAttendanceId;

    // تحديث الواجهة فوراً
    const tempExcuse: ExcuseDto = {
      excuseId: Date.now(),
      dailyAttendanceId: row.dailyAttendanceId,
      reason: this.excuseReason,
      status: 'Pending' as any,
    };
    this.excusesCache.set(row.dailyAttendanceId, tempExcuse);

    this.excuseOpenFor.set(null);
    this.excuseReason = '';
    this.selectedFileName.set('');
    this.selectedFile.set(null);

    // إرسال العذر للـ API
    this.api.submitExcuse(excuseData).subscribe({
      next: (response: ExcuseDto) => {
        console.log('✅ تم إرسال العذر بنجاح:', response);
        this.excusesCache.set(currentDailyAttendanceId, {
          ...response,
          status: 'Pending'
        });
        setTimeout(() => this.loadAttendanceData(), 500);
      },
      error: (err) => {
        console.error('❌ خطأ في إرسال العذر:', err);
        
        let errorMessage = 'حدث خطأ في إرسال العذر، يرجى المحاولة مرة أخرى';
        
        if (err.error && typeof err.error === 'string') {
          errorMessage = err.error;
        } else if (err.error && err.error.message) {
          errorMessage = err.error.message;
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        if (errorMessage.includes('already exists') || errorMessage.includes('موجود')) {
          errorMessage = '⚠️ يوجد عذر مسبق لهذا اليوم';
        }
        
        alert(errorMessage);
        
        this.excusesCache.delete(currentDailyAttendanceId);
        this.loadAttendanceData();
      }
    });
  }
}