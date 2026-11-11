import { NafadhConstantsService } from '../../../../core/services/nafadh-constants.service';

import { CommonModule } from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyWeightedEvaluationDto } from '../../../../core/models/dtos';

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

interface TaskReport {
  id: number;
  task: string;
  program: string;
  due: string;
  priority: string;
  status: string;
  submissionsCount: number;
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

interface ComparisonDepartment {
  name: string;
  value: number;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss']
})
export class ReportsComponent implements OnInit {
  readonly constants = inject(NafadhConstantsService);

  private readonly companyApi = inject(CompanyApi);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  companyId = 0;
  errorMessage = '';
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

  // =====================================================
  // 4. التقييمات
  // =====================================================

  evaluations: EvaluationReport[] = [];

  // =====================================================
  // 5. المهام - بيانات فعلية من API
  // =====================================================

  tasks: TaskReport[] = [];

  taskStats = {
    total: 0,
    completed: 0,
    pending: 0,
    review: 0,
    late: 0,
    completionRate: 0
  };

  get taskTotalCount(): number {
    return this.taskStats.total;
  }

  get taskPendingCount(): number {
    return this.taskStats.pending;
  }

  get taskReviewCount(): number {
    return this.taskStats.review;
  }

  get taskLateCount(): number {
    return this.taskStats.late;
  }

  get taskCompletedCount(): number {
    return this.taskStats.completed;
  }

  // =====================================================
  // 6. مقارنة المشرفين
  // =====================================================

  supervisors: SupervisorReport[] = [];

  comparisonDepartments: ComparisonDepartment[] = [];

  // =====================================================
  // 7. بدء التشغيل
  // =====================================================

  ngOnInit(): void {
    this.constants.ensure('NFD_TSK_PRI');

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

    this.loading = true;
    this.errorMessage = '';

    // تحميل المهام بشكل مستقل
    this.loadTasksReport();

    forkJoin({

      capacity: this.companyApi
        .getCompanyCapacitySummary(this.companyId)
        .pipe(
          catchError(error => {
            console.error('Capacity API:', error);
            return of(null);
          })
        ),

      attendanceChart: this.companyApi
        .getAttendanceChart(this.companyId)
        .pipe(
          catchError(error => {
            console.error('Attendance chart API:', error);
            return of(null);
          })
        ),

      attendanceReport: this.companyApi
        .getCompanyAttendanceReport(this.companyId)
        .pipe(
          catchError(error => {
            console.error('Attendance report API:', error);
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
            this.errorMessage = 'تعذر تحميل نتائج التقييم الموزونة من الخادم.';
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

        this.weightedEvaluations = result.weightedResults ?? [];
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

    const weeks = Array.isArray(response)
      ? response
      : this.extractList(
          response?.weeks ??
          response?.Weeks
        );

    this.attendanceWeeks = weeks.map(
      (week: any, index: number): AttendanceWeek => ({

        label: String(
          week?.label ??
          week?.Label ??
          week?.week ??
          week?.Week ??
          `الأسبوع ${index + 1}`
        ),

        value: this.clampPercentage(
          week?.value ??
          week?.Value ??
          week?.attendance ??
          week?.Attendance ??
          week?.attendanceRate ??
          week?.AttendanceRate ??
          0
        )

      })
    );
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

    this.comparisonDepartments = [];
    this.evaluations = [];
  }

  // =====================================================
  // 14. تحميل المهام وتسليماتها
  // =====================================================

  private loadTasksReport(): void {

    this.tasksLoading = true;

    this.companyApi
      .getTasksByCompany(this.companyId)
      .pipe(
        catchError(error => {
          console.error('Tasks API Error:', error);
          return of([]);
        })
      )
      .subscribe({

        next: response => {

          const taskList = this.extractList(response);

          if (!taskList.length) {

            this.tasks = [];
            this.calculateTaskStats();

            this.tasksLoading = false;
            this.cdr.detectChanges();

            return;
          }

          // طلب تسليمات كل مهمة
          const requests = taskList.map((task: any) => {

            const taskId = this.toNumber(
              task.taskId ??
              task.TaskId ??
              task.id ??
              task.Id
            );

            if (taskId <= 0) {
              return of([]);
            }

            return this.companyApi
              .getSubmissionsByTask(taskId)
              .pipe(
                catchError(error => {

                  console.error(
                    `Submissions API Error for task ${taskId}:`,
                    error
                  );

                  return of([]);
                })
              );
          });

          forkJoin(requests).subscribe({

            next: allSubmissions => {

              this.tasks = taskList.map(
                (task: any, index: number): TaskReport => {

                  const taskId = this.toNumber(
                    task.taskId ??
                    task.TaskId ??
                    task.id ??
                    task.Id
                  );

                  const submissions = this.extractList(
                    allSubmissions[index]
                  );

                  const dueDate =
                    task.dueDate ??
                    task.DueDate ??
                    null;

                  const originalStatus = String(
                    task.status ??
                    task.Status ??
                    ''
                  ).trim().toLowerCase();

                  const status = this.resolveTaskStatus(
                    originalStatus,
                    dueDate
                  );

                  return {

                    id: taskId,

                    task: String(
                      task.title ??
                      task.Title ??
                      'بدون عنوان'
                    ),

                    program: String(
                      task.programName ??
                      task.ProgramName ??
                      task.batchName ??
                      task.BatchName ??
                      'غير محدد'
                    ),

                    due: dueDate
                      ? String(dueDate)
                      : 'غير محدد',

                    priority: String(
                      task.priority ??
                      task.Priority ??
                      'غير محدد'
                    ),

                    status,

                    submissionsCount: submissions.length
                  };
                }
              );

              this.calculateTaskStats();

              this.tasksLoading = false;
              this.cdr.detectChanges();
            },

            error: error => {

              console.error(
                'Task submissions loading error:',
                error
              );

              this.tasksLoading = false;
              this.cdr.detectChanges();
            }

          });
        },

        error: error => {

          console.error('Tasks loading error:', error);

          this.tasks = [];
          this.calculateTaskStats();

          this.tasksLoading = false;
          this.cdr.detectChanges();
        }

      });
  }

  // =====================================================
  // 15. تحديد حالة المهمة
  // =====================================================

  private resolveTaskStatus(
    originalStatus: string,
    dueDate: any
  ): string {

    // الحالات المكتملة
    const completedStatuses = [
      'completed',
      'complete',
      'done',
      'مكتمل',
      'مكتملة'
    ];

    if (
      completedStatuses.some(status =>
        originalStatus.includes(status)
      )
    ) {
      return 'completed';
    }

    // حالات المراجعة
    const reviewStatuses = [
      'review',
      'under review',
      'مراجعة',
      'قيد المراجعة'
    ];

    if (
      reviewStatuses.some(status =>
        originalStatus.includes(status)
      )
    ) {
      return 'review';
    }

    // حالات التأخير
    const lateStatuses = [
      'late',
      'overdue',
      'متأخر',
      'متأخرة'
    ];

    if (
      lateStatuses.some(status =>
        originalStatus.includes(status)
      )
    ) {
      return 'late';
    }

    // فحص تاريخ التسليم
    if (dueDate) {

      const due = new Date(dueDate);

      if (!isNaN(due.getTime())) {

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        due.setHours(0, 0, 0, 0);

        if (due.getTime() < today.getTime()) {
          return 'late';
        }
      }
    }

    return 'pending';
  }

  // =====================================================
  // 16. حساب إحصائيات المهام
  // =====================================================

  private calculateTaskStats(): void {

    const total = this.tasks.length;

    const completed = this.tasks.filter(
      task => task.status === 'completed'
    ).length;

    const pending = this.tasks.filter(
      task => task.status === 'pending'
    ).length;

    const review = this.tasks.filter(
      task => task.status === 'review'
    ).length;

    const late = this.tasks.filter(
      task => task.status === 'late'
    ).length;

    this.taskStats = {

      total,
      completed,
      pending,
      review,
      late,

      completionRate: total > 0
        ? Math.round((completed / total) * 100)
        : 0
    };
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
  }

  // =====================================================
  // 19. حالات المهام
  // =====================================================

  getTaskStatusClass(status: string): string {

    switch (status) {

      case 'review':
        return 'info';

      case 'pending':
        return 'warn';

      case 'late':
        return 'bad';

      case 'completed':
        return 'ok';

      default:
        return 'muted';
    }
  }

  getTaskStatusText(status: string): string {

    switch (status) {

      case 'review':
        return 'قيد المراجعة';

      case 'pending':
        return 'قيد التنفيذ';

      case 'late':
        return 'متأخرة';

      case 'completed':
        return 'مكتملة';

      default:
        return 'غير محددة';
    }
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
  // 21. تصدير Excel
  // =====================================================

  exportExcel(): void {

    let data: Record<string, string | number>[] = [];
    let fileName = 'Nafadh_Report';

    switch (this.activeTab) {

      case 'att':

        data = this.attendanceDepartments.map(item => ({
          'القسم': item.department,
          'عدد المتدربين': item.trainees,
          'معدل الحضور': `${item.attendance}%`,
          'الغياب': item.absence,
          'التأخر': item.late,
          'التقييم': item.evaluation
        }));

        fileName = 'Nafadh_Attendance_Report';
        break;

      case 'achieve':

        // Export the same batch-level final assessment shown in the report.
        // Progress summaries are a separate indicator, not a weighted grade.
        data = this.weightedEvaluations.map(item => ({
          'رقم التسجيل': item.enrollmentId,
          'المتدرب': item.fullName ?? 'غير محدد',
          'البرنامج': item.programName ?? 'غير محدد',
          'الدفعة': item.batchName ?? String(item.batchId),
          'الحضور': `${item.attendancePercent}%`,
          'الدرجة النهائية': item.finalScore === null ? 'غير مكتمل' : `${item.finalScore}%`,
          'التصنيف': item.level
        }));

        fileName = 'Nafadh_Achievement_Report';
        break;

      case 'cap':

        data = this.capacityPrograms.map(item => ({
          'البرنامج': item.name,
          'الحصة المخصصة': item.capacity,
          'المستخدم': item.used,
          'المتبقي': item.remaining,
          'الاستغلال': `${item.percentage}%`
        }));

        fileName = 'Nafadh_Capacity_Report';
        break;

      case 'eval':

        data = this.evaluations.map(item => ({
          'المشرف': item.supervisor,
          'القسم': item.department,
          'مطلوب': item.required,
          'متأخر': item.late,
          'آخر تقييم': item.lastEvaluation,
          'الحالة': item.status
        }));

        fileName = 'Nafadh_Evaluations_Report';
        break;

      case 'tasks':

        data = this.tasks.map(item => ({
          'اسم المهمة': item.task,
          'البرنامج أو الدفعة': item.program,
          'تاريخ التسليم': item.due,
          'الأولوية': this.constants.administrativeLabel('NFD_TSK_PRI', item.priority),
          'الحالة': this.getTaskStatusText(item.status),
          'عدد التسليمات': item.submissionsCount
        }));

        fileName = 'Nafadh_Tasks_Report';
        break;

      case 'compare':

        data = this.supervisors.map(item => ({
          'المشرف': item.name,
          'القسم': item.department,
          'المتدربون': item.trainees,

          'معدل الحضور': item.attendance === null
            ? 'غير متاح'
            : `${item.attendance}%`,

          'متوسط الأداء': item.performance === null
            ? 'غير متاح'
            : `${item.performance}%`,

          'تقييمات معلقة':
            item.pendingEvaluations ?? 'غير متاح',

          'الأداء العام': item.overall
        }));

        fileName = 'Nafadh_Supervisors_Comparison_Report';
        break;
    }

    if (!data.length) {
      alert('لا توجد بيانات فعلية متاحة لتصديرها في هذا التقرير.');
      return;
    }

    try {

      const worksheet = XLSX.utils.json_to_sheet(data);

      worksheet['!cols'] = Object.keys(data[0]).map(key => {

        const lengths = data.map(row =>
          String(row[key] ?? '').length
        );

        return {
          wch: Math.min(
            Math.max(key.length, ...lengths) + 3,
            35
          )
        };
      });

      worksheet['!views'] = [
        { rightToLeft: true }
      ];

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        'التقرير'
      );

      XLSX.writeFile(
        workbook,
        `${fileName}.xlsx`
      );

    } catch (error) {

      console.error('Excel export error:', error);
      alert('حدث خطأ أثناء إنشاء ملف Excel.');
    }
  }

  // =====================================================
  // 22. تصدير PDF
  // =====================================================

  exportPdf(): void {

    const source = document.querySelector(
      '.reports-page'
    ) as HTMLElement | null;

    if (!source) {
      alert('تعذر العثور على محتوى التقرير.');
      return;
    }

    const clone = source.cloneNode(true) as HTMLElement;

    clone.querySelector('.page-head')?.remove();
    clone.querySelector('.tabs')?.remove();

    clone.querySelectorAll('button').forEach(button => {
      button.remove();
    });

    clone.setAttribute('dir', 'rtl');
    clone.style.direction = 'rtl';
    clone.style.textAlign = 'right';
    clone.style.background = '#ffffff';
    clone.style.color = '#111827';
    clone.style.width = '1120px';
    clone.style.padding = '20px';
    clone.style.boxSizing = 'border-box';

    const reportNames: Record<ReportTab, string> = {

      att: 'تقرير حضور المتدربين للبرامج',
      achieve: 'تقرير إنجاز المتدربين',
      cap: 'تقرير الطاقة الاستيعابية',
      eval: 'تقرير التقييمات',
      tasks: 'تقرير المهام',
      compare: 'تقرير مقارنة الأقسام والمشرفين'

    };

    const reportName = reportNames[this.activeTab];

    const title = document.createElement('div');

    title.style.direction = 'rtl';
    title.style.textAlign = 'center';
    title.style.marginBottom = '25px';
    title.style.paddingBottom = '15px';
    title.style.borderBottom = '2px solid #00338d';

    const heading = document.createElement('h1');

    heading.textContent = reportName;
    heading.style.margin = '0 0 8px';
    heading.style.fontSize = '24px';
    heading.style.color = '#00338d';

    const systemName = document.createElement('div');

    systemName.textContent = 'نظام نفاذ لإدارة التدريب';
    systemName.style.fontSize = '13px';
    systemName.style.color = '#64748b';

    const reportDate = document.createElement('div');

    reportDate.textContent =
      `تاريخ التقرير: ${new Date().toLocaleDateString('ar-OM')}`;

    reportDate.style.marginTop = '5px';
    reportDate.style.fontSize = '12px';
    reportDate.style.color = '#64748b';

    title.append(heading, systemName, reportDate);

    clone.insertBefore(title, clone.firstChild);

    clone.querySelectorAll('table').forEach(table => {

      table.style.direction = 'rtl';
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';

    });

    const wrapper = document.createElement('div');

    wrapper.style.position = 'fixed';
    wrapper.style.left = '-15000px';
    wrapper.style.top = '0';
    wrapper.style.width = '1160px';
    wrapper.style.background = '#ffffff';
    wrapper.style.padding = '20px';
    wrapper.style.boxSizing = 'border-box';

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    const options = {

      margin: 10,

      filename: `${reportName}.pdf`,

      image: {
        type: 'jpeg' as const,
        quality: 0.98
      },

      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      },

      jsPDF: {
        unit: 'mm' as const,
        format: 'a4' as const,
        orientation: 'landscape' as const
      },

      pagebreak: {
        mode: ['css', 'legacy'] as const
      }

    };

    html2pdf()
      .set(options)
      .from(clone)
      .save()
      .then(() => {
        wrapper.remove();
      })
      .catch(error => {

        console.error('PDF export error:', error);

        wrapper.remove();

        alert('حدث خطأ أثناء إنشاء ملف PDF.');
      });
  }
}
