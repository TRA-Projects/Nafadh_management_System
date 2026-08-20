import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';

export interface EvaluationRecord {
  id: number;
  period: number;
  score: number;
  date: string;
}

export interface AttendanceRecord {
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  isLate: number;
  notes: string;
}

@Component({
  selector: 'app-admin-trainee-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trainee-profile.html',
  styleUrls: ['./trainee-profile.css']
})
export class AdminTraineeProfile implements OnInit {
  trainee = signal<any>(null);

  // إحصائيات تحسب تلقائياً
  attendanceRate = signal<string>('0%');
  totalAbsence = signal<number>(0);
  totalPresent = signal<number>(0);

  // مصفوفات البيانات
  evaluations = signal<EvaluationRecord[]>([]);
  attendanceLogs = signal<AttendanceRecord[]>([]);

  constructor(
    private route: ActivatedRoute,
    private api: AdminApi,
    private location: Location
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadProfileData(id);
    }
  }

  // دالة العودة للصفحة السابقة
  goBack() {
    this.location.back();
  }

  // دالة استخراج الأحرف الأولى من الاسم لدائرة البروفايل
  getInitials(name: string): string {
    if (!name) return 'ح ج';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]} ${parts[1][0]}`;
    }
    return parts[0][0] || 'ح';
  }

  private loadProfileData(traineeId: number) {
    this.api.getTrainee(traineeId).subscribe({
      next: (res: any) => {
        this.trainee.set(res);
        const enrollmentId = res?.enrollmentId || res?.EnrollmentId;

        if (enrollmentId && enrollmentId > 0) {
          this.fetchEvaluations(enrollmentId);
          this.fetchDailyAttendance(enrollmentId);
        } else {
          this.fetchSessionAttendance(traineeId);
        }
      },
      error: (err) => console.error('Error fetching trainee profile:', err)
    });
  }

  private fetchEvaluations(enrollmentId: number) {
    this.api.getEvaluationsByEnrollment(enrollmentId).subscribe({
      next: (res: any[]) => {
        const mapped = (res || []).map((item, idx) => {
          const rawDate = item.evaluationDate || item.EvaluationDate || item.createdOn || item.CreatedOn || item.date || item.Date;
          return {
            id: item.id || item.Id || item.evaluationId || item.EvaluationId || idx + 1,
            period: item.period || item.Period || item.term || 1,
            score: Number(item.score || item.Score || item.totalScore || 0),
            date: rawDate ? String(rawDate).split('T')[0] : '-'
          };
        });
        this.evaluations.set(mapped);
      },
      error: (err) => console.error('Error fetching evaluations:', err)
    });
  }

  private fetchDailyAttendance(enrollmentId: number) {
    this.api.getAttendance(enrollmentId).subscribe({
      next: (res: any[]) => {
        this.processAttendanceData(res);
      },
      error: (err) => console.error('Error fetching daily attendance:', err)
    });
  }

  private fetchSessionAttendance(traineeId: number) {
    this.api.getSessionAttendanceByTrainee(traineeId).subscribe({
      next: (res: any[]) => {
        this.processAttendanceData(res);
      },
      error: (err) => console.error('Error fetching session attendance:', err)
    });
  }

  private processAttendanceData(res: any[]) {
    let presentCount = 0;
    let absentCount = 0;

    const mapped: AttendanceRecord[] = (res || []).map((item) => {
      // 1. حالة الحضور والغياب
      const rawStatus = item.status ?? item.Status ?? item.attendanceStatus;
      const statusStr = String(rawStatus ?? '').toLowerCase();

      const isPresent = statusStr.includes('present') || statusStr.includes('حاضر') || rawStatus === 0;
      const isAbsent = statusStr.includes('absent') || statusStr.includes('غائب') || rawStatus === 2;

      if (isPresent) presentCount++;
      if (isAbsent) absentCount++;

      // 2. التاريخ
      const rawDate = item.date || item.Date || item.attendanceDate || item.AttendanceDate || item.createdOn || item.CreatedOn;

      // 3. أوقات الحضور والانصراف
      const rawCheckIn = item.checkInTime ?? item.CheckInTime ?? item.check_in_time ?? item.checkIn ?? item.CheckIn;
      const rawCheckOut = item.checkOutTime ?? item.CheckOutTime ?? item.check_out_time ?? item.checkOut ?? item.CheckOut;

      // 4. الملاحظات
      const rawNotes = item.note ?? item.Note ?? item.notes ?? item.Notes ?? item.remarks;

      // دالة استخراج الوقت بشكل دقيق HH:mm
      const extractTime = (val: any) => {
        if (!val || val === 'NULL' || val === 'null') return '-';
        const str = String(val).trim();
        if (str.includes('T')) {
          const timePart = str.split('T')[1];
          return timePart ? timePart.substring(0, 5) : '-';
        }
        if (str.includes(':')) {
          return str.substring(0, 5);
        }
        return str;
      };

      return {
        date: rawDate ? String(rawDate).split('T')[0] : '-',
        checkIn: extractTime(rawCheckIn),
        checkOut: extractTime(rawCheckOut),
        status: isPresent ? 'حاضر' : isAbsent ? 'غائب' : 'متأخر',
        isLate: (item.isLate || item.IsLate) ? 1 : 0,
        notes: (rawNotes && String(rawNotes) !== 'NULL') ? String(rawNotes) : '-'
      };
    });

    this.attendanceLogs.set(mapped);
    this.totalPresent.set(presentCount);
    this.totalAbsence.set(absentCount);

    const totalDays = presentCount + absentCount;
    if (totalDays > 0) {
      const rate = ((presentCount / totalDays) * 100).toFixed(1);
      this.attendanceRate.set(`${rate}%`);
    } else {
      this.attendanceRate.set('0%');
    }
  }
}