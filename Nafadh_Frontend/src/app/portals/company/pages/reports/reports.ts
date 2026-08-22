import { Component, OnInit, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import * as XLSX from 'xlsx';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { AttendanceReportDto, EnrollmentDto } from '../../../../core/models/dtos';

interface AttendanceRow {
  traineeId: number;
  traineeName: string;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  attendanceRate: number;
}

interface AchievementReportDto { total: number; completed: number; rate: number; }
interface CapacityProgram {
  programName: string;
  allocatedQuota: number;
  usedQuota: number;
  remainingQuota: number;
  utilizationPercentage: number;
}
interface CapacityReportDto {
  total: number;
  used: number;
  remaining: number;
  programs: CapacityProgram[];
}
interface ProgramProgress { programName: string; shortName: string; progress: number; colorClass: string; }

@Component({
  selector: 'app-company-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss'
})
export class ReportsComponent implements OnInit {
  private readonly elementRef = inject(ElementRef);
  readonly tab = signal<'attendance' | 'achievement' | 'capacity'>('achievement');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly attendance = signal<AttendanceReportDto | null>(null);
  readonly achievement = signal<AchievementReportDto | null>(null);
  readonly capacity = signal<CapacityReportDto | null>(null);
  readonly programProgressList: ProgramProgress[] = [];

  constructor(private api: CompanyApi, private auth: AuthService) {}

  ngOnInit(): void { this.loadInitialData(); }

  private loadInitialData(): void {
    const companyId = this.auth.companyId ?? 0;
    if (!companyId) {
      this.errorMessage.set('لا يمكن تحديد الشركة الحالية من جلسة الدخول.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      attendance: this.api.getCompanyAttendanceReport(companyId).pipe(catchError(() => of(null))),
      attendanceChart: this.api.getAttendanceChart(companyId).pipe(catchError(() => of({ weeks: [] }))),
      capacity: this.api.getCapacity(companyId).pipe(catchError(() => of({ total: 0, used: 0, remaining: 0 } as any))),
      distribution: this.api.getProgramDistribution(companyId).pipe(catchError(() => of([]))),
      enrollments: this.api.getEnrollmentsByCompany(companyId).pipe(catchError(() => of([] as EnrollmentDto[]))),
    }).subscribe({
      next: ({ attendance, attendanceChart, capacity, distribution, enrollments }) => {
        this.attendance.set(attendance ? { ...(attendance as AttendanceReportDto), chart: attendanceChart?.weeks ?? [] } : null);

        const rows = (enrollments ?? []).map((e) => this.api.getProgressSummary(e.enrollmentId).pipe(
          catchError(() => of({ enrollmentId: e.enrollmentId, totalModules: 0, completedModules: 0, progressPercentage: 0 })) ,
          map(progress => ({ e, progress }))
        ));

        if (!rows.length) {
          this.setAchievementAndCapacity(enrollments ?? [], distribution as any[], capacity as any);
          this.loading.set(false);
          return;
        }

        forkJoin(rows).subscribe({
          next: (items) => {
            const group = new Map<string, { total: number; sum: number }>();
            items.forEach(({ e, progress }) => {
              const key = e.programTitle || 'غير محدد';
              const current = group.get(key) ?? { total: 0, sum: 0 };
              current.total += 1;
              current.sum += Number(progress.progressPercentage ?? 0);
              group.set(key, current);
            });

            this.programProgressList.splice(0, this.programProgressList.length,
              ...Array.from(group.entries()).map(([programName, value], i) => ({
                programName,
                shortName: programName.length > 18 ? `${programName.slice(0, 18)}…` : programName,
                progress: Math.round(value.sum / Math.max(1, value.total)),
                colorClass: ['blue', 'cyan', 'purple', 'orange', 'red', 'green'][i % 6]
              }))
            );

            const completed = items.filter(({ progress }) => Number(progress.progressPercentage ?? 0) >= 100).length;
            this.achievement.set({ total: enrollments.length, completed, rate: enrollments.length ? Math.round(completed * 100 / enrollments.length) : 0 });
            this.setCapacity(enrollments, distribution as any[], capacity as any);
            this.loading.set(false);
          },
          error: () => {
            this.setAchievementAndCapacity(enrollments ?? [], distribution as any[], capacity as any);
            this.loading.set(false);
          }
        });
      },
      error: () => {
        this.errorMessage.set('تعذر تحميل تقارير الشركة من قاعدة البيانات.');
        this.loading.set(false);
      }
    });
  }

  private setAchievementAndCapacity(enrollments: EnrollmentDto[], distribution: any[], capacity: any) {
    this.achievement.set({ total: enrollments.length, completed: enrollments.filter(e => /Completed/i.test(e.completionStatus)).length, rate: enrollments.length ? Math.round(enrollments.filter(e => /Completed/i.test(e.completionStatus)).length * 100 / enrollments.length) : 0 });
    this.setCapacity(enrollments, distribution, capacity);
    this.programProgressList.splice(0, this.programProgressList.length);
  }

  private setCapacity(enrollments: EnrollmentDto[], distribution: any[], capacity: any) {
    const total = Number(capacity?.total ?? 0);
    const used = Number(capacity?.used ?? enrollments.length);
    const remaining = Number(capacity?.remaining ?? Math.max(0, total - used));
    const sum = (distribution ?? []).reduce((n: number, x: any) => n + Number(x?.value ?? 0), 0);
    const programs = (distribution ?? []).map((x: any) => {
      const usedQuota = Number(x?.value ?? 0);
      const allocatedQuota = sum > 0 && total > 0 ? Math.max(usedQuota, Math.round(total * usedQuota / sum)) : usedQuota;
      return {
        programName: String(x?.label ?? 'غير محدد'),
        allocatedQuota,
        usedQuota,
        remainingQuota: Math.max(0, allocatedQuota - usedQuota),
        utilizationPercentage: allocatedQuota ? Math.round(usedQuota * 100 / allocatedQuota) : 0,
      };
    });
    this.capacity.set({ total, used, remaining, programs });
  }

  selectTab(tab: 'attendance' | 'achievement' | 'capacity'): void { this.tab.set(tab); }

  readonly attendanceChart = computed(() => this.attendance()?.chart ?? []);
  readonly totalAbsentDays = computed(() => this.attendance()?.rows?.reduce((t, r) => t + r.absentDays, 0) ?? 0);
  readonly totalLateDays = computed(() => this.attendance()?.rows?.reduce((t, r) => t + r.lateDays, 0) ?? 0);
  attendanceLabel(rate: number): string { return rate >= 90 ? 'ممتاز' : rate >= 75 ? 'جيد' : 'يحتاج متابعة'; }
  getInitials(name?: string): string { const p = (name ?? '').trim().split(/\s+/).filter(Boolean); return p.length ? p.slice(0, 2).map(x => x[0]).join('') : '?'; }
  clampPercentage(value: number | undefined): number { return Math.max(0, Math.min(100, Number(value ?? 0))); }
  readonly achievementRate = computed(() => this.achievement()?.rate ?? 0);
  readonly bestProgram = computed(() => this.programProgressList.length ? [...this.programProgressList].sort((a, b) => b.progress - a.progress)[0] : null);
  readonly weakestProgram = computed(() => this.programProgressList.length ? [...this.programProgressList].sort((a, b) => a.progress - b.progress)[0] : null);
  readonly capacityPercentage = computed(() => { const d = this.capacity(); return d?.total ? this.clampPercentage((d.used / d.total) * 100) : 0; });
  readonly ringCircumference = 2 * Math.PI * 78;
  readonly ringDashoffset = computed(() => this.ringCircumference * (1 - this.capacityPercentage() / 100));
  refreshReports(): void { this.loadInitialData(); }

  exportPdf(): void {
    const element = this.elementRef.nativeElement.querySelector('.reports-page');
    if (!element) return;
    (html2pdf as any)().set({ margin: 8, filename: `report_${new Date().toISOString().slice(0, 10)}.pdf`, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } }).from(element).save();
  }

  exportExcel(): void {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(this.attendance()?.rows ?? []), 'الحضور');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(this.capacity()?.programs ?? []), 'الطاقة الاستيعابية');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(this.programProgressList), 'الإنجاز');
    XLSX.writeFile(workbook, `تقرير_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
}
