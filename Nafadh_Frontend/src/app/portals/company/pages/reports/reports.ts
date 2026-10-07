import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

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
  imports: [CommonModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss']
})
export class ReportsComponent {

  activeTab: ReportTab = 'att';

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
    {
      name: 'تطوير تطبيقات الويب',
      value: 88
    },
    {
      name: 'تحليل البيانات',
      value: 84
    },
    {
      name: 'الأمن السيبراني',
      value: 82
    },
    {
      name: 'الدعم الفني',
      value: 79
    },
    {
      name: 'التصميم الجرافيكي',
      value: 90
    }
  ];

  capacityPrograms = [
    {
      name: 'تطوير تطبيقات الويب',
      capacity: 60,
      used: 54,
      remaining: 6,
      percentage: 90
    },
    {
      name: 'تحليل البيانات',
      capacity: 40,
      used: 38,
      remaining: 2,
      percentage: 95
    },
    {
      name: 'الأمن السيبراني',
      capacity: 25,
      used: 24,
      remaining: 1,
      percentage: 96
    },
    {
      name: 'الدعم الفني',
      capacity: 15,
      used: 8,
      remaining: 7,
      percentage: 53
    },
    {
      name: 'التصميم الجرافيكي',
      capacity: 10,
      used: 4,
      remaining: 6,
      percentage: 40
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
    {
      name: 'تقنية المعلومات',
      value: 96
    },
    {
      name: 'الموارد البشرية',
      value: 95
    },
    {
      name: 'العمليات',
      value: 91
    },
    {
      name: 'التسويق',
      value: 78
    }
  ];

  selectTab(tab: ReportTab): void {
    this.activeTab = tab;
  }

  exportPdf(): void {
    alert('تم تجهيز تصدير التقرير PDF - يمكن ربطه لاحقاً مع خدمة التصدير');
  }

  exportExcel(): void {
    alert('تم تجهيز تصدير التقرير Excel - يمكن ربطه لاحقاً مع خدمة التصدير');
  }

  getBarWidth(value: number, max: number = 100): number {
    return Math.min((value / max) * 100, 100);
  }

  getCapacityWidth(value: number): number {
    return Math.min(value, 100);
  }

  getTaskStatusText(status: string): string {
    switch (status) {
      case 'review':
        return 'قيد المراجعة';

      case 'pending':
        return 'بانتظار الاستلام';

      case 'late':
        return 'متأخرة';

      default:
        return status;
    }
  }

  getTaskStatusClass(status: string): string {
    switch (status) {
      case 'review':
        return 'info';

      case 'pending':
        return 'warn';

      case 'late':
        return 'bad';

      default:
        return '';
    }
  }
}