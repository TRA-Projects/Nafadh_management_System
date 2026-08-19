// =========================================================
// Imports
// =========================================================

import { CommonModule } from '@angular/common';

import {
  Component,
  ElementRef,
  computed,
  inject,
  signal
} from '@angular/core';

import * as XLSX from 'xlsx';

// @ts-ignore
import html2pdf from 'html2pdf.js';


// =========================================================
// Types
// =========================================================

type TabKey =
  | 'attendance'
  | 'achievement'
  | 'capacity';


export type EnrollmentStatus =
  | 'Completed'
  | 'InProgress'
  | 'Dropped'
  | 'Failed'
  | string;


export type AttendanceChartItem = {
  label: string;
  value: number;
};


export type TraineeAttendanceRow = {
  traineeId: number;
  traineeName?: string;

  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;

  attendanceRate: number;
};


export type AttendanceReportDto = {
  totalTrainees?: number;

  presentCount?: number;
  absentCount?: number;
  latenessCount?: number;
  earlyLeaveCount?: number;

  attendanceRate?: number;
  overallAttendanceRate?: number;
  averageAttendanceRate?: number;

  chart?: AttendanceChartItem[];

  rows?: TraineeAttendanceRow[];
};


export type AchievementItem = {
  id?: number;
  traineeId?: number;

  fullName?: string;
  name?: string;

  progress?: number;
  courseName?: string;

  attendanceRate?: number;
  gpa?: number;
};


export type EnrollmentItem = {
  id?: number;
  enrollmentId?: number;

  traineeName: string;
  batchName: string;
  enrollmentDate: string;

  completionStatus: EnrollmentStatus;
};


export type AchievementReportDto = {
  total?: number;
  completed?: number;
  rate?: number;

  topPerformers?: AchievementItem[];

  atRisk?: AchievementItem[];

  enrollments?: EnrollmentItem[];
};


export type ProgramCapacity = {
  programName: string;

  allocatedQuota: number;
  usedQuota: number;
  remainingQuota: number;

  utilizationPercentage: number;
};


export type CapacityReportDto = {
  total?: number;
  used?: number;
  remaining?: number;

  programs?: ProgramCapacity[];
};


// =========================================================
// برنامج الإنجاز
// =========================================================

export type ProgramProgressItem = {
  programName: string;
  progress: number;

  colorClass:
    | 'blue'
    | 'cyan'
    | 'purple'
    | 'orange'
    | 'green';

  shortName?: string;
};

// =========================================================
// Component
// =========================================================

@Component({
  selector: 'app-company-reports',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl: './reports.html',

  styleUrl: './reports.scss'
})
export class ReportsComponent {

  private readonly elementRef =
    inject(ElementRef);


  // =======================================================
  // General State
  // =======================================================

  readonly tab =
    signal<TabKey>('achievement');


  readonly loading =
    signal(false);


  readonly errorMessage =
    signal<string | null>(null);


  // =======================================================
  // Program Progress
  // =======================================================

  readonly programProgressList:
    ProgramProgressItem[] = [

      {
        programName:
          'تطوير تطبيقات الويب',

        shortName:
          'تطوير الويب',

        progress: 88,

        colorClass:
          'blue'
      },

      {
        programName:
          'تحليل البيانات',

        shortName:
          'تحليل البيانات',

        progress: 84,

        colorClass:
          'cyan'
      },

      {
        programName:
          'الأمن السيبراني',

        shortName:
          'الأمن السيبراني',

        progress: 82,

        colorClass:
          'purple'
      },

      {
        programName:
          'الدعم الفني',

        shortName:
          'الدعم الفني',

        progress: 79,

        colorClass:
          'orange'
      },

      {
        programName:
          'التصميم الجرافيكي',

        shortName:
          'التصميم الجرافيكي',

        progress: 90,

        colorClass:
          'green'
      }

    ];


  // =======================================================
  // Reports
  // =======================================================

  readonly attendance =
    signal<AttendanceReportDto | null>(null);


  readonly achievement =
    signal<AchievementReportDto | null>(null);


  readonly capacity =
    signal<CapacityReportDto | null>(null);


  // =======================================================
  // Donut
  // =======================================================

  readonly ringCircumference =
    2 * Math.PI * 78;


  // =======================================================
  // Attendance Computed
  // =======================================================

  readonly attendanceChart =
    computed(() =>
      this.attendance()?.chart ?? []
    );


  readonly totalAbsentDays =
    computed(() => {

      const rows =
        this.attendance()?.rows ?? [];

      return rows.reduce(
        (total, row) =>
          total + (row.absentDays || 0),
        0
      );

    });


  readonly totalLateDays =
    computed(() => {

      const rows =
        this.attendance()?.rows ?? [];

      return rows.reduce(
        (total, row) =>
          total + (row.lateDays || 0),
        0
      );

    });


  readonly totalExcusedDays =
    computed(() => {

      const rows =
        this.attendance()?.rows ?? [];

      return rows.reduce(
        (total, row) =>
          total + (row.excusedDays || 0),
        0
      );

    });


  // =======================================================
  // Achievement Computed
  // =======================================================
// =======================================================
// Achievement Computed
// =======================================================

readonly achievementTotal = computed(() =>
  this.achievement()?.total ?? 0
);

readonly achievementCompleted = computed(() =>
  this.achievement()?.completed ?? 0
);

readonly achievementRate = computed(() => {
  const rate = this.achievement()?.rate;

  if (rate !== undefined && rate !== null) {
    return rate;
  }

  const total = this.achievement()?.total ?? 0;
  const completed = this.achievement()?.completed ?? 0;

  return total > 0
    ? Math.round((completed / total) * 100)
    : 0;
});

readonly topPerformers = computed(() =>
  this.achievement()?.topPerformers ?? []
);

readonly atRisk = computed(() =>
  this.achievement()?.atRisk ?? []
);

readonly enrollments = computed(() =>
  this.achievement()?.enrollments ?? []
);


// =======================================================
// أفضل وأضعف برنامج
// =======================================================

readonly bestProgram = computed<ProgramProgressItem | null>(() => {
  const list = this.programProgressList;

  if (!list.length) {
    return null;
  }

  return list.reduce((best, current) =>
    current.progress > best.progress
      ? current
      : best
  );
});


readonly weakestProgram = computed<ProgramProgressItem | null>(() => {
  const list = this.programProgressList;

  if (!list.length) {
    return null;
  }

  return list.reduce((weakest, current) =>
    current.progress < weakest.progress
      ? current
      : weakest
  );
});

  // =======================================================
  // Capacity
  // =======================================================

  readonly capacityPercentage =
    computed(() => {

      const cap =
        this.capacity();

      if (!cap || !cap.total) {
        return 0;
      }

      return Math.min(
        100,
        Math.round(
          ((cap.used ?? 0) / cap.total) * 100
        )
      );

    });


  // =======================================================
  // Constructor
  // =======================================================

  constructor() {

    this.loadInitialData();

  }


  // =======================================================
  // Load Data
  // =======================================================

  private loadInitialData(): void {

    this.loading.set(true);

    this.errorMessage.set(null);


    setTimeout(() => {

      // ===================================================
      // Attendance
      // ===================================================

      this.attendance.set({

        totalTrainees: 128,

        presentCount: 115,

        absentCount: 13,

        latenessCount: 4,

        earlyLeaveCount: 6,

        attendanceRate: 88,

        overallAttendanceRate: 88,

        averageAttendanceRate: 88,

        chart: [

          {
            label: 'الأسبوع 27',
            value: 95.1
          },

          {
            label: 'الأسبوع 28',
            value: 93.4
          },

          {
            label: 'الأسبوع 29',
            value: 96.8
          },

          {
            label: 'الأسبوع 30',
            value: 92.7
          },

          {
            label: 'الأسبوع 31',
            value: 94.5
          },

          {
            label: 'الأسبوع 32',
            value: 95.6
          }

        ],

        rows: [

          {
            traineeId: 101,

            traineeName:
              'أحمد بن سعيد',

            presentDays: 18,

            absentDays: 2,

            lateDays: 1,

            excusedDays: 0,

            attendanceRate: 90
          },

          {
            traineeId: 102,

            traineeName:
              'سارة بنت خالد',

            presentDays: 20,

            absentDays: 0,

            lateDays: 0,

            excusedDays: 0,

            attendanceRate: 100
          },

          {
            traineeId: 103,

            traineeName:
              'محمد بن علي',

            presentDays: 12,

            absentDays: 5,

            lateDays: 3,

            excusedDays: 1,

            attendanceRate: 60
          },

          {
            traineeId: 104,

            traineeName:
              'نورة أحمد',

            presentDays: 19,

            absentDays: 1,

            lateDays: 1,

            excusedDays: 0,

            attendanceRate: 95
          },

          {
            traineeId: 105,

            traineeName:
              'خالد عبدالله',

            presentDays: 17,

            absentDays: 3,

            lateDays: 2,

            excusedDays: 1,

            attendanceRate: 85
          }

        ]

      });


      // ===================================================
      // Achievement
      // ===================================================

      this.achievement.set({

        total: 60,

        completed: 54,

        rate: 90,

        topPerformers: [

          {
            id: 1,

            fullName:
              'سارة بنت خالد',

            name:
              'سارة بنت خالد',

            progress: 100,

            attendanceRate: 100
          },

          {
            id: 2,

            fullName:
              'أحمد بن سعيد',

            name:
              'أحمد بن سعيد',

            progress: 90,

            attendanceRate: 90
          }

        ],

        atRisk: [

          {
            id: 3,

            fullName:
              'محمد بن علي',

            name:
              'محمد بن علي',

            progress: 60,

            courseName:
              'تطوير الويب Web API',

            attendanceRate: 60
          }

        ],

        enrollments: [

          {
            id: 1,

            traineeName:
              'سارة بنت خالد',

            batchName:
              'الدفعة الأولى',

            enrollmentDate:
              '2026-01-10',

            completionStatus:
              'Completed'
          },

          {
            id: 2,

            traineeName:
              'أحمد بن سعيد',

            batchName:
              'الدفعة الأولى',

            enrollmentDate:
              '2026-01-10',

            completionStatus:
              'InProgress'
          },

          {
            id: 3,

            traineeName:
              'محمد بن علي',

            batchName:
              'الدفعة الثانية',

            enrollmentDate:
              '2026-02-01',

            completionStatus:
              'Dropped'
          }

        ]

      });


      // ===================================================
      // Capacity
      // ===================================================

      this.capacity.set({

        total: 150,

        used: 128,

        remaining: 22,

        programs: [

          {
            programName:
              'تطوير الويب Web API',

            allocatedQuota: 50,

            usedQuota: 45,

            remainingQuota: 5,

            utilizationPercentage: 90
          },

          {
            programName:
              'الأمن السيبراني',

            allocatedQuota: 40,

            usedQuota: 38,

            remainingQuota: 2,

            utilizationPercentage: 95
          },

          {
            programName:
              'تحليل البيانات',

            allocatedQuota: 60,

            usedQuota: 45,

            remainingQuota: 15,

            utilizationPercentage: 75
          },

          {
            programName:
              'التصميم الجرافيكي',

            allocatedQuota: 30,

            usedQuota: 12,

            remainingQuota: 18,

            utilizationPercentage: 40
          }

        ]

      });


      this.loading.set(false);

    }, 350);

  }


  // =======================================================
  // Refresh
  // =======================================================

  refreshReports(): void {

    this.loadInitialData();

  }


  // =======================================================
  // Tab
  // =======================================================

  selectTab(tab: TabKey): void {

    this.tab.set(tab);

  }


  // =======================================================
  // Percentage
  // =======================================================

  clampPercentage(
    value: number
  ): number {

    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(100, value)
    );

  }


  // =======================================================
  // Bar Height
  //
  // نستخدمها مع المخطط الرأسي
  // =======================================================

  getBarHeight(
    value: number
  ): string {

    return `${this.clampPercentage(value)}%`;

  }


  // =======================================================
  // Bar Color
  // =======================================================

  getBarColorClass(
    value: number
  ): string {

    if (value >= 90) {
      return 'green';
    }

    if (value >= 85) {
      return 'blue';
    }

    if (value >= 80) {
      return 'cyan';
    }

    return 'orange';

  }


  // =======================================================
  // Achievement Label
  // =======================================================

  achievementLabel(
    value: number
  ): string {

    if (value >= 90) {

      return 'ممتاز';

    }

    if (value >= 80) {

      return 'جيد جداً';

    }

    if (value >= 70) {

      return 'جيد';

    }

    return 'يحتاج متابعة';

  }


  // =======================================================
  // Attendance Label
  // =======================================================

  attendanceLabel(
    rate: number
  ): string {

    if (rate >= 90) {
      return 'ممتاز';
    }

    if (rate >= 75) {
      return 'جيد';
    }

    return 'يحتاج متابعة';

  }


  // =======================================================
  // Initials
  // =======================================================

  getInitials(
    name?: string
  ): string {

    if (!name) {
      return '?';
    }

    const parts =
      name
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (parts.length === 1) {

      return parts[0].charAt(0);

    }

    return (
      parts[0].charAt(0) +
      parts[1].charAt(0)
    );

  }


  // =======================================================
  // Donut
  // =======================================================

  ringDashoffset(): number {

    const percentage =
      this.capacityPercentage();

    return (
      this.ringCircumference -
      (percentage / 100) *
      this.ringCircumference
    );

  }


  // =======================================================
  // Enrollment
  // =======================================================

  completionLabel(
    status: string
  ): string {

    switch (status) {

      case 'Completed':
        return 'مكتمل';

      case 'InProgress':
        return 'قيد التدريب';

      case 'Dropped':
        return 'منسحب';

      case 'Failed':
        return 'متعثر';

      default:
        return status;

    }

  }


  getStatusClass(
    status: string
  ): string {

    switch (status) {

      case 'Completed':
        return 'pill-cyan';

      case 'InProgress':
        return 'pill-gold';

      case 'Dropped':

      case 'Failed':
        return 'pill-red';

      default:
        return 'pill-gold';

    }

  }


  // =======================================================
  // Export PDF
  // =======================================================

  exportPdf(): void {

    this.errorMessage.set(null);


    const element =
      this.elementRef.nativeElement
        .querySelector('.reports-page');


    if (!element) {

      this.errorMessage.set(
        'تعذر العثور على محتوى التقرير للطباعة'
      );

      return;

    }


    const currentTabName =
      this.tab() === 'attendance'
        ? 'الحضور'
        : this.tab() === 'achievement'
          ? 'الإنجاز'
          : 'الطاقة';


    const options = {

      margin: 8,

      filename:
        `تقرير_${currentTabName}_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`,

      image: {

        type: 'jpeg',

        quality: 0.98

      },

      html2canvas: {

        scale: 2,

        useCORS: true,

        backgroundColor:
          '#f4f7fb'

      },

      jsPDF: {

        unit: 'mm',

        format: 'a4',

        orientation: 'landscape'

      }

    };


    const pdfRunner =
      (html2pdf as any).default ||
      html2pdf;


    pdfRunner()
      .set(options)
      .from(element)
      .save();

  }


  // =======================================================
  // Export Excel
  // =======================================================

  exportExcel(): void {

    this.errorMessage.set(null);


    const workbook =
      XLSX.utils.book_new();


    // =====================================================
    // Attendance
    // =====================================================

    if (
      this.tab() === 'attendance'
    ) {

      const rows =
        this.attendance()?.rows ?? [];


      const data =
        rows.map(row => ({

          'المتدرب':
            row.traineeName ?? '',

          'أيام الحضور':
            row.presentDays,

          'الغياب':
            row.absentDays,

          'التأخير':
            row.lateDays,

          'المعذور':
            row.excusedDays,

          'معدل الحضور':
            `${row.attendanceRate}%`

        }));


      if (!data.length) {

        data.push({

          'المتدرب':
            'لا توجد بيانات',

          'أيام الحضور':
            0,

          'الغياب':
            0,

          'التأخير':
            0,

          'المعذور':
            0,

          'معدل الحضور':
            '0%'

        });

      }


      const worksheet =
        XLSX.utils.json_to_sheet(data);


      (worksheet as any)['!views'] =
        [
          {
            RTL: true
          }
        ];


      XLSX.utils.book_append_sheet(

        workbook,

        worksheet,

        'تقرير الحضور'

      );

    }


    // =====================================================
    // Achievement
    // =====================================================

    else if (
      this.tab() === 'achievement'
    ) {

      const data =
        this.programProgressList
          .map(item => ({

            'البرنامج':
              item.programName,

            'نسبة الإنجاز':
              `${item.progress}%`

          }));


      const worksheet =
        XLSX.utils.json_to_sheet(data);


      (worksheet as any)['!views'] =
        [
          {
            RTL: true
          }
        ];


      XLSX.utils.book_append_sheet(

        workbook,

        worksheet,

        'إنجاز البرامج'

      );


      const performers =
        this.topPerformers()
          .map(item => ({

            'المتدرب':
              item.fullName ??
              item.name ??
              '',

            'نسبة الإنجاز':
              `${item.progress ?? 0}%`,

            'نسبة الحضور':
              `${item.attendanceRate ?? 0}%`

          }));


      if (performers.length) {

        const performerSheet =
          XLSX.utils.json_to_sheet(
            performers
          );


        (performerSheet as any)['!views'] =
          [
            {
              RTL: true
            }
          ];


        XLSX.utils.book_append_sheet(

          workbook,

          performerSheet,

          'المتميزون'

        );

      }

    }


    // =====================================================
    // Capacity
    // =====================================================

    else {

      const programs =
        this.capacity()?.programs ?? [];


      const data =
        programs.map(program => ({

          'البرنامج':
            program.programName,

          'الحصة':
            program.allocatedQuota,

          'المستخدم':
            program.usedQuota,

          'المتبقي':
            program.remainingQuota,

          'نسبة الاستخدام':
            `${program.utilizationPercentage}%`

        }));


      const worksheet =
        XLSX.utils.json_to_sheet(data);


      (worksheet as any)['!views'] =
        [
          {
            RTL: true
          }
        ];


      XLSX.utils.book_append_sheet(

        workbook,

        worksheet,

        'الطاقة الاستيعابية'

      );

    }


    XLSX.writeFile(

      workbook,

      `تقرير_الإحصائيات_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`

    );

  }

}