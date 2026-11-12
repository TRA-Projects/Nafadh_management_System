import { CommonModule } from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { buildCompanyWorkbook, downloadBlob, CompanyWorkbookSheet } from '../trainees/xlsx-writer';
import { openCompanyPrintReport, reportTablesHtml } from '../../utils/print-report';

import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyWeightedEvaluationDto } from '../../../../core/models/dtos';
import {
  APPROVAL_LABELS,
  EXECUTION_LABELS,
  ITEM_TYPE_LABELS,
  PRIORITY_LABELS,
  PROGRESS_LABELS,
  CoursePlanDetailDto,
  CoursePlanSummaryDto,
  PlanApprovalStatus,
  PlanExecutionStatus,
  PlanItemType,
  PlanPriority,
  PlanProgressStatus,
} from '../../models/company-tasks.models';

type ReportTab =
  | 'att'
  | 'achieve'
  | 'cap'
  | 'eval'
  | 'tasks'
  | 'compare';

interface AttendanceWeek {
  label: string;
  value: number;
}

interface AttendanceDepartment {
  department: string;
  trainees: number;
  attendance: number;
  absence: number;
  late: number;
  evaluation: string;
  status: string;
}

interface AchievementProgram {
  id: number;
  name: string;
  value: number;
}

interface CapacityProgram {
  name: string;
  capacity: number;
  used: number;
  remaining: number;
  percentage: number;
}

interface EvaluationReport {
  supervisor: string;
  department: string;
  required: number;
  late: number;
  lastEvaluation: string;
  status: string;
  statusClass: string;
}

/** Course-plan execution items, never trainee assignments or submissions. */
interface OperationalItemReport {
  id: number;
  planId: number;
  planTitle: string;
  batchId: number | null;
  stageTitle: string;
  type: PlanItemType;
  title: string;
  dueDate: string;
  priority: PlanPriority;
  status: PlanProgressStatus;
  trainerNames: string;
  isOverdue: boolean;
}

interface SupervisorReport {
  id?: number | string;
  name: string;
  department: string;
  trainees: number;
  attendance: number | null;
  performance: number | null;
  pendingEvaluations: number | null;
  overall: string;
  statusClass: string;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss']
})
export class ReportsComponent implements OnInit {
  private readonly companyApi = inject(CompanyApi);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  companyId = 0;
  errorMessage = '';
  weightedResultsError = '';
  attendanceChartError = '';
  attendanceReportError = '';
  capacityError = '';
  activeTab: ReportTab = 'att';

  loading = false;
  exporting = false;
  tasksLoading = false;

  // بيانات التقارير الفعلية
  topPerformers: any[] = [];
  atRiskTrainees: any[] = [];
  programDistribution: any[] = [];
  weightedEvaluations: CompanyWeightedEvaluationDto[] = [];
  averageWeightedScore: number | null = null;
  completedEvaluationsCount = 0;
  averageAttendanceRate: number | null = null;
  totalAbsentDays = 0;
  totalLateDays = 0;

  // =====================================================
  // 1. الحضور
  // =====================================================

  attendanceProgramsCards: {
    name: string;
    value: number;
  }[] = [];

  attendanceWeeks: AttendanceWeek[] = [];

  attendanceDepartments: AttendanceDepartment[] = [];

  // =====================================================
  // 2. الإنجاز
  // =====================================================

  achievementPrograms: AchievementProgram[] = [];

  // =====================================================
  // 3. الطاقة الاستيعابية
  // =====================================================

  capacityPrograms: CapacityProgram[] = [];

  get totalCapacity(): number {
    return this.capacityPrograms.reduce(
      (sum, item) => sum + item.capacity,
      0
    );
  }

  get usedCapacity(): number {
    return this.capacityPrograms.reduce(
      (sum, item) => sum + item.used,
      0
    );
  }

  get remainingCapacity(): number {
    return this.capacityPrograms.reduce(
      (sum, item) => sum + item.remaining,
      0
    );
  }

  get capacityPercentage(): number {
    return this.totalCapacity > 0
      ? Math.round(
          (this.usedCapacity / this.totalCapacity) * 100
        )
      : 0;
  }

  get capacityRingBackground(): string {
    if (this.totalCapacity <= 0) return 'conic-gradient(#e5edf7 0% 100%)';
    const used = Math.max(0, Math.min(100, (this.usedCapacity / this.totalCapacity) * 100));
    return `conic-gradient(#08368e 0% ${used}%, #19b9c5 ${used}% 100%)`;
  }

  get attendanceChartPoints(): { x: number; y: number }[] {
    const weeks = this.attendanceWeeks;
    const count = weeks.length;
    return weeks.map((week, index) => ({
      x: count <= 1 ? 360 : 720 - ((index + 0.5) * 720 / count),
      y: 205 - (Math.max(0, Math.min(100, week.value)) * 1.8)
    }));
  }

  get attendanceLinePoints(): string {
    return this.attendanceChartPoints.map(point => `${point.x},${point.y}`).join(' ');
  }

  get attendanceAreaPoints(): string {
    const points = this.attendanceChartPoints;
    if (!points.length) return '';
    return `${points[0].x},205 ${this.attendanceLinePoints} ${points[points.length - 1].x},205`;
  }

  // =====================================================
  // 4. التقييمات
  // =====================================================

  evaluations: EvaluationReport[] = [];

  // =====================================================
  // 5. Operational company plans and assigned trainer items only.
  // Read from authorized CompanyCoursePlan endpoints (NOT Task/Submissions).
  // =====================================================

  planRows: CoursePlanSummaryDto[] = [];
  operationalItems: OperationalItemReport[] = [];
  tasksLoaded = false;
  tasksError = '';
  taskDetailsIncomplete = false;

  taskStats = {
    total: 0,
    pendingApproval: 0,
    inProgress: 0,
    delayedPlans: 0
  };

  // =====================================================
  // 6. مقارنة المشرفين
  // =====================================================

  supervisors: SupervisorReport[] = [];

  // =====================================================
  // 7. بدء التشغيل
  // =====================================================

  ngOnInit(): void {
    const id = this.auth.companyId;

    if (id === null || id === undefined || id <= 0) {
      this.errorMessage =
        'تعذر تحديد الشركة من جلسة الدخول. يرجى إعادة تسجيل الدخول.';
      return;
    }

    this.companyId = id;
    this.loadAllReportsData();
  }

  // =====================================================
  // 8. تحميل جميع التقارير
  // =====================================================

  loadAllReportsData(): void {

    if (!this.companyId) {
      return;
    }

    if (this.loading) return;
    this.loading = true;
    this.errorMessage = '';
    this.weightedResultsError = '';
    this.attendanceChartError = '';
    this.attendanceReportError = '';
    this.capacityError = '';

    forkJoin({

      capacity: this.companyApi
        .getCompanyCapacitySummary(this.companyId)
        .pipe(
          catchError(error => {
            console.error('Capacity API:', error);
            this.capacityError = this.apiErrorDetails(error, 'الطاقة الاستيعابية');
            return of(null);
          })
        ),

      attendanceChart: this.companyApi
        .getAttendanceChart(this.companyId)
        .pipe(
          catchError(error => {
            console.error('Attendance chart API:', error);
            this.attendanceChartError = this.apiErrorDetails(error, 'رسم الحضور');
            return of(null);
          })
        ),

      attendanceReport: this.companyApi
        .getCompanyAttendanceReport(this.companyId)
        .pipe(
          catchError(error => {
            console.error('Attendance report API:', error);
            this.attendanceReportError = this.apiErrorDetails(error, 'تقرير الحضور');
            return of(null);
          })
        ),

      supervisors: this.companyApi
        .getSupervisors(this.companyId)
        .pipe(
          catchError(error => {
            console.error('Supervisors API:', error);
            return of(null);
          })
        ),

      enrollments: this.companyApi
        .getEnrollmentsByCompany(this.companyId)
        .pipe(
          catchError(error => {
            console.error('Enrollments API:', error);
            return of(null);
          })
        ),

      distribution: this.companyApi
        .getProgramDistribution(this.companyId)
        .pipe(
          catchError(error => {
            console.error('Program distribution API:', error);
            return of(null);
          })
        ),

      // Single source for all final Company classifications: the Admin evaluator.
      weightedResults: this.companyApi
        .getCompanyWeightedEvaluations(this.companyId)
        .pipe(
          catchError(error => {
            console.error('Weighted evaluations API:', error);
            this.weightedResultsError = this.apiErrorDetails(error, 'نتائج التقييم الموزونة');
            return of(null);
          })
        )

    }).subscribe({

      next: result => {

        this.buildCapacity(result.capacity);

        this.buildAttendanceChart(result.attendanceChart);

        const enrollments = this.extractList(result.enrollments);

        this.buildAttendanceByDepartment(
          enrollments,
          result.attendanceReport
        );

        this.buildSupervisors(
          result.supervisors,
          enrollments
        );

        this.programDistribution =
          this.extractList(result.distribution);

        if (result.weightedResults !== null && !Array.isArray(result.weightedResults)) {
          this.weightedResultsError = 'استجابة نتائج التقييم الموزونة لا تطابق قائمة النتائج المتوقعة من الخادم.';
        }
        this.weightedEvaluations = Array.isArray(result.weightedResults) ? result.weightedResults : [];
        const completed = this.weightedEvaluations.filter(item =>
          item.isComplete && item.finalScore !== null);
        this.completedEvaluationsCount = completed.length;
        this.averageWeightedScore = completed.length
          ? Math.round(completed.reduce((sum, item) => sum + Number(item.finalScore), 0)
            / completed.length * 10) / 10
          : null;
        this.topPerformers = completed.filter(item => item.level === 'ممتاز');
        this.atRiskTrainees = completed.filter(item =>
          item.level === 'متعثر' || item.level === 'راسب');

        this.loadAchievement(enrollments);

        this.cdr.detectChanges();
      },

      error: error => {

        console.error('Reports loading error:', error);

        this.errorMessage = 'حدث خطأ أثناء تحميل التقارير.';
        this.loading = false;

        this.cdr.detectChanges();
      }

    });
  }

  /** Preserve the HTTP failure for diagnostics; never turn a failed request into 0%. */
  private apiErrorDetails(error: unknown, report: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return `تعذر تحميل ${report}. يرجى إعادة المحاولة.`;
    }
    const code = error.status;
    const reason = code === 0 ? 'تعذر الاتصال بالخادم أو حظر الاتصال' :
      code === 401 ? 'انتهت جلسة الدخول أو لم يتم إرسال بيانات المصادقة' :
      code === 403 ? 'لا توجد صلاحية للوصول إلى التقرير' :
      code === 404 ? 'مسار التقرير غير موجود في الخادم' :
      code >= 500 ? 'خطأ داخل الخادم' :
      `تعذر تنفيذ الطلب (${code})`;
    return `تعذر تحميل ${report}: ${reason}${code ? ` (HTTP ${code})` : ''}.`;
  }

  // =====================================================
  // 9. بناء الطاقة الاستيعابية
  // =====================================================

  private buildCapacity(response: any): void {

    if (!response) {
      this.capacityPrograms = [];
      return;
    }

    const total = this.toNumber(
      response.total ?? response.Total
    );

    const used = this.toNumber(
      response.used ?? response.Used
    );

    const remaining = this.toNumber(
      response.remaining ??
      response.Remaining ??
      Math.max(0, total - used)
    );

    this.capacityPrograms = [{
      name: 'إجمالي الطاقة الاستيعابية للشركة',
      capacity: total,
      used,
      remaining,
      percentage: total > 0
        ? Math.round((used / total) * 100)
        : 0
    }];
  }

  // =====================================================
  // 10. بناء مخطط الحضور
  // =====================================================

  private buildAttendanceChart(response: any): void {
    const weeks: any[] = Array.isArray(response)
      ? response
      : this.extractList(response?.weeks ?? response?.Weeks ?? response);

    const parsed = weeks.flatMap((week: any) => {
      const rawLabel = week?.label ?? week?.Label ?? week?.week ?? week?.Week;
      const rawValue = week?.value ?? week?.Value ?? week?.attendance ??
        week?.Attendance ?? week?.attendanceRate ?? week?.AttendanceRate;
      // A missing value is not a real 0% attendance rate.
      if (rawLabel === null || rawLabel === undefined || String(rawLabel).trim() === '' ||
          rawValue === null || rawValue === undefined || rawValue === '') return [];
      const value = Number(rawValue);
      if (!Number.isFinite(value) || value < 0 || value > 100) return [];
      return [{ label: String(rawLabel).trim(), value }];
    });

    // Some backend responses arrive newest-first. Sort only when all labels
    // expose an unambiguous year + ISO week, otherwise keep server ordering.
    const weekKey = (label: string): number | null => {
      const yearFirst = /\b(20\d{2})\s*[/\-]\s*(?:الأسبوع\s*)?(\d{1,2})\b/.exec(label);
      const weekFirst = /(?:الأسبوع\s*)?(\d{1,2})\s*[/\-]\s*(20\d{2})\b/.exec(label);
      const year = Number(yearFirst?.[1] ?? weekFirst?.[2]);
      const week = Number(yearFirst?.[2] ?? weekFirst?.[1]);
      return year >= 2000 && week >= 1 && week <= 53 ? year * 100 + week : null;
    };
    const sortable = parsed.map(row => ({ ...row, key: weekKey(row.label) }));
    if (sortable.every(row => row.key !== null)) {
      sortable.sort((a, b) => (a.key ?? 0) - (b.key ?? 0));
    }
    this.attendanceWeeks = sortable.slice(-6).map(({ label, value }) => ({ label, value }));
  }

  // =====================================================
  // 11. بناء الحضور حسب القسم
  // =====================================================

  private buildAttendanceByDepartment(
    enrollments: any[],
    report: any
  ): void {

    const rows = this.extractList(
      report?.rows ??
      report?.Rows ??
      report?.trainees ??
      report?.Trainees ??
      report?.details ??
      report?.Details ??
      report
    );

    this.averageAttendanceRate = report
      ? this.toNumber(report?.overallAttendanceRate ?? report?.OverallAttendanceRate)
      : null;
    this.totalAbsentDays = rows.reduce((sum, item) => sum + this.toNumber(
      item.absentDays ?? item.AbsentDays), 0);
    this.totalLateDays = rows.reduce((sum, item) => sum + this.toNumber(
      item.lateDays ?? item.LateDays), 0);

    if (!rows.length) {
      this.attendanceDepartments = [];
      this.attendanceProgramsCards = [];
      return;
    }

    const departmentByEnrollment = new Map<number, string>();

    enrollments.forEach(enrollment => {

      const enrollmentId = this.toNumber(
        enrollment.enrollmentId ??
        enrollment.EnrollmentId
      );

      const department = String(
        enrollment.departmentName ??
        enrollment.DepartmentName ??
        enrollment.department?.name ??
        enrollment.Department?.Name ??
        'غير محدد'
      );

      if (enrollmentId > 0) {
        departmentByEnrollment.set(enrollmentId, department);
      }
    });

    const groups = new Map<string, any[]>();

    rows.forEach(row => {

      const enrollmentId = this.toNumber(
        row.enrollmentId ??
        row.EnrollmentId
      );

      const department =
        departmentByEnrollment.get(enrollmentId) ??
        String(
          row.departmentName ??
          row.DepartmentName ??
          'غير محدد'
        );

      if (!groups.has(department)) {
        groups.set(department, []);
      }

      groups.get(department)!.push(row);
    });

    this.attendanceDepartments =
      Array.from(groups.entries()).map(
        ([department, items]): AttendanceDepartment => {

          const totalAttendance = items.reduce(
            (sum, item) =>
              sum + this.toNumber(
                item.attendanceRate ??
                item.AttendanceRate ??
                item.attendancePercentage ??
                item.AttendancePercentage
              ),
            0
          );

          const attendance = items.length
            ? Math.round(totalAttendance / items.length)
            : 0;

          const absence = items.reduce(
            (sum, item) =>
              sum + this.toNumber(
                item.absentDays ??
                item.AbsentDays
              ),
            0
          );

          const late = items.reduce(
            (sum, item) =>
              sum + this.toNumber(
                item.lateDays ??
                item.LateDays
              ),
            0
          );

          return {
            department,
            trainees: items.length,
            attendance,
            absence,
            late,

            // Attendance-only label, not the Admin academic grade.
            evaluation: 'معدل حضور',
            status: 'muted'
          };
        }
      );

    this.attendanceProgramsCards = [];
  }

  // =====================================================
  // 12. بناء إنجاز المتدربين
  // =====================================================

  private loadAchievement(enrollments: any[]): void {

    const validEnrollments = enrollments.filter(
      item => this.toNumber(
        item.enrollmentId ??
        item.EnrollmentId
      ) > 0
    );

    if (!validEnrollments.length) {
      this.achievementPrograms = [];
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    const requests = validEnrollments.map(enrollment => {

      const enrollmentId = this.toNumber(
        enrollment.enrollmentId ??
        enrollment.EnrollmentId
      );

      return this.companyApi
        .getProgressSummary(enrollmentId)
        .pipe(
          catchError(error => {
            console.error(
              `Progress API error for enrollment ${enrollmentId}:`,
              error
            );
            return of(null);
          })
        );
    });

    forkJoin(requests).subscribe({

      next: summaries => {

        const programs = new Map<
          string,
          { id: number; values: number[] }
        >();

        validEnrollments.forEach((enrollment, index) => {

          const programName = String(
            enrollment.programTitle ??
            enrollment.ProgramTitle ??
            enrollment.program?.title ??
            enrollment.Program?.Title ??
            'برنامج غير محدد'
          );

          const programId = this.toNumber(
            enrollment.programId ??
            enrollment.ProgramId
          );

          if (!programs.has(programName)) {
            programs.set(programName, {
              id: programId,
              values: []
            });
          }

          const summary: any = summaries[index];

          if (!summary) {
            return;
          }

          const percentage = this.clampPercentage(
            summary.progressPercentage ??
            summary.ProgressPercentage ??
            summary.completionPercentage ??
            summary.CompletionPercentage ??
            0
          );

          programs.get(programName)!.values.push(percentage);
        });

        this.achievementPrograms =
          Array.from(programs.entries()).map(
            ([name, data]): AchievementProgram => ({

              id: data.id,
              name,

              value: data.values.length
                ? Math.round(
                    data.values.reduce((a, b) => a + b, 0) /
                    data.values.length
                  )
                : 0

            })
          );

        this.loading = false;
        this.cdr.detectChanges();
      },

      error: error => {

        console.error('Achievement loading error:', error);

        this.achievementPrograms = [];
        this.loading = false;

        this.cdr.detectChanges();
      }

    });
  }

  // =====================================================
  // 13. بناء بيانات المشرفين
  // =====================================================

  private buildSupervisors(
    response: any,
    enrollments: any[]
  ): void {

    const list = this.extractList(response);

    this.supervisors = list.map(
      (supervisor: any): SupervisorReport => {

        const supervisorId = this.toNumber(
          supervisor.supervisorId ??
          supervisor.SupervisorId ??
          supervisor.id ??
          supervisor.Id
        );

        const assignedTrainees = enrollments.filter(
          enrollment => this.toNumber(
            enrollment.supervisorId ??
            enrollment.SupervisorId
          ) === supervisorId
        ).length;

        return {

          id: supervisorId,

          name: String(
            supervisor.fullName ??
            supervisor.FullName ??
            supervisor.name ??
            supervisor.Name ??
            'مشرف غير محدد'
          ),

          department: String(
            supervisor.department ??
            supervisor.Department ??
            supervisor.departmentName ??
            supervisor.DepartmentName ??
            'غير محدد'
          ),

          trainees: assignedTrainees,

          attendance: null,
          performance: null,
          pendingEvaluations: null,

          overall: 'لا تتوفر بيانات كافية',
          statusClass: 'muted'
        };
      }
    );

    this.evaluations = [];
  }

  // =====================================================
  // 14. Operational plans and their trainer-assigned execution items.
  // NO student NFD_Task or NFD_Submission API calls are made.
  // =====================================================

  loadTasksReport(): void {
    if (!this.companyId || this.tasksLoading) return;
    this.tasksLoading = true;
    this.tasksError = '';
    this.taskDetailsIncomplete = false;
    this.planRows = [];
    this.operationalItems = [];
    this.companyApi.getCoursePlans(this.companyId).subscribe({
      next: overview => {
        this.planRows = overview.plans ?? [];
        const counts = overview.counts;
        this.taskStats = {
          total: this.planRows.length,
          pendingApproval: counts?.pendingApproval ?? 0,
          inProgress: counts?.inProgress ?? 0,
          delayedPlans: counts?.delayedPlans ?? 0
        };
        this.tasksLoaded = true;
        if (!this.planRows.length) {
          this.tasksLoading = false;
          this.cdr.detectChanges();
          return;
        }

        // A detail request is scoped by the same authenticated CompanyId.
        // Keep overview results even if a single plan detail cannot load.
        const requests = this.planRows.map(plan =>
          this.companyApi.getCoursePlan(this.companyId, plan.planId).pipe(
            catchError(error => {
              console.error('Course plan details API:', plan.planId, error);
              this.taskDetailsIncomplete = true;
              return of(null);
            })
          )
        );
        forkJoin(requests).subscribe({
          next: details => {
            this.operationalItems = details
              .filter((detail): detail is CoursePlanDetailDto => detail !== null)
              .flatMap(detail => detail.stages.flatMap(stage =>
                stage.items.map(item => ({
                  id: item.itemId,
                  planId: detail.planId,
                  planTitle: detail.title,
                  batchId: detail.batchId ?? null,
                  stageTitle: stage.title,
                  type: item.itemType,
                  title: item.title,
                  dueDate: item.dueDate,
                  priority: item.priority,
                  status: item.status,
                  trainerNames: item.trainerName || stage.trainerName ||
                    (stage.trainers ?? []).map(trainer => trainer.fullName).join('، ') ||
                    'لم يُسند مدرب',
                  isOverdue: item.isOverdue
                }))
              ))
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
            this.tasksLoading = false;
            this.cdr.detectChanges();
          },
          error: error => {
            console.error('Operational items loading error:', error);
            this.taskDetailsIncomplete = true;
            this.tasksLoading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: error => {
        console.error('Company course plans API:', error);
        this.tasksError = 'تعذر تحميل الخطط التشغيلية للشركة. حاول إعادة التحميل.';
        this.tasksLoading = false;
        this.tasksLoaded = false;
        this.cdr.detectChanges();
      }
    });
  }

  // =====================================================
  // 17. أدوات مساعدة للاستجابات
  // =====================================================

  private extractList(response: any): any[] {

    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.Data)) {
      return response.Data;
    }

    if (Array.isArray(response?.items)) {
      return response.items;
    }

    if (Array.isArray(response?.Items)) {
      return response.Items;
    }

    if (Array.isArray(response?.$values)) {
      return response.$values;
    }

    return [];
  }

  private toNumber(value: unknown): number {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return 0;
    }

    const result = Number(value);

    return Number.isFinite(result) ? result : 0;
  }

  private clampPercentage(value: unknown): number {

    return Math.min(
      100,
      Math.max(0, this.toNumber(value))
    );
  }

  // =====================================================
  // 18. التبويبات
  // =====================================================

  selectTab(tab: ReportTab): void {
    this.activeTab = tab;
    if (tab === 'tasks' && !this.tasksLoaded && !this.tasksLoading) {
      this.loadTasksReport();
    }
  }

  // =====================================================
  // 19. Server-aligned operational status labels.
  // =====================================================

  approvalLabel(value: PlanApprovalStatus): string {
    return APPROVAL_LABELS[value] ?? value;
  }

  executionLabel(value: PlanExecutionStatus): string {
    return EXECUTION_LABELS[value] ?? value;
  }

  progressLabel(value: PlanProgressStatus): string {
    return PROGRESS_LABELS[value] ?? value;
  }

  itemTypeLabel(value: PlanItemType): string {
    return ITEM_TYPE_LABELS[value] ?? value;
  }

  itemPriorityLabel(value: PlanPriority): string {
    return PRIORITY_LABELS[value] ?? value;
  }

  planTrainerNames(plan: CoursePlanSummaryDto): string {
    return (plan.trainers ?? []).map(t => t.fullName).join('، ') || 'لم يُسند مدرب';
  }

  // =====================================================
  // 20. تفاصيل البرنامج
  // =====================================================

  viewProgramOrTraineeDetails(
    program: AchievementProgram,
    event?: Event
  ): void {

    event?.preventDefault();
    event?.stopPropagation();

    if (!program?.id) {
      alert('لا يتوفر معرّف لهذا البرنامج.');
      return;
    }

    this.router.navigate(
      ['/company/trainees'],
      {
        queryParams: {
          programId: program.id
        }
      }
    );
  }

  // =====================================================
  // 21. Exports: use the SAME actual company API data in PDF and Excel.
  // PDF is browser-printed vector text, never a screenshot.
  // =====================================================

  private readonly exportTitles: Record<ReportTab, string> = {
    att: 'تقرير حضور المتدربين للشركة',
    achieve: 'تقرير إنجاز المتدربين للشركة',
    cap: 'تقرير الطاقة الاستيعابية للشركة',
    tasks: 'تقرير الخطط والمهام التشغيلية للشركة',
    eval: 'تقرير التقييمات',
    compare: 'تقرير مقارنة المشرفين'
  };

  private exportSheets(): CompanyWorkbookSheet[] {
    switch (this.activeTab) {
      case 'att':
        return [
          {
            name: 'حضور حسب القسم',
            headers: ['القسم', 'عدد التسجيلات', 'الحضور (%)', 'الغياب', 'التأخر', 'التقييم'],
            rows: this.attendanceDepartments.map(item => [
              item.department, item.trainees, item.attendance,
              item.absence, item.late, item.evaluation
            ]),
            note: 'النسب مأخوذة من تقرير الحضور الفعلي للشركة؛ قد تتضمن تسجيلات مكتملة.'
          },
          {
            name: 'الحضور الأسبوعي',
            headers: ['الأسبوع', 'الحضور (%)'],
            rows: this.attendanceWeeks.map(week => [week.label, week.value]),
            note: 'الأسابيع المتاحة من سجلات الحضور الفعلية.'
          }
        ];
      case 'achieve':
        return [
          {
            name: 'التقييم الموزون',
            headers: ['رقم التسجيل', 'المتدرب', 'البرنامج', 'الدفعة', 'الحضور (%)', 'الدرجة النهائية (%)', 'التصنيف'],
            rows: this.weightedEvaluations.map(item => [
              item.enrollmentId, item.fullName ?? 'غير محدد',
              item.programName ?? 'غير محدد', item.batchName ?? String(item.batchId),
              item.attendancePercent,
              item.finalScore === null ? 'غير مكتمل' : item.finalScore,
              item.level
            ]),
            note: 'الدرجة النهائية والتصنيف وفق الأوزان والمعايير المعتمدة للدفعة في Admin. غير المكتمل لا يساوي صفرًا.'
          },
          {
            name: 'تقدم الأنشطة',
            headers: ['البرنامج', 'متوسط تقدم الأنشطة (%)'],
            rows: this.achievementPrograms.map(item => [item.name, item.value]),
            note: 'تقدم الأنشطة مختلف عن نتيجة التقييم النهائي الموزون.'
          }
        ];
      case 'cap':
        return [{
          name: 'الطاقة الاستيعابية',
          headers: ['النطاق', 'السعة الإجمالية', 'المستخدم', 'المتبقي', 'الاستغلال (%)'],
          rows: this.capacityPrograms.map(item => [
            item.name, item.capacity, item.used, item.remaining, item.percentage
          ]),
          note: 'تعبّر البيانات عن الطاقة الاستيعابية للشركة، وليست توزيعًا تقديريًا حسب البرامج.'
        }];
      case 'tasks':
        return [
          {
            name: 'الخطط التشغيلية',
            headers: ['رقم الخطة', 'الخطة/البرنامج', 'الدفعة', 'منشئ الخطة', 'المدربون المسندون', 'الاعتماد', 'التنفيذ', 'إنجاز البنود (%)', 'المراحل المتأخرة'],
            rows: this.planRows.map(plan => [
              plan.planId, plan.title, plan.batchId ?? '—',
              plan.createdByName || 'غير محدد', this.planTrainerNames(plan),
              this.approvalLabel(plan.approvalStatus), this.executionLabel(plan.executionStatus),
              plan.progressPercentage, plan.delayedStages
            ]),
            note: 'خطط الشركة التشغيلية؛ لا يشمل التقرير واجبات المتدربين أو التسليمات.'
          },
          {
            name: 'بنود التنفيذ',
            headers: ['الخطة', 'الدفعة', 'المرحلة', 'نوع البند', 'البند', 'المدرب المسؤول', 'الموعد', 'الأولوية', 'الحالة', 'متأخر'],
            rows: this.operationalItems.map(item => [
              item.planTitle, item.batchId ?? '—', item.stageTitle,
              this.itemTypeLabel(item.type), item.title, item.trainerNames,
              item.dueDate ? new Date(item.dueDate).toLocaleDateString('ar-OM') : '—',
              this.itemPriorityLabel(item.priority), this.progressLabel(item.status),
              item.isOverdue ? 'نعم' : 'لا'
            ]),
            note: this.taskDetailsIncomplete
              ? 'تنبيه: بعض تفاصيل الخطط لم تُحمّل؛ قائمة البنود قد تكون غير مكتملة.'
              : 'البنود التنفيذية على مستوى الخطة والمرحلة والمدرب فقط.'
          }
        ];
      case 'eval':
        return [{
          name: 'التقييمات',
          headers: ['المشرف', 'القسم', 'مطلوب', 'متأخر', 'آخر تقييم', 'الحالة'],
          rows: this.evaluations.map(item => [item.supervisor, item.department, item.required, item.late, item.lastEvaluation, item.status])
        }];
      case 'compare':
        return [{
          name: 'المشرفون',
          headers: ['المشرف', 'القسم', 'المتدربون', 'الحضور (%)', 'الأداء (%)', 'تقييمات معلقة', 'الأداء العام'],
          rows: this.supervisors.map(item => [
            item.name, item.department, item.trainees,
            item.attendance ?? 'غير متاح', item.performance ?? 'غير متاح',
            item.pendingEvaluations ?? 'غير متاح', item.overall
          ])
        }];
    }
  }

  private canExport(sheets: CompanyWorkbookSheet[]): boolean {
    if ((this.activeTab === 'achieve' && this.weightedResultsError) ||
        (this.activeTab === 'att' && (this.attendanceChartError || this.attendanceReportError)) ||
        (this.activeTab === 'cap' && this.capacityError)) {
      alert('تعذر تصدير التقرير لأن بعض بياناته لم تُحمّل من الخادم. يرجى إعادة المحاولة.');
      return false;
    }
    if (this.loading || (this.activeTab === 'tasks' && (this.tasksLoading || !this.tasksLoaded || !!this.tasksError))) {
      alert('لم يكتمل تحميل بيانات التقرير. يرجى المحاولة بعد انتهاء التحميل.');
      return false;
    }
    if (!sheets.some(sheet => sheet.rows.length)) {
      alert('لا توجد بيانات فعلية متاحة لتصديرها في هذا التقرير.');
      return false;
    }
    return true;
  }

  exportExcel(): void {
    const sheets = this.exportSheets();
    if (!this.canExport(sheets)) return;
    try {
      const file = buildCompanyWorkbook(this.exportTitles[this.activeTab], sheets);
      downloadBlob(file, `Nafadh_Company_${this.activeTab}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('حدث خطأ أثناء إنشاء ملف Excel.');
    }
  }

  exportPdf(): void {
    const sheets = this.exportSheets();
    if (!this.canExport(sheets)) return;
    const success = openCompanyPrintReport(
      this.exportTitles[this.activeTab],
      reportTablesHtml(sheets.map(sheet => ({
        title: sheet.name, headers: sheet.headers, rows: sheet.rows, note: sheet.note
      }))),
      { landscape: sheets.some(sheet => sheet.headers.length > 6) }
    );
    if (!success) {
      alert('المتصفح منع فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.');
    }
  }
}
