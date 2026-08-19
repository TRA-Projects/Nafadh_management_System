import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  AttendanceReportDto,
  EnrollmentDto,
  TraineeListItemDto,
  CompanyCapacityDto,
  ChartPointDto,
} from '../../../../core/models/dtos';

type ReportTab = 'attendance' | 'achievement' | 'capacity';

@Component({
  selector: 'app-company-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class CompanyReports implements OnInit {
  companyId = this.auth.companyId ?? 0;

  tab = signal<ReportTab>('attendance');

  attendance = signal<AttendanceReportDto | null>(null);
  attendanceChart = signal<ChartPointDto[]>([]);

  enrollments = signal<EnrollmentDto[]>([]);
  topPerformers = signal<TraineeListItemDto[]>([]);
  atRisk = signal<TraineeListItemDto[]>([]);

  capacity = signal<CompanyCapacityDto | null>(null);

  loading = signal(false);
  errorMessage = signal('');

  constructor(private api: CompanyApi, private auth: AuthService) {}

  ngOnInit(): void {
    this.loadReports();
  }

  selectTab(tab: ReportTab): void {
    this.tab.set(tab);
  }

  private loadReports(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    let finished = 0;
    const complete = () => {
      finished += 1;
      if (finished >= 6) {
        this.loading.set(false);
      }
    };

    this.api.getCompanyAttendanceReport(this.companyId).subscribe({
      next: (data) => {
        this.attendance.set(data);
        complete();
      },
      error: () => {
        this.errorMessage.set('تعذر تحميل تقرير الحضور.');
        complete();
      },
    });

    this.api.getAttendanceChart(this.companyId).subscribe({
      next: (data) => {
        this.attendanceChart.set(data?.weeks ?? []);
        complete();
      },
      error: () => {
        this.attendanceChart.set([]);
        complete();
      },
    });

    this.api.getEnrollmentsByCompany(this.companyId).subscribe({
      next: (data) => {
        this.enrollments.set(data ?? []);
        complete();
      },
      error: () => {
        this.enrollments.set([]);
        complete();
      },
    });

    this.api.getTopPerformers(this.companyId).subscribe({
      next: (data) => {
        this.topPerformers.set(data ?? []);
        complete();
      },
      error: () => {
        this.topPerformers.set([]);
        complete();
      },
    });

    this.api.getAtRiskTrainees(this.companyId).subscribe({
      next: (data) => {
        this.atRisk.set(data ?? []);
        complete();
      },
      error: () => {
        this.atRisk.set([]);
        complete();
      },
    });

   this.api.getCapacity(this.companyId).subscribe({
  next: (data: any) => {
    this.capacity.set(data ? {
      ...data,
      programs: data.programs ?? []
    } : null);
    complete();
  },
  error: () => {
    this.capacity.set(null);
    complete();
  }
});
  }

  totalAbsentDays(): number {
    return this.attendance()
      ?.rows.reduce((sum, row) => sum + row.absentDays, 0) ?? 0;
  }

  totalLateDays(): number {
    return this.attendance()
      ?.rows.reduce((sum, row) => sum + row.lateDays, 0) ?? 0;
  }

  totalExcusedDays(): number {
    return this.attendance()
      ?.rows.reduce((sum, row) => sum + row.excusedDays, 0) ?? 0;
  }

  achievementTotal(): number {
    return this.enrollments().length;
  }

  achievementCompleted(): number {
    return this.enrollments().filter(
      (item) => item.completionStatus === 'Completed',
    ).length;
  }

  achievementRate(): number {
    const total = this.achievementTotal();

    if (!total) {
      return 0;
    }

    return Math.round((this.achievementCompleted() / total) * 100);
  }

  capacityPercentage(): number {
    const capacity = this.capacity();

    if (!capacity?.total) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(0, Math.round(((capacity.used ?? 0) / capacity.total) * 100)),
    );
  }

  clampPercentage(value: number): number {
    return Math.min(100, Math.max(0, value));
  }

  completionLabel(status: string): string {
    switch (status) {
      case 'Completed':
        return 'مكتمل';
      case 'InProgress':
        return 'قيد التدريب';
      case 'Dropped':
        return 'منسحب';
      case 'Failed':
        return 'لم يجتز';
      default:
        return status || 'غير محدد';
    }
  }

  exportPdf(): void {
    window.print();
  }

  exportExcel(): void {
    const rows = this.exportRows();

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `company-report-${this.tab()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  private exportRows(): unknown[][] {
    if (this.tab() === 'attendance') {
      const report = this.attendance();

      return [
        [
          'المتدرب',
          'أيام الحضور',
          'الغياب',
          'التأخر',
          'المعذور',
          'معدل الحضور',
        ],
        ...(report?.rows ?? []).map((row) => [
          row.traineeName || `متدرب #${row.traineeId}`,
          row.presentDays,
          row.absentDays,
          row.lateDays,
          row.excusedDays,
          `${row.attendanceRate}%`,
        ]),
      ];
    }

    if (this.tab() === 'achievement') {
      return [
        ['المتدرب', 'الدفعة', 'تاريخ التسجيل', 'حالة الإنجاز'],
        ...this.enrollments().map((item) => [
          item.traineeName,
          item.batchName,
          item.enrollmentDate,
          this.completionLabel(item.completionStatus),
        ]),
      ];
    }

    const capacity = this.capacity();

    return [
      ['البند', 'القيمة'],
      ['الحصة الكلية', capacity?.total ?? 0],
      ['المستخدم', capacity?.used ?? 0],
      ['المتبقي', capacity?.remaining ?? 0],
      ['نسبة الاستغلال', `${this.capacityPercentage()}%`],
    ];
  }
}