import {
  Component,
  OnInit,
  ElementRef,
  inject,
  signal,
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import * as XLSX from 'xlsx';

// @ts-ignore
import html2pdf from 'html2pdf.js';

interface AttendanceRow {
  traineeId: number;
  traineeName: string;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  attendanceRate: number;
}

interface AttendanceReportDto {
  totalTrainees?: number;
  presentCount?: number;
  absentCount?: number;
  latenessCount?: number;
  earlyLeaveCount?: number;
  attendanceRate?: number;
  overallAttendanceRate?: number;
  chart?: {
    label: string;
    value: number;
  }[];
  rows?: AttendanceRow[];
}

interface AchievementReportDto {
  total?: number;
  completed?: number;
  rate?: number;
}

interface CapacityProgram {
  programName: string;
  allocatedQuota: number;
  usedQuota: number;
  remainingQuota: number;
  utilizationPercentage: number;
}

interface CapacityReportDto {
  total?: number;
  used?: number;
  remaining?: number;
  programs?: CapacityProgram[];
}

interface ProgramProgress {
  programName: string;
  shortName: string;
  progress: number;
  colorClass: string;
}

@Component({
  selector: 'app-company-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss'
})
export class ReportsComponent implements OnInit {

  private readonly elementRef = inject(ElementRef);

  readonly tab = signal<
    'attendance' | 'achievement' | 'capacity'
  >('achievement');

  readonly loading = signal(false);

  readonly errorMessage = signal<string | null>(null);

  readonly attendance =
    signal<AttendanceReportDto | null>(null);

  readonly achievement =
    signal<AchievementReportDto | null>(null);

  readonly capacity =
    signal<CapacityReportDto | null>(null);


  // =====================================================
  // بيانات البرامج التجريبية
  // =====================================================

  readonly programProgressList: ProgramProgress[] = [
    {
      programName: 'برنامج تطوير البرمجيات',
      shortName: 'البرمجيات',
      progress: 96,
      colorClass: 'blue'
    },
    {
      programName: 'برنامج الأمن السيبراني',
      shortName: 'الأمن السيبراني',
      progress: 91,
      colorClass: 'cyan'
    },
    {
      programName: 'برنامج تحليل البيانات',
      shortName: 'تحليل البيانات',
      progress: 88,
      colorClass: 'purple'
    },
    {
      programName: 'برنامج إدارة المشاريع',
      shortName: 'إدارة المشاريع',
      progress: 82,
      colorClass: 'orange'
    },
    {
      programName: 'برنامج التسويق الرقمي',
      shortName: 'التسويق',
      progress: 74,
      colorClass: 'red'
    },
    {
      programName: 'برنامج الموارد البشرية',
      shortName: 'الموارد البشرية',
      progress: 93,
      colorClass: 'green'
    }
  ];


  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    this.loadInitialData();
  }


  // =====================================================
  // تحميل بيانات تجريبية
  // =====================================================

  private loadInitialData(): void {

    this.loading.set(true);
    this.errorMessage.set(null);

    setTimeout(() => {

      this.attendance.set({

        totalTrainees: 150,

        presentCount: 145,

        absentCount: 5,

        latenessCount: 8,

        earlyLeaveCount: 3,

        attendanceRate: 96,

        overallAttendanceRate: 94,

        chart: [
          {
            label: 'الأسبوع 1',
            value: 92
          },
          {
            label: 'الأسبوع 2',
            value: 95
          },
          {
            label: 'الأسبوع 3',
            value: 97
          },
          {
            label: 'الأسبوع 4',
            value: 96
          },
          {
            label: 'الأسبوع 5',
            value: 94
          }
        ],

        rows: [
          {
            traineeId: 1001,
            traineeName: 'أحمد محمد',
            presentDays: 22,
            absentDays: 1,
            lateDays: 1,
            excusedDays: 0,
            attendanceRate: 96
          },
          {
            traineeId: 1002,
            traineeName: 'سارة علي',
            presentDays: 23,
            absentDays: 0,
            lateDays: 0,
            excusedDays: 0,
            attendanceRate: 100
          },
          {
            traineeId: 1003,
            traineeName: 'محمد خالد',
            presentDays: 20,
            absentDays: 3,
            lateDays: 2,
            excusedDays: 1,
            attendanceRate: 87
          },
          {
            traineeId: 1004,
            traineeName: 'نورة سالم',
            presentDays: 21,
            absentDays: 2,
            lateDays: 1,
            excusedDays: 1,
            attendanceRate: 91
          },
          {
            traineeId: 1005,
            traineeName: 'خالد عبدالله',
            presentDays: 17,
            absentDays: 6,
            lateDays: 3,
            excusedDays: 1,
            attendanceRate: 74
          }
        ]

      });


      this.achievement.set({

        total: 60,

        completed: 55,

        rate: 87

      });


      this.capacity.set({

        total: 200,

        used: 150,

        remaining: 50,

        programs: [

          {
            programName: 'تطوير البرمجيات',
            allocatedQuota: 50,
            usedQuota: 45,
            remainingQuota: 5,
            utilizationPercentage: 90
          },

          {
            programName: 'الأمن السيبراني',
            allocatedQuota: 40,
            usedQuota: 34,
            remainingQuota: 6,
            utilizationPercentage: 85
          },

          {
            programName: 'تحليل البيانات',
            allocatedQuota: 35,
            usedQuota: 25,
            remainingQuota: 10,
            utilizationPercentage: 71
          },

          {
            programName: 'إدارة المشاريع',
            allocatedQuota: 30,
            usedQuota: 20,
            remainingQuota: 10,
            utilizationPercentage: 67
          },

          {
            programName: 'التسويق الرقمي',
            allocatedQuota: 25,
            usedQuota: 15,
            remainingQuota: 10,
            utilizationPercentage: 60
          },

          {
            programName: 'الموارد البشرية',
            allocatedQuota: 20,
            usedQuota: 11,
            remainingQuota: 9,
            utilizationPercentage: 55
          }

        ]

      });


      this.loading.set(false);

    }, 500);
  }


  // =====================================================
  // Tabs
  // =====================================================

  selectTab(
    tab: 'attendance' | 'achievement' | 'capacity'
  ): void {

    this.tab.set(tab);

  }


  // =====================================================
  // Attendance
  // =====================================================

  readonly attendanceChart = computed(() => {

    return this.attendance()?.chart ?? [];

  });


  readonly totalAbsentDays = computed(() => {

    return this.attendance()?.rows?.reduce(
      (total, row) => total + row.absentDays,
      0
    ) ?? 0;

  });


  readonly totalLateDays = computed(() => {

    return this.attendance()?.rows?.reduce(
      (total, row) => total + row.lateDays,
      0
    ) ?? 0;

  });


  attendanceLabel(rate: number): string {

    if (rate >= 90) {
      return 'ممتاز';
    }

    if (rate >= 75) {
      return 'جيد';
    }

    return 'يحتاج متابعة';

  }


  getInitials(name: string | undefined): string {

    if (!name) {
      return '?';
    }

    const parts = name.trim().split(/\s+/);

    if (parts.length === 1) {
      return parts[0].substring(0, 2);
    }

    return (
      parts[0].charAt(0) +
      parts[1].charAt(0)
    );

  }


  clampPercentage(value: number | undefined): number {

    const number = Number(value ?? 0);

    return Math.max(
      0,
      Math.min(100, number)
    );

  }


  // =====================================================
  // Achievement
  // =====================================================

  readonly achievementRate = computed(() => {

    return this.achievement()?.rate ?? 0;

  });


  readonly bestProgram = computed(() => {

    if (!this.programProgressList.length) {
      return null;
    }

    return [...this.programProgressList]
      .sort((a, b) => b.progress - a.progress)[0];

  });


  readonly weakestProgram = computed(() => {

    if (!this.programProgressList.length) {
      return null;
    }

    return [...this.programProgressList]
      .sort((a, b) => a.progress - b.progress)[0];

  });


  // =====================================================
  // Capacity
  // =====================================================

  readonly capacityPercentage = computed(() => {

    const data = this.capacity();

    if (!data?.total) {
      return 0;
    }

    return this.clampPercentage(
      ((data.used ?? 0) / data.total) * 100
    );

  });


  readonly ringCircumference =
    2 * Math.PI * 78;


  readonly ringDashoffset = computed(() => {

    const percentage =
      this.capacityPercentage();

    return (
      this.ringCircumference *
      (1 - percentage / 100)
    );

  });


  // =====================================================
  // Refresh
  // =====================================================

  refreshReports(): void {

    this.loadInitialData();

  }


  // =====================================================
  // PDF
  // =====================================================

  exportPdf(): void {

    const element =
      this.elementRef.nativeElement
        .querySelector('.reports-page');

    if (!element) {
      return;
    }

    const options = {

      margin: 8,

      filename:
        `report_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`,

      image: {
        type: 'jpeg',
        quality: 0.95
      },

      html2canvas: {
        scale: 2,
        useCORS: true
      },

      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'landscape'
      }

    };

    (html2pdf as any)()
      .set(options)
      .from(element)
      .save();

  }


  // =====================================================
  // Excel
  // =====================================================

  exportExcel(): void {

    const workbook =
      XLSX.utils.book_new();


    // Attendance

    const attendanceRows =
      this.attendance()?.rows ?? [];

    const attendanceSheet =
      XLSX.utils.json_to_sheet(
        attendanceRows
      );

    XLSX.utils.book_append_sheet(
      workbook,
      attendanceSheet,
      'الحضور'
    );


    // Capacity

    const capacityRows =
      this.capacity()?.programs ?? [];

    const capacitySheet =
      XLSX.utils.json_to_sheet(
        capacityRows
      );

    XLSX.utils.book_append_sheet(
      workbook,
      capacitySheet,
      'الطاقة الاستيعابية'
    );


    // Achievement

    const achievementSheet =
      XLSX.utils.json_to_sheet(
        this.programProgressList
      );

    XLSX.utils.book_append_sheet(
      workbook,
      achievementSheet,
      'الإنجاز'
    );


    XLSX.writeFile(
      workbook,
      `تقرير_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );

  }

}