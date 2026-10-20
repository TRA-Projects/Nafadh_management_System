import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
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

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss']
})
export class ReportsComponent implements OnInit {

  private readonly companyApi = inject(CompanyApi);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  companyId = 1;
  activeTab: ReportTab = 'att';

  attendanceProgramsCards = [
    { name: 'علم البيانات وتعلم الآلة 27', value: 96 },
    { name: 'تطوير تطبيقات الويب', value: 94 },
    { name: 'إدارة قواعد البيانات', value: 91 }
  ];

  attendanceWeeks = [
    { label: 'الأسبوع 27', value: 95.1 },
    { label: 'الأسبوع 28', value: 93.4 },
    { label: 'الأسبوع 29', value: 96.8 },
    { label: 'الأسبوع 30', value: 92.7 },
    { label: 'الأسبوع 31', value: 94.5 },
    { label: 'الأسبوع 32', value: 95.6 }
  ];

  attendanceDepartments = [
    {
      department: 'تقنية المعلومات',
      trainees: 46,
      attendance: 96,
      absence: 4,
      late: 8,
      evaluation: 'ممتاز',
      status: 'ok'
    },
    {
      department: 'الموارد البشرية',
      trainees: 12,
      attendance: 95,
      absence: 2,
      late: 3,
      evaluation: 'ممتاز',
      status: 'ok'
    },
    {
      department: 'العمليات',
      trainees: 24,
      attendance: 91,
      absence: 5,
      late: 9,
      evaluation: 'جيد',
      status: 'warn'
    },
    {
      department: 'التسويق',
      trainees: 8,
      attendance: 78,
      absence: 6,
      late: 7,
      evaluation: 'يحتاج متابعة',
      status: 'bad'
    }
  ];

  achievementPrograms = [
    { id: 1, name: 'علم البيانات وتعلم الآلة 27', value: 88 },
    { id: 2, name: 'تطوير تطبيقات الويب', value: 84 },
    { id: 3, name: 'إدارة قواعد البيانات', value: 82 }
  ];

  capacityPrograms = [
    {
      name: 'علم البيانات وتعلم الآلة 27',
      capacity: 60,
      used: 54,
      remaining: 6,
      percentage: 90
    },
    {
      name: 'تطوير تطبيقات الويب',
      capacity: 40,
      used: 38,
      remaining: 2,
      percentage: 95
    },
    {
      name: 'إدارة قواعد البيانات',
      capacity: 25,
      used: 24,
      remaining: 1,
      percentage: 96
    }
  ];

  evaluations = [
    {
      supervisor: 'خالد المعمري',
      department: 'تقنية المعلومات',
      required: 3,
      late: 2,
      lastEvaluation: '05 أغسطس 2026',
      status: 'متأخر',
      statusClass: 'bad'
    },
    {
      supervisor: 'سعاد الشامسية',
      department: 'الموارد البشرية',
      required: 2,
      late: 1,
      lastEvaluation: '06 أغسطس 2026',
      status: 'قريب من الموعد',
      statusClass: 'warn'
    },
    {
      supervisor: 'طارق السالمي',
      department: 'الأمن السيبراني',
      required: 4,
      late: 1,
      lastEvaluation: '04 أغسطس 2026',
      status: 'قريب من الموعد',
      statusClass: 'warn'
    }
  ];

  tasks = [
    {
      trainee: 'أحمد بن سعيد البلوشي',
      task: 'تطوير واجهة المستخدم',
      due: '10 أغسطس 2026',
      status: 'review'
    },
    {
      trainee: 'سعيد بن محمد البوسعيدي',
      task: 'تحليل البيانات',
      due: '12 أغسطس 2026',
      status: 'pending'
    },
    {
      trainee: 'عمر بن ناصر الفارسي',
      task: 'اختبار النظام',
      due: '08 أغسطس 2026',
      status: 'late'
    }
  ];

  supervisors = [
    {
      name: 'خالد المعمري',
      department: 'تقنية المعلومات',
      trainees: 24,
      attendance: 96,
      performance: 88,
      pendingEvaluations: 2,
      overall: 'ممتاز',
      statusClass: 'ok'
    },
    {
      name: 'سعاد الشامسية',
      department: 'الموارد البشرية',
      trainees: 18,
      attendance: 95,
      performance: 90,
      pendingEvaluations: 1,
      overall: 'ممتاز',
      statusClass: 'ok'
    },
    {
      name: 'طارق السالمي',
      department: 'الأمن السيبراني',
      trainees: 16,
      attendance: 92,
      performance: 84,
      pendingEvaluations: 4,
      overall: 'جيد',
      statusClass: 'warn'
    },
    {
      name: 'ليلى الكيومية',
      department: 'التسويق',
      trainees: 8,
      attendance: 78,
      performance: 62,
      pendingEvaluations: 2,
      overall: 'يحتاج متابعة',
      statusClass: 'bad'
    },
    {
      name: 'ياسر السالمي',
      department: 'العمليات',
      trainees: 6,
      attendance: 90,
      performance: 81,
      pendingEvaluations: 0,
      overall: 'جيد',
      statusClass: 'warn'
    }
  ];

  comparisonDepartments = [
    { name: 'تقنية المعلومات', value: 96 },
    { name: 'الموارد البشرية', value: 95 },
    { name: 'العمليات', value: 91 },
    { name: 'التسويق', value: 78 }
  ];

  ngOnInit(): void {
    this.loadAttendancePrograms();
  }

  loadAttendancePrograms(): void {
    this.companyApi.getCompanyPrograms(this.companyId).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.items || res?.data || res?.programs || []);
        if (Array.isArray(data) && data.length > 0) {
          // جلب أو تحديث البرامج إن لزم
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading programs attendance', err);
      }
    });
  }

  selectTab(tab: ReportTab): void {
    this.activeTab = tab;
  }

  exportExcel(): void {
    let data: any[] = [];
    let fileName = 'Nafadh_Report';

    switch (this.activeTab) {
      case 'att':
        data = this.attendanceProgramsCards.map(item => ({
          'البرنامج': item.name,
          'معدل الحضور': `${item.value}%`
        }));
        fileName = 'Nafadh_Programs_Attendance_Report';
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

    const worksheet = XLSX.utils.json_to_sheet(data);
    const columnWidths = Object.keys(data[0]).map(key => {
      const maxLength = Math.max(
        key.length,
        ...data.map(row => String(row[key] ?? '').length)
      );
      return { wch: Math.min(Math.max(maxLength + 3, 12), 35) };
    });

    worksheet['!cols'] = columnWidths;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'التقرير');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }

  exportPdf(): void {
    const source = document.querySelector('.reports-page') as HTMLElement | null;

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

    clone.querySelectorAll('table').forEach(table => {
      const element = table as HTMLElement;
      element.style.direction = 'rtl';
      element.style.width = '100%';
    });

    let reportName = 'تقرير نفاذ';
    switch (this.activeTab) {
      case 'att': reportName = 'تقرير حضور المتدربين للبرامج'; break;
      case 'achieve': reportName = 'تقرير إنجاز المتدربين'; break;
      case 'cap': reportName = 'تقرير الطاقة الاستيعابية'; break;
      case 'eval': reportName = 'تقرير التقييمات'; break;
      case 'tasks': reportName = 'تقرير المهام'; break;
      case 'compare': reportName = 'تقرير مقارنة الأقسام والمشرفين'; break;
    }

    const title = document.createElement('div');
    title.style.direction = 'rtl';
    title.style.textAlign = 'center';
    title.style.marginBottom = '25px';
    title.style.paddingBottom = '15px';
    title.style.borderBottom = '2px solid #00338d';

    title.innerHTML = `
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #00338d;">
        ${reportName}
      </h1>
      <div style="font-size: 13px; color: #64748b;">نظام نفاذ لإدارة التدريب</div>
      <div style="margin-top: 5px; font-size: 12px; color: #94a3b8;">
        تاريخ التقرير: ${new Date().toLocaleDateString('ar-OM')}
      </div>
    `;

    clone.insertBefore(title, clone.firstChild);

    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-10000px';
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
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const },
      pagebreak: { mode: ['css', 'legacy'] as const }
    };

    html2pdf()
      .set(options)
      .from(clone)
      .save()
      .then(() => { wrapper.remove(); })
      .catch((error: unknown) => {
        console.error('PDF export error:', error);
        wrapper.remove();
        alert('حدث خطأ أثناء إنشاء ملف PDF.');
      });
  }

  getTaskStatusClass(status: string): string {
    switch (status) {
      case 'review': return 'info';
      case 'pending': return 'warn';
      case 'late': return 'bad';
      default: return 'ok';
    }
  }

  getTaskStatusText(status: string): string {
    switch (status) {
      case 'review': return 'قيد المراجعة';
      case 'pending': return 'بانتظار الاستلام';
      case 'late': return 'متأخرة';
      default: return 'مكتملة';
    }
  }

  // دالة الانتقال المانعة للخروج من النظام
  // دالة الانتقال المحدثة بالمسار الدقيق تماماً للنظام
  viewProgramOrTraineeDetails(program: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    // الانتقال المباشر إلى مسار التقدم والتفاصيل الصحيح مع تمرير المعرف (id)
    const traineeOrProgramId = program.id || 1;
    this.router.navigate([`/company/trainees/${traineeOrProgramId}/progress`]);
  }
}