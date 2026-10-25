
import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

import { CompanyApi } from '../../services/company-api';

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
  trainee: string;
  task: string;
  due: string;
  status: string;
}

interface SupervisorReport {
  id?: number | string;
  name: string;
  department: string;
  trainees: number;
  attendance: number;
  performance: number;
  pendingEvaluations: number;
  overall: string;
  statusClass: string;
}

interface ComparisonDepartment {
  name: string;
  value: number;
}

interface DemoSupervisorStats {
  trainees: number;
  attendance: number;
  performance: number;
  pendingEvaluations: number;
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

  companyId = 1;
  activeTab: ReportTab = 'att';

  loading = false;
  exporting = false;

  // =====================================================
  // بيانات تجريبية لمقارنة المشرفين
  // =====================================================
  // هذه القيم للعرض التجريبي فقط وليست بيانات فعلية.

  private readonly demoSupervisorStats: DemoSupervisorStats[] = [
    {
      trainees: 12,
      attendance: 96,
      performance: 94,
      pendingEvaluations: 1
    },
    {
      trainees: 8,
      attendance: 91,
      performance: 87,
      pendingEvaluations: 2
    },
    {
      trainees: 15,
      attendance: 88,
      performance: 82,
      pendingEvaluations: 3
    },
    {
      trainees: 10,
      attendance: 95,
      performance: 91,
      pendingEvaluations: 0
    },
    {
      trainees: 7,
      attendance: 89,
      performance: 85,
      pendingEvaluations: 2
    }
  ];

  // =====================================================
  // 1. الحضور حسب البرامج
  // =====================================================

  attendanceProgramsCards: {
    name: string;
    value: number;
  }[] = [
    { name: 'علم البيانات وتعلم الآلة', value: 96 },
    { name: 'تطوير تطبيقات الويب', value: 94 },
    { name: 'إدارة قواعد البيانات', value: 91 }
  ];

  attendanceWeeks: AttendanceWeek[] = [
    { label: 'الأسبوع 27', value: 96 },
    { label: 'الأسبوع 28', value: 94 },
    { label: 'الأسبوع 29', value: 99 },
    { label: 'الأسبوع 30', value: 92 },
    { label: 'الأسبوع 31', value: 95 },
    { label: 'الأسبوع 32', value: 96 }
  ];

  attendanceDepartments: AttendanceDepartment[] = [
    {
      department: 'تقنية المعلومات',
      trainees: 18,
      attendance: 96,
      absence: 4,
      late: 2,
      evaluation: 'ممتاز',
      status: 'ok'
    },
    {
      department: 'الموارد البشرية',
      trainees: 12,
      attendance: 94,
      absence: 6,
      late: 3,
      evaluation: 'ممتاز',
      status: 'ok'
    },
    {
      department: 'التسويق',
      trainees: 15,
      attendance: 92,
      absence: 8,
      late: 2,
      evaluation: 'جيد',
      status: 'warn'
    },
    {
      department: 'المالية',
      trainees: 10,
      attendance: 90,
      absence: 10,
      late: 4,
      evaluation: 'جيد',
      status: 'warn'
    }
  ];

  // =====================================================
  // 2. إنجاز المتدربين
  // =====================================================

  achievementPrograms: AchievementProgram[] = [
    {
      id: 1,
      name: 'علم البيانات وتعلم الآلة',
      value: 90
    },
    {
      id: 2,
      name: 'تطوير تطبيقات الويب',
      value: 86
    },
    {
      id: 3,
      name: 'إدارة قواعد البيانات',
      value: 82
    }
  ];

  // =====================================================
  // 3. الطاقة الاستيعابية
  // =====================================================

  capacityPrograms: CapacityProgram[] = [
    {
      name: 'تطوير تطبيقات الويب',
      capacity: 60,
      used: 54,
      remaining: 6,
      percentage: 90
    },
    {
      name: 'علم البيانات وتعلم الآلة',
      capacity: 50,
      used: 42,
      remaining: 8,
      percentage: 84
    },
    {
      name: 'إدارة قواعد البيانات',
      capacity: 40,
      used: 32,
      remaining: 8,
      percentage: 80
    }
  ];

  // =====================================================
  // 4. التقييمات
  // =====================================================

  evaluations: EvaluationReport[] = [
    {
      supervisor: 'المشرف الأول',
      department: 'تقنية المعلومات',
      required: 3,
      late: 1,
      lastEvaluation: '2026/10/15',
      status: 'بحاجة إلى متابعة',
      statusClass: 'warn'
    },
    {
      supervisor: 'المشرف الثاني',
      department: 'الموارد البشرية',
      required: 3,
      late: 0,
      lastEvaluation: '2026/10/18',
      status: 'منتظم',
      statusClass: 'ok'
    }
  ];

  // =====================================================
  // 5. المهام التجريبية
  // =====================================================

  tasks: TaskReport[] = [
    {
      trainee: 'أحمد محمد الزهراني',
      task: 'تطوير واجهة تسجيل الدخول',
      due: '2026/10/28',
      status: 'completed'
    },
    {
      trainee: 'حسن الجابري',
      task: 'تصميم قاعدة بيانات المتدربين',
      due: '2026/10/30',
      status: 'pending'
    },
    {
      trainee: 'ناصر الحارثي',
      task: 'إعداد تقرير الحضور الأسبوعي',
      due: '2026/10/26',
      status: 'review'
    },
    {
      trainee: 'علي الريامي',
      task: 'اختبار صلاحيات المستخدمين',
      due: '2026/10/23',
      status: 'late'
    },
    {
      trainee: 'مروان البلوشي',
      task: 'تطوير لوحة التحكم',
      due: '2026/11/02',
      status: 'pending'
    },
    {
      trainee: 'عائشة البلوشي',
      task: 'تحليل متطلبات النظام',
      due: '2026/10/22',
      status: 'completed'
    },
    {
      trainee: 'سارة الظاهري',
      task: 'توثيق واجهات API',
      due: '2026/10/29',
      status: 'review'
    },
    {
      trainee: 'محمد الحبيسي',
      task: 'اختبار نظام تسجيل الدخول',
      due: '2026/10/24',
      status: 'late'
    },
    {
      trainee: 'حمد البوسعيدي',
      task: 'إنشاء الرسوم البيانية للتقارير',
      due: '2026/10/31',
      status: 'pending'
    },
    {
      trainee: 'حصة المقبالي',
      task: 'مراجعة دليل المستخدم',
      due: '2026/10/21',
      status: 'completed'
    }
  ];

  get taskTotalCount(): number {
    return this.tasks.length;
  }

  get taskPendingCount(): number {
    return this.tasks.filter(
      task => task.status === 'pending'
    ).length;
  }

  get taskReviewCount(): number {
    return this.tasks.filter(
      task => task.status === 'review'
    ).length;
  }

  get taskLateCount(): number {
    return this.tasks.filter(
      task => task.status === 'late'
    ).length;
  }

  get taskCompletedCount(): number {
    return this.tasks.filter(
      task => task.status === 'completed'
    ).length;
  }

  // =====================================================
  // 6. مقارنة المشرفين
  // =====================================================

  supervisors: SupervisorReport[] = [
    {
      id: 1,
      name: 'المشرف الأول',
      department: 'تقنية المعلومات',
      trainees: 12,
      attendance: 96,
      performance: 94,
      pendingEvaluations: 1,
      overall: 'ممتاز',
      statusClass: 'ok'
    },
    {
      id: 2,
      name: 'المشرف الثاني',
      department: 'الموارد البشرية',
      trainees: 8,
      attendance: 91,
      performance: 87,
      pendingEvaluations: 2,
      overall: 'جيد جداً',
      statusClass: 'ok'
    },
    {
      id: 3,
      name: 'المشرف الثالث',
      department: 'التسويق',
      trainees: 15,
      attendance: 88,
      performance: 82,
      pendingEvaluations: 3,
      overall: 'جيد',
      statusClass: 'warn'
    }
  ];

  comparisonDepartments: ComparisonDepartment[] = [
    { name: 'المشرف الأول', value: 96 },
    { name: 'المشرف الثاني', value: 91 },
    { name: 'المشرف الثالث', value: 88 }
  ];

  // =====================================================
  // 7. بدء تحميل التقارير
  // =====================================================

  ngOnInit(): void {
    this.loadAllReportsData();
  }

  loadAllReportsData(): void {

    this.loading = true;

    // -----------------------------------------
    // الطاقة الاستيعابية
    // -----------------------------------------

    this.companyApi
      .getCompanyCapacitySummary(this.companyId)
      .subscribe({
        next: (res: any) => {

          if (res && typeof res === 'object') {

            const total = this.toNumber(res.total);
            const used = this.toNumber(res.used);

            const remaining = this.toNumber(
              res.remaining ?? Math.max(0, total - used)
            );

            this.capacityPrograms = [
              {
                name: 'إجمالي البرامج التدريبية المخصصة للشركة',
                capacity: total,
                used,
                remaining,
                percentage: total > 0
                  ? Math.round((used / total) * 100)
                  : 0
              }
            ];
          }

          this.cdr.markForCheck();
        },
        error: (error: unknown) => {
          console.error(
            'Error loading capacity summary:',
            error
          );
        }
      });

    // -----------------------------------------
    // مخطط الحضور الأسبوعي
    // -----------------------------------------

    this.companyApi
      .getAttendanceChart(this.companyId)
      .subscribe({
        next: (res: any) => {

          const weeks = Array.isArray(res)
            ? res
            : Array.isArray(res?.weeks)
              ? res.weeks
              : [];

          if (weeks.length) {

            this.attendanceWeeks = weeks.map(
              (
                week: any,
                index: number
              ): AttendanceWeek => ({
                label: String(
                  week?.label ?? `الأسبوع ${index + 1}`
                ),
                value: this.clampPercentage(
                  week?.value ?? week?.attendance ?? 0
                )
              })
            );
          }

          this.cdr.markForCheck();
        },
        error: (error: unknown) => {
          console.error(
            'Error loading attendance chart:',
            error
          );
        }
      });

    // -----------------------------------------
    // المشرفون
    // الأسماء والأقسام من API
    // المؤشرات رقمية تجريبية متنوعة
    // -----------------------------------------

    this.companyApi
      .getSupervisors(this.companyId)
      .subscribe({
        next: (res: any) => {

          const list = Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
              ? res.data
              : [];

          if (list.length) {

            this.supervisors = list.map(
              (
                sup: any,
                index: number
              ): SupervisorReport => {

                const demo = this.demoSupervisorStats[
                  index % this.demoSupervisorStats.length
                ];

                const attendance = demo.attendance;
                const performance = demo.performance;
                const pending = demo.pendingEvaluations;

                const overall =
                  attendance >= 94 && performance >= 90
                    ? 'ممتاز'
                    : attendance >= 90 && performance >= 85
                      ? 'جيد جداً'
                      : 'جيد';

                return {
                  id:
                    sup?.supervisorId ??
                    sup?.id ??
                    index + 1,

                  name: String(
                    sup?.fullName ??
                    sup?.name ??
                    `المشرف ${index + 1}`
                  ),

                  department: String(
                    sup?.department ??
                    sup?.departmentName ??
                    'غير محدد'
                  ),

                  trainees: demo.trainees,
                  attendance,
                  performance,
                  pendingEvaluations: pending,
                  overall,

                  statusClass:
                    attendance >= 90 && performance >= 85
                      ? 'ok'
                      : 'warn'
                };
              }
            );

            // مزامنة بيانات التقييمات مع المشرفين
            this.evaluations = this.supervisors.map(
              (sup): EvaluationReport => ({
                supervisor: sup.name,
                department: sup.department,
                required: 3,
                late: sup.pendingEvaluations,
                lastEvaluation: '—',

                status: sup.pendingEvaluations > 0
                  ? 'بحاجة إلى متابعة'
                  : 'منتظم',

                statusClass: sup.pendingEvaluations > 0
                  ? 'warn'
                  : 'ok'
              })
            );

            // الرسم البياني للمقارنة
            this.comparisonDepartments =
              this.supervisors.map(
                (sup): ComparisonDepartment => ({
                  name: sup.name,
                  value: sup.attendance
                })
              );
          }

          this.cdr.markForCheck();
        },
        error: (error: unknown) => {
          console.error(
            'Error loading supervisors:',
            error
          );
        }
      });

    // -----------------------------------------
    // تسجيلات المتدربين
    // للإنجاز والحضور فقط، وليس للمهام
    // -----------------------------------------

    this.companyApi
      .getEnrollmentsByCompany(this.companyId)
      .subscribe({
        next: (res: any) => {

          const list = Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
              ? res.data
              : [];

          if (list.length) {

            this.achievementPrograms = list
              .slice(0, 3)
              .map(
                (
                  enrollment: any,
                  index: number
                ): AchievementProgram => ({
                  id: this.toNumber(
                    enrollment?.id ?? index + 1
                  ),

                  name: String(
                    enrollment?.programName ??
                    enrollment?.program?.name ??
                    `برنامج تدريبي ${index + 1}`
                  ),

                  value: this.clampPercentage(
                    enrollment?.achievementPercentage ??
                    enrollment?.completionPercentage ??
                    85
                  )
                })
              );

            this.attendanceProgramsCards = list
              .slice(0, 3)
              .map(
                (
                  enrollment: any,
                  index: number
                ) => ({
                  name: String(
                    enrollment?.programName ??
                    enrollment?.program?.name ??
                    `برنامج تدريبي ${index + 1}`
                  ),

                  value: this.clampPercentage(
                    enrollment?.attendanceRate ??
                    92 + index
                  )
                })
              );
          }

          // لا نستبدل المهام ببيانات التسجيلات
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error: unknown) => {

          console.error(
            'Error loading company enrollments:',
            error
          );

          this.loading = false;
          this.cdr.markForCheck();
        }
      });

    // -----------------------------------------
    // الأقسام الافتراضية عند الحاجة
    // -----------------------------------------

    const departments = [
      'تقنية المعلومات',
      'الموارد البشرية',
      'التسويق',
      'المالية',
      'التدريب والتطوير',
      'الجودة',
      'الشؤون الإدارية'
    ];

    if (!this.attendanceDepartments.length) {

      this.attendanceDepartments = departments.map(
        (
          department,
          index
        ): AttendanceDepartment => ({
          department,
          trainees: 8 + (index * 4) % 15,
          attendance: 90 + (index * 2) % 8,
          absence: 10 - (index * 2) % 8,
          late: 2 + (index % 3),
          evaluation: '—',
          status: 'ok'
        })
      );
    }
  }

  // =====================================================
  // 8. تغيير التبويب
  // =====================================================

  selectTab(tab: ReportTab): void {
    this.activeTab = tab;
  }

  // =====================================================
  // 9. الدوال المساعدة
  // =====================================================

  private toNumber(value: unknown): number {
    const numberValue = Number(value);

    return Number.isFinite(numberValue)
      ? numberValue
      : 0;
  }

  private clampPercentage(value: unknown): number {
    return Math.min(
      100,
      Math.max(0, this.toNumber(value))
    );
  }

  // =====================================================
  // 10. حالات المهام
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
        return 'ok';
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
  // 11. عرض تفاصيل البرنامج أو المتدرب
  // =====================================================

  viewProgramOrTraineeDetails(
    program: AchievementProgram,
    event?: Event
  ): void {

    event?.preventDefault();
    event?.stopPropagation();

    const id = program?.id;

    if (!id) {
      alert('لا يتوفر معرّف لهذا البرنامج.');
      return;
    }

    this.router.navigate([
      '/company/trainees',
      id,
      'progress'
    ]);
  }

  // =====================================================
  // 12. تصدير Excel
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

        data = this.achievementPrograms.map(item => ({
          'البرنامج': item.name,
          'نسبة الإنجاز': `${item.value}%`
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
          'المتدرب': item.trainee,
          'المهمة': item.task,
          'الموعد': item.due,
          'الحالة': this.getTaskStatusText(item.status)
        }));

        fileName = 'Nafadh_Tasks_Report';
        break;

      case 'compare':

        data = this.supervisors.map(item => ({
          'المشرف': item.name,
          'القسم': item.department,
          'المتدربون': item.trainees,
          'معدل الحضور': `${item.attendance}%`,
          'متوسط الأداء': `${item.performance}%`,
          'تقييمات معلقة': item.pendingEvaluations,
          'الأداء العام': item.overall
        }));

        fileName = 'Nafadh_Supervisors_Comparison_Report';
        break;
    }

    if (!data.length) {
      alert('لا توجد بيانات لتصديرها.');
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

    } catch (error: unknown) {

      console.error(
        'Excel export error:',
        error
      );

      alert('حدث خطأ أثناء إنشاء ملف Excel.');
    }
  }

  // =====================================================
  // 13. تصدير PDF
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

    // إزالة عناصر التحكم من نسخة PDF
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

    title.append(
      heading,
      systemName,
      reportDate
    );

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
      .catch((error: unknown) => {

        console.error(
          'PDF export error:',
          error
        );

        wrapper.remove();

        alert('حدث خطأ أثناء إنشاء ملف PDF.');
      });
  }
}
