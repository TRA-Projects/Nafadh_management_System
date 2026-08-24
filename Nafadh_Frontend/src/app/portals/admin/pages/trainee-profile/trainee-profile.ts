import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminApi } from '../../services/admin-api';
import {
  TraineeProfileDto,
  WarningDto,
} from '../../../../core/models/dtos';
import {
  TRAINEE_STATUS_LABELS,
  WARNING_TYPE_LABELS,
  WARNING_LEVEL_LABELS,
  TraineeStatus,
  AttendanceStatus,
} from '../../../../core/models/enums';

/** سجل حضور خام كما يعود من DailyAttendance (بعد تطبيع الأسماء) */
interface RawAttendanceRow {
  status: AttendanceStatus | string;
  isLate: boolean;
}

@Component({
  selector: 'app-admin-trainee-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trainee-profile.html',
  styleUrls: ['./trainee-profile.css'],
})
export class AdminTraineeProfile implements OnInit {
  // -------------------- الحالة --------------------
  isLoading = signal<boolean>(true);
  loadError = signal<string | null>(null);

  trainee = signal<TraineeProfileDto | null>(null);
  enrollmentId = signal<number | null>(null);

  // إحصائيات الحضور — تُحسب من سجلات Enrollment الحالي
  lateCount = signal<number>(0);
  absentDays = signal<number>(0);
  presentDays = signal<number>(0);
  attendanceRate = signal<number>(0); // نسبة مئوية 0-100، بنفس معادلة الـ Backend (حاضر / إجمالي)

  // نسبة الإنجاز في التدريب (من TraineeModuleProgress)
  completionPercentage = signal<number>(0);

  // سجل الإنذارات
  warnings = signal<WarningDto[]>([]);

  statusLabels = TRAINEE_STATUS_LABELS;
  warningTypeLabels = WARNING_TYPE_LABELS;
  warningLevelLabels = WARNING_LEVEL_LABELS;

  fullName = computed(() => this.trainee()?.fullName || '—');
  statusLabel = computed(() => {
    const s = this.trainee()?.status as TraineeStatus | undefined;
    return s ? (this.statusLabels[s] ?? s) : '—';
  });
  universityMajor = computed(() => {
    const t = this.trainee();
    if (!t) return '';
    const parts = [t.university, t.major].filter((p) => !!p);
    return parts.join(' - ');
  });

  constructor(
    private route: ActivatedRoute,
    private api: AdminApi,
    private location: Location
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadProfileData(id);
    } else {
      this.isLoading.set(false);
      this.loadError.set('معرّف المتدرب غير صالح.');
    }
  }

  goBack(): void {
    this.location.back();
  }

  getInitials(name: string | undefined | null): string {
    if (!name) return '؟';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`;
    }
    return parts[0][0] || '؟';
  }

  // -------------------- تحميل البيانات --------------------
  private loadProfileData(traineeId: number): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.api.getTrainee(traineeId).subscribe({
      next: (profile) => {
        this.trainee.set(profile);

        // نحاول أولاً enrollmentId المرفق مع الملف، وإن لم يوجد نجلبه
        // صراحةً من Enrollment/trainee/{id} (الأدق والأضمن).
        if (profile?.enrollmentId && profile.enrollmentId > 0) {
          this.enrollmentId.set(profile.enrollmentId);
          this.loadDependentData(traineeId, profile.enrollmentId);
        } else {
          this.api.getEnrollmentsByTrainee(traineeId).subscribe({
            next: (enrollments) => {
              const active =
                enrollments?.find((e) => e.completionStatus === 'InProgress') ??
                enrollments?.[0];
              const resolvedId = active?.enrollmentId ?? null;
              this.enrollmentId.set(resolvedId);
              this.loadDependentData(traineeId, resolvedId);
            },
            error: () => {
              this.enrollmentId.set(null);
              this.loadDependentData(traineeId, null);
            },
          });
        }
      },
      error: (err) => {
        console.error('Error fetching trainee profile:', err);
        this.isLoading.set(false);
        this.loadError.set('تعذّر تحميل بيانات المتدرب.');
      },
    });
  }

  private loadDependentData(traineeId: number, enrollmentId: number | null): void {
    forkJoin({
      attendance: enrollmentId
        ? this.api.getDailyAttendanceByEnrollment(enrollmentId).pipe(catchError(() => of([])))
        : of([]),
      progress: this.api.getTraineeProgressPercentage(traineeId).pipe(
        catchError(() => of({ traineeId, percentage: 0 }))
      ),
      warnings: enrollmentId
        ? this.api
            .getWarnings({ scope: 'Trainee', enrollmentId })
            .pipe(catchError(() => of([])))
        : of([]),
    }).subscribe({
      next: ({ attendance, progress, warnings }) => {
        this.processAttendance(attendance as RawAttendanceRow[]);
        this.completionPercentage.set(Math.round(progress?.percentage ?? 0));
        this.warnings.set(warnings ?? []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching trainee dependent data:', err);
        this.isLoading.set(false);
      },
    });
  }

  /**
   * يحسب مرات التأخير / أيام الغياب / أيام الحضور / نسبة الحضور
   * بنفس منطق الـ Backend تماماً (DailyAttendanceService.GetComplianceRateAsync):
   * نسبة الحضور = (عدد سجلات "حاضر" / إجمالي السجلات) × 100
   */
  private processAttendance(rows: RawAttendanceRow[]): void {
    const list = rows || [];

    const present = list.filter((r) => String(r.status) === 'Present').length;
    const absent = list.filter((r) => String(r.status) === 'Absent').length;
    const late = list.filter((r) => !!r.isLate).length;
    const total = list.length;

    this.presentDays.set(present);
    this.absentDays.set(absent);
    this.lateCount.set(late);
    this.attendanceRate.set(total > 0 ? Math.round((present / total) * 1000) / 10 : 0);
  }
}