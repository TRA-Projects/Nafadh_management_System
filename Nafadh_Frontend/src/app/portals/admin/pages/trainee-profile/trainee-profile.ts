import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminApi } from '../../services/admin-api';
import {
  TraineeProfileDto,
  WarningDto,
  EnrollmentDto,
  ModuleDto,
  EvaluationDto,
} from '../../../../core/models/dtos';
import {
  TRAINEE_STATUS_LABELS,
  WARNING_TYPE_LABELS,
  WARNING_LEVEL_LABELS,
  MODULE_PROGRESS_LABELS,
  EVALUATION_TYPE_LABELS,
  ENROLLMENT_STATUS_LABELS,
  TraineeStatus,
  AttendanceStatus,
  ModuleProgressStatus,
  EnrollmentCompletionStatus,
} from '../../../../core/models/enums';

/** سجل حضور خام كما يعود من DailyAttendance (بعد تطبيع الأسماء) */
interface RawAttendanceRow {
  status: AttendanceStatus | string;
  isLate: boolean;
}

interface RawModuleProgressRow {
  moduleId: number;
  status: ModuleProgressStatus | string;
  completedAt?: string | null;
}

/** بطاقة "مرحلة" واحدة معروضة بالصفحة — وحدة حقيقية من البرنامج + تقييماتها */
interface StageCard {
  module: ModuleDto;
  orderIndex: number;
  statusRaw: string;
  statusLabel: string;
  progressPercent: number; // 0 / 50 / 100 لعرض شريط التقدم
  evaluations: EvaluationDto[];
  averageScore: number | null; // متوسط تقييمات هذي الوحدة (تقني + سلوكي)
}

@Component({
  selector: 'app-admin-trainee-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trainee-profile.html',
  styleUrls: ['./trainee-profile.css'],
})
export class AdminTraineeProfile implements OnInit {
  // -------------------- الحالة العامة --------------------
  isLoading = signal<boolean>(true);
  loadError = signal<string | null>(null);

  trainee = signal<TraineeProfileDto | null>(null);
  enrollment = signal<EnrollmentDto | null>(null);

  // -------------------- إحصائيات الحضور --------------------
  lateCount = signal<number>(0);
  absentDays = signal<number>(0);
  presentDays = signal<number>(0);
  attendanceRate = signal<number>(0); // بنفس معادلة الـ Backend: حاضر / إجمالي

  // -------------------- نسبة الإنجاز والتقييمات --------------------
  completionPercentage = signal<number>(0);
  stages = signal<StageCard[]>([]);
  overallAverageScore = signal<number | null>(null);

  // -------------------- سجل الإنذارات --------------------
  warnings = signal<WarningDto[]>([]);

  // -------------------- خرائط الترجمة --------------------
  statusLabels = TRAINEE_STATUS_LABELS;
  warningTypeLabels = WARNING_TYPE_LABELS;
  warningLevelLabels = WARNING_LEVEL_LABELS;
  evaluationTypeLabels = EVALUATION_TYPE_LABELS;
  enrollmentStatusLabels = ENROLLMENT_STATUS_LABELS;

  // -------------------- قيم محسوبة (computed) --------------------
  fullName = computed(() => this.trainee()?.fullName || '—');

  enrollmentCode = computed(() => {
    const id = this.enrollment()?.enrollmentId;
    return id ? `#${String(id).padStart(4, '0')}` : '';
  });

  enrollmentStatusLabel = computed(() => {
    const s = this.enrollment()?.completionStatus as EnrollmentCompletionStatus | undefined;
    return s ? (this.enrollmentStatusLabels[s] ?? s) : '—';
  });

  programLine = computed(() => {
    const e = this.enrollment();
    if (!e) return '';
    const parts = [e.batchName, [e.programTitle, e.trackName].filter((p) => !!p).join('، ')]
      .filter((p) => !!p);
    return parts.join(' — ');
  });

  batchDatesLabel = computed(() => {
    const e = this.enrollment();
    if (!e?.batchStartDate || !e?.batchEndDate) return '';
    const start = new Date(e.batchStartDate).toLocaleDateString('ar-OM');
    const end = new Date(e.batchEndDate).toLocaleDateString('ar-OM');
    return `${start} إلى ${end}`;
  });

  // "الفترة الحالية": أول وحدة لم تكتمل بعد، أو "مكتملة" إذا خلصت كل الوحدات
  currentStageLabel = computed(() => {
    const list = this.stages();
    if (list.length === 0) return '—';
    const current = list.find((s) => s.statusRaw !== 'Completed');
    return current ? current.module.title : 'مكتملة';
  });

  // "تقييمات معلقة": عدد الوحدات اللي بدأ فيها المتدرب (أو خلصها) بدون أي تقييم مسجل
  pendingEvaluationsCount = computed(() => {
    return this.stages().filter(
      (s) => s.statusRaw !== 'NotStarted' && s.evaluations.length === 0
    ).length;
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

  /** يفتح رابط GitHub الخاص بالمتدرب (إن وُجد) بتبويب جديد */
  openGitHub(): void {
    const url = this.enrollment()?.traineeGitHubUrl || this.trainee()?.gitHubUrl;
    if (url) window.open(url, '_blank', 'noopener');
  }

  evalTypeLabel(type: string | undefined | null): string {
    if (!type) return 'تقييم';
    return (this.evaluationTypeLabels as Record<string, string>)[type] ?? type;
  }

  // -------------------- تحميل البيانات --------------------
  private loadProfileData(traineeId: number): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.api.getTrainee(traineeId).subscribe({
      next: (profile) => {
        this.trainee.set(profile);

        this.api.getEnrollmentsByTrainee(traineeId).subscribe({
          next: (enrollments) => {
            const active =
              enrollments?.find((e) => e.completionStatus === 'InProgress') ??
              enrollments?.[0] ??
              null;
            this.enrollment.set(active);
            this.loadDependentData(traineeId, active);
          },
          error: (err) => {
            console.error('Error fetching trainee enrollments:', err);
            this.isLoading.set(false);
            this.loadError.set('تعذّر تحميل بيانات التسجيل الخاصة بالمتدرب.');
          },
        });
      },
      error: (err) => {
        console.error('Error fetching trainee profile:', err);
        this.isLoading.set(false);
        this.loadError.set('تعذّر تحميل بيانات المتدرب.');
      },
    });
  }

  private loadDependentData(traineeId: number, enrollment: EnrollmentDto | null): void {
    const enrollmentId = enrollment?.enrollmentId ?? null;
    const programId = enrollment?.programId ?? null;

    forkJoin({
      attendance: enrollmentId
        ? this.api.getDailyAttendanceByEnrollment(enrollmentId).pipe(catchError(() => of([])))
        : of([]),
      progress: this.api.getTraineeProgressPercentage(traineeId).pipe(
        catchError(() => of({ traineeId, percentage: 0 }))
      ),
      warnings: enrollmentId
        ? this.api.getWarnings({ scope: 'Trainee', enrollmentId }).pipe(catchError(() => of([])))
        : of([]),
      modules: programId
        ? this.api.getModulesByProgram(programId).pipe(catchError(() => of([])))
        : of([]),
      moduleProgress: this.api.getTraineeModuleProgress(traineeId).pipe(catchError(() => of([]))),
      evaluations: enrollmentId
        ? this.api.getEvaluationsForEnrollment(enrollmentId).pipe(catchError(() => of([])))
        : of([]),
    }).subscribe({
      next: ({ attendance, progress, warnings, modules, moduleProgress, evaluations }) => {
        this.processAttendance(attendance as RawAttendanceRow[]);
        this.completionPercentage.set(Math.round(progress?.percentage ?? 0));
        this.warnings.set(warnings ?? []);
        this.buildStages(
          modules as ModuleDto[],
          moduleProgress as RawModuleProgressRow[],
          evaluations as EvaluationDto[]
        );
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

  /**
   * يبني بطاقات "مراحل التدريب" من الوحدات الحقيقية للبرنامج (Module) +
   * حالة تقدّم المتدرب بكل وحدة + التقييمات المرتبطة بها (تقني/سلوكي).
   */
  private buildStages(
    modules: ModuleDto[],
    progressRows: RawModuleProgressRow[],
    evaluations: EvaluationDto[]
  ): void {
    const sortedModules = [...(modules || [])].sort((a, b) => a.orderIndex - b.orderIndex);

    const progressByModule = new Map<number, RawModuleProgressRow>();
    for (const p of progressRows || []) {
      progressByModule.set(p.moduleId, p);
    }

    const evalsByModule = new Map<number, EvaluationDto[]>();
    for (const ev of evaluations || []) {
      if (ev.moduleId == null) continue;
      const arr = evalsByModule.get(ev.moduleId) ?? [];
      arr.push(ev);
      evalsByModule.set(ev.moduleId, arr);
    }

    const cards: StageCard[] = sortedModules.map((m) => {
      const progress = progressByModule.get(m.moduleId);
      const statusRaw = String(progress?.status ?? 'NotStarted');
      const moduleEvals = (evalsByModule.get(m.moduleId) ?? []).sort(
        (a, b) => new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime()
      );

      const avg =
        moduleEvals.length > 0
          ? Math.round(
              (moduleEvals.reduce((sum, e) => sum + Number(e.score), 0) / moduleEvals.length) * 10
            ) / 10
          : null;

      const progressPercent =
        statusRaw === 'Completed' ? 100 : statusRaw === 'InProgress' ? 50 : 0;

      return {
        module: m,
        orderIndex: m.orderIndex,
        statusRaw,
        statusLabel: MODULE_PROGRESS_LABELS[statusRaw as ModuleProgressStatus] ?? statusRaw,
        progressPercent,
        evaluations: moduleEvals,
        averageScore: avg,
      };
    });

    this.stages.set(cards);

    const allScores = (evaluations || []).map((e) => Number(e.score));
    this.overallAverageScore.set(
      allScores.length > 0
        ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
        : null
    );
  }
}