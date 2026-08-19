import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';

type TabKey = 'attendance' | 'achievement' | 'capacity';

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
  attendanceRate?: number; // 👈 تم إضافتها لتطابق HTML
  overallAttendanceRate?: number;
  averageAttendanceRate?: number;
  chart?: AttendanceChartItem[];
  rows?: TraineeAttendanceRow[];
};

export type AchievementItem = {
  id?: number;
  traineeId?: number;
  fullName?: string;
  name?: string;        // 👈 تم إضافتها
  progress?: number;    // 👈 تم إضافتها
  courseName?: string;  // 👈 تم إضافتها
  attendanceRate?: number;
  gpa?: number;
};

export type EnrollmentItem = {
  id?: number;
  enrollmentId?: number;
  traineeName: string;
  batchName: string;
  enrollmentDate: string;
  completionStatus: 'Completed' | 'InProgress' | 'Dropped' | 'Failed' | string;
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

@Component({
  selector: 'app-company-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class ReportsComponent {
  readonly tab = signal<TabKey>('attendance');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly attendance = signal<AttendanceReportDto | null>(null);
  readonly achievement = signal<AchievementReportDto | null>(null);
  readonly capacity = signal<CapacityReportDto | null>(null);

  // حساب محيط الدائرة للـ SVG (بناءً على r=78 المحددة في HTML)
  readonly ringCircumference = 2 * Math.PI * 78;

  // Computed Properties - Attendance
  readonly attendanceChart = computed(() => this.attendance()?.chart ?? []);
  readonly totalAbsentDays = computed(() => {
    const rows = this.attendance()?.rows ?? [];
    return rows.reduce((acc, row) => acc + (row.absentDays || 0), 0);
  });
  readonly totalLateDays = computed(() => {
    const rows = this.attendance()?.rows ?? [];
    return rows.reduce((acc, row) => acc + (row.lateDays || 0), 0);
  });
  readonly totalExcusedDays = computed(() => {
    const rows = this.attendance()?.rows ?? [];
    return rows.reduce((acc, row) => acc + (row.excusedDays || 0), 0);
  });

  // Computed Properties - Achievement
  readonly achievementTotal = computed(() => this.achievement()?.total ?? 0);
  readonly achievementCompleted = computed(() => this.achievement()?.completed ?? 0);
  readonly achievementRate = computed(() => this.achievement()?.rate ?? 0);
  readonly topPerformers = computed(() => this.achievement()?.topPerformers ?? []);
  readonly atRisk = computed(() => this.achievement()?.atRisk ?? []);
  readonly enrollments = computed(() => this.achievement()?.enrollments ?? []);

  // Computed Properties - Capacity
  readonly capacityPercentage = computed(() => {
    const cap = this.capacity();
    if (!cap || !cap.total) return 0;
    return Math.min(100, Math.round(((cap.used ?? 0) / cap.total) * 100));
  });

  // ميثود إزاحة دائرة الـ SVG حسب نسبة الاستهلاك
  ringDashoffset(): number {
    const percentage = this.capacityPercentage();
    return this.ringCircumference - (percentage / 100) * this.ringCircumference;
  }

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    this.loading.set(true);

    setTimeout(() => {
      this.attendance.set({
        totalTrainees: 128,
        presentCount: 115,
        absentCount: 13,
        attendanceRate: 88,
        overallAttendanceRate: 88,
        chart: [
          { label: 'الأسبوع 1', value: 92 },
          { label: 'الأسبوع 2', value: 95 },
          { label: 'الأسبوع 3', value: 89 },
          { label: 'الأسبوع 4', value: 84 },
        ],
        rows: [
          { traineeId: 101, traineeName: 'أحمد بن سعيد', presentDays: 18, absentDays: 2, lateDays: 1, excusedDays: 0, attendanceRate: 90 },
          { traineeId: 102, traineeName: 'سارة بنت خالد', presentDays: 20, absentDays: 0, lateDays: 0, excusedDays: 0, attendanceRate: 100 },
          { traineeId: 103, traineeName: 'محمد بن علي', presentDays: 12, absentDays: 5, lateDays: 3, excusedDays: 1, attendanceRate: 60 },
        ],
      });

      this.achievement.set({
        total: 60,
        completed: 54,
        rate: 90,
        topPerformers: [
          { id: 1, fullName: 'سارة بنت خالد', name: 'سارة بنت خالد', progress: 100, attendanceRate: 100 },
          { id: 2, fullName: 'أحمد بن سعيد', name: 'أحمد بن سعيد', progress: 90, attendanceRate: 90 },
        ],
        atRisk: [
          { id: 3, fullName: 'محمد بن علي', name: 'محمد بن علي', progress: 60, courseName: 'تطوير الويب Web API', attendanceRate: 60 },
        ],
        enrollments: [
          { id: 1, traineeName: 'سارة بنت خالد', batchName: 'الدفعة الأولى', enrollmentDate: '2026-01-10', completionStatus: 'Completed' },
          { id: 2, traineeName: 'أحمد بن سعيد', batchName: 'الدفعة الأولى', enrollmentDate: '2026-01-10', completionStatus: 'InProgress' },
          { id: 3, traineeName: 'محمد بن علي', batchName: 'الدفعة الثانية', enrollmentDate: '2026-02-01', completionStatus: 'Dropped' },
        ],
      });

      this.capacity.set({
        total: 150,
        used: 128,
        remaining: 22,
        programs: [
          { programName: 'تطوير الويب Web API', allocatedQuota: 50, usedQuota: 45, remainingQuota: 5, utilizationPercentage: 90 },
          { programName: 'الأمن السيبراني', allocatedQuota: 40, usedQuota: 38, remainingQuota: 2, utilizationPercentage: 95 },
          { programName: 'تحليل البيانات', allocatedQuota: 60, usedQuota: 45, remainingQuota: 15, utilizationPercentage: 75 },
        ],
      });

      this.loading.set(false);
      this.errorMessage.set(null);
    }, 300);
  }

  selectTab(tab: TabKey): void {
    this.tab.set(tab);
  }

  clampPercentage(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  completionLabel(status: string): string {
    switch (status) {
      case 'Completed': return 'مكتمل';
      case 'InProgress': return 'قيد التدريب';
      case 'Dropped': return 'منسحب';
      case 'Failed': return 'متعثر';
      default: return status;
    }
  }

  exportPdf(): void {
    this.errorMessage.set(null);
  }

  exportExcel(): void {
    this.errorMessage.set(null);
  }
}