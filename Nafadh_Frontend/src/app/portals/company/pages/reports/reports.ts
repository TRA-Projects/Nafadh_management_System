import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ProgramDetails {
  id: number;
  title: string;
  category: string;
  description: string;
  occupied: number;
  capacity: number;
  percent: number;
  color: string;
}

type ReportTab =
  | 'attendance'
  | 'progress'
  | 'capacity'
  | 'evaluations'
  | 'tasks'
  | 'comparison';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss']
})
export class ReportsComponent {

  @Input() programs: ProgramDetails[] = [];

  @Output() selectProgram = new EventEmitter<number>();

  activeTab: ReportTab = 'attendance';

  exportNotice = '';

  // ==========================================
  // تقرير حضور الأقسام
  // ==========================================
  departmentAttendanceReport = [
    {
      department: 'تقنية المعلومات',
      traineesCount: 12,
      attendanceRate: 94,
      absences: 3,
      lateCount: 2,
      rating: 'ممتاز',
      tone: 'emerald'
    },
    {
      department: 'الموارد البشرية',
      traineesCount: 8,
      attendanceRate: 91,
      absences: 4,
      lateCount: 3,
      rating: 'جيد جداً',
      tone: 'sky'
    },
    {
      department: 'التسويق',
      traineesCount: 10,
      attendanceRate: 88,
      absences: 5,
      lateCount: 4,
      rating: 'جيد جداً',
      tone: 'amber'
    },
    {
      department: 'المالية',
      traineesCount: 7,
      attendanceRate: 96,
      absences: 2,
      lateCount: 1,
      rating: 'ممتاز',
      tone: 'emerald'
    }
  ];

  // ==========================================
  // تقرير الحضور الأسبوعي
  // ==========================================
  weeklyAttendanceReport = [
    {
      week: 'الأسبوع الأول',
      attendance: 92,
      rate: 92
    },
    {
      week: 'الأسبوع الثاني',
      attendance: 94,
      rate: 94
    },
    {
      week: 'الأسبوع الثالث',
      attendance: 91,
      rate: 91
    },
    {
      week: 'الأسبوع الرابع',
      attendance: 96,
      rate: 96
    },
    {
      week: 'الأسبوع الخامس',
      attendance: 93,
      rate: 93
    }
  ];

  // ==========================================
  // قائمة المشرفين
  // ==========================================
  supervisorsList = [
    {
      id: 1,
      name: 'أحمد محمد',
      role: 'مشرف',
      department: 'تقنية المعلومات',
      traineesCount: 6,
      attendanceRate: 95,
      rating: 'ممتاز',
      avgProgress: 92
    },
    {
      id: 2,
      name: 'سارة علي',
      role: 'مشرف',
      department: 'الموارد البشرية',
      traineesCount: 5,
      attendanceRate: 92,
      rating: 'جيد جداً',
      avgProgress: 88
    },
    {
      id: 3,
      name: 'خالد سالم',
      role: 'مشرف',
      department: 'التسويق',
      traineesCount: 7,
      attendanceRate: 89,
      rating: 'جيد جداً',
      avgProgress: 84
    },
    {
      id: 4,
      name: 'مريم أحمد',
      role: 'مشرف',
      department: 'المالية',
      traineesCount: 4,
      attendanceRate: 97,
      rating: 'ممتاز',
      avgProgress: 95
    }
  ];

  // ==========================================
  // تبويبات التقارير
  // ==========================================
  tabs: { id: ReportTab; label: string }[] = [
    {
      id: 'attendance',
      label: 'حضور الشركة'
    },
    {
      id: 'progress',
      label: 'إنجاز المتدربين'
    },
    {
      id: 'capacity',
      label: 'الطاقة الاستيعابية'
    },
    {
      id: 'evaluations',
      label: 'التقييمات'
    },
    {
      id: 'tasks',
      label: 'المهام'
    },
    {
      id: 'comparison',
      label: 'مقارنة الأقسام والمشرفين'
    }
  ];

  // ==========================================
  // تغيير التبويب
  // ==========================================
  setActiveTab(tab: ReportTab): void {
    this.activeTab = tab;
  }

  // ==========================================
  // تصدير PDF
  // ==========================================
  handleExportPdf(): void {
    this.exportNotice = 'جاري تجهيز ملف PDF للطباعة...';

    setTimeout(() => {
      window.print();
      this.exportNotice = '';
    }, 300);
  }

  // ==========================================
  // تصدير Excel / CSV
  // ==========================================
  handleExportExcel(): void {

    const headers = [
      'القسم',
      'عدد المتدربين',
      'معدل الحضور',
      'الغياب',
      'التأخر',
      'التقييم'
    ];

    const rows = this.departmentAttendanceReport.map((d) => [
      d.department,
      d.traineesCount.toString(),
      `${d.attendanceRate}%`,
      d.absences.toString(),
      d.lateCount.toString(),
      d.rating
    ]);

    const csvContent =
      '\uFEFF' +
      [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${cell}"`).join(',')
        )
      ].join('\n');

    const blob = new Blob(
      [csvContent],
      {
        type: 'text/csv;charset=utf-8;'
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;

    link.setAttribute(
      'download',
      'تقرير_حضور_الشركة_نفاذ.csv'
    );

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    this.exportNotice = 'تم تصدير ملف Excel (CSV) بنجاح.';

    setTimeout(() => {
      this.exportNotice = '';
    }, 3000);
  }

  // ==========================================
  // اختيار البرنامج
  // ==========================================
  onSelectProgram(programId: number): void {
    this.selectProgram.emit(programId);
  }

  // ==========================================
  // تحديد لون الـ Badge
  // ==========================================
  getBadgeClass(tone: string): string {

    if (tone === 'emerald' || tone === 'sky') {
      return 'badge-blue';
    }

    if (tone === 'amber') {
      return 'badge-amber';
    }

    return 'badge-red';
  }
}
