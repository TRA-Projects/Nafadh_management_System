import { Component, OnInit, AfterViewInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AdminApi } from '../../services/admin-api';
import { AuditLogDto, DashboardChartsDto, BatchDto } from '../../../../core/models/dtos';
import { environment } from '../../../../../environments/environment';
import Chart, { TooltipItem } from 'chart.js/auto';

export interface AdminDashboardSummary {
  totalTrainees: number;
  activeTrainees: number;
  totalCompanies: number;
  totalBatches: number;
  totalCertificates: number;
  overallAttendanceRate: number;
  topPerformersCount: number;
  topPerformersAvgScore: number;
  atRiskCount: number;
  capacity: {
    total: number;
    used: number;
    remaining: number;
  };
  attendanceWeeks: { label: string; value: number }[];
  companyDistribution: { label: string; value: number }[];
  programDistribution: { label: string; value: number }[];
  topPerformers: {
    traineeId: number;
    enrollmentId: number;
    fullName?: string;
    major?: string;
    companyName?: string;
    gitHubUrl?: string;
    linkedInUrl?: string;
    performancePercent: number;
    attendancePercent: number;
  }[];
  atRiskTrainees: {
    traineeId: number;
    enrollmentId: number;
    fullName?: string;
    major?: string;
    companyName?: string;
    gitHubUrl?: string;
    linkedInUrl?: string;
    performancePercent: number;
    attendancePercent: number;
  }[];
  recentWarnings: {
    warningId: number;
    scope: string;
    traineeId?: number;
    companyId?: number;
    targetName?: string;
    gitHubUrl?: string;
    linkedInUrl?: string;
    type: string;
    level: string;
    status: string;
    issuedDate: string;
  }[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class AdminDashboard implements OnInit, AfterViewInit, OnDestroy {
  summary = signal<AdminDashboardSummary | null>(null);
  announcements = signal<any[]>([]);
  showAnnouncements = signal<boolean>(true);
  isLoading = signal<boolean>(false);

  recentActivity = signal<AuditLogDto[]>([]);
  allActivity = signal<AuditLogDto[]>([]);
  showAllActivity = signal<boolean>(false);

  charts = signal<DashboardChartsDto | null>(null);
  traineeCount = signal<number | null>(null);
  companyCount = signal<number | null>(null);
  batchCount = signal<number | null>(null);

  allBatches = signal<BatchDto[]>([]);
  availableYears = signal<string[]>([]);
  selectedYear = signal<string>(new Date().getFullYear().toString());

  // حساب النسبة المئوية للطاقة الاستيعابية
  capacityPercent = computed(() => {
    const cap = this.summary()?.capacity;
    if (!cap || !cap.total || cap.total <= 0) return 0;
    return Math.min(100, Math.round((cap.used / cap.total) * 100));
  });

  // أعلى قيمة في توزيع البرامج/الشركات لحساب عرض الشريط الأفقي
  maxDistributionValue = computed(() => {
    const list = this.summary()?.programDistribution || [];
    if (!list.length) return 1;
    return Math.max(...list.map(x => x.value), 1);
  });

  private barChartInstance: Chart | null = null;
  private donutChartInstance: Chart | null = null;
  private readonly baseUrl = (environment as any).apiUrl || 'http://localhost:5000/api';

  constructor(
    private api: AdminApi,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAllDashboardData();
  }

  loadAllDashboardData() {
    this.isLoading.set(true);

    // 1. جلب ملخص الداشبورد التفصيلي الجديد
    this.http.get<AdminDashboardSummary>(`${this.baseUrl}/AdminDashboard`).subscribe({
      next: (data) => {
        this.summary.set(data);
        if (data.totalTrainees) this.traineeCount.set(data.totalTrainees);
        if (data.totalCompanies) this.companyCount.set(data.totalCompanies);
        if (data.totalBatches) this.batchCount.set(data.totalBatches);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });

    // 2. جلب الإعلانات الرسمية للمنصة
    this.http.get<any[]>(`${this.baseUrl}/Announcement`).subscribe({
      next: (items) => {
        const sorted = (items || []).slice(0, 5);
        this.announcements.set(sorted);
      },
      error: () => {}
    });

    // 3. سجل الأنشطة (Audit Logs)
    this.api.getRecentAudit().subscribe((data) => {
      const sorted = (data || []).sort((a: any, b: any) => {
        const timeA = new Date(a.timestamp ?? a.createdAt ?? 0).getTime();
        const timeB = new Date(b.timestamp ?? b.createdAt ?? 0).getTime();
        return timeB - timeA;
      });
      this.allActivity.set(sorted);
      this.updateDisplayedActivity();
    });

    // 4. بيانات الشارتات
    this.api.getDashboardCharts().subscribe((c) => {
      this.charts.set(c);
      this.updateBarChartData(c);
    });

    this.api.getTrainees({ pageSize: 1 }).subscribe((r) => {
      if (this.traineeCount() === null) {
        this.traineeCount.set(r.totalCount ?? null);
      }
    });

    this.api.getCompanies().subscribe((c) => {
      if (this.companyCount() === null) {
        this.companyCount.set(c?.length ?? null);
      }
    });

    // 5. جلب الدفعات وحساب السنوات والمسارات ديناميكياً
    this.api.getBatches().subscribe((b) => {
      const list = b || [];
      this.batchCount.set(list.length);
      this.allBatches.set(list);

      const years = Array.from(
        new Set(
          list
            .map((batch) => batch.startDate ? new Date(batch.startDate).getFullYear().toString() : null)
            .filter((y): y is string => y !== null)
        )
      ).sort((a, b) => b.localeCompare(a));

      if (years.length > 0) {
        this.availableYears.set(years);
        this.selectedYear.set(years[0]);
        this.updateDonutChartData(years[0]);
      }
    });
  }

  ngAfterViewInit() {
    this.initBarChart();
    this.initDonutChart();
  }

  ngOnDestroy() {
    if (this.barChartInstance) this.barChartInstance.destroy();
    if (this.donutChartInstance) this.donutChartInstance.destroy();
  }

  refreshData() {
    this.loadAllDashboardData();
  }

  toggleAnnouncements() {
    this.showAnnouncements.update(v => !v);
  }

  toggleShowAllActivity() {
    this.showAllActivity.update(val => !val);
    this.updateDisplayedActivity();
  }

  private updateDisplayedActivity() {
    if (this.showAllActivity()) {
      this.recentActivity.set(this.allActivity());
    } else {
      this.recentActivity.set(this.allActivity().slice(0, 10));
    }
  }

  onYearChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedYear.set(val);
    this.updateDonutChartData(val);
  }

  // استخراج أول حرفين من اسم المتدرب للأفاتار مثل تصميم زميلاتك
  getInitials(name?: string): string {
    if (!name) return 'م';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]);
    }
    return name.slice(0, 2);
  }

  getAvatarColor(index: number): string {
    const colors = ['#0d9488', '#0284c7', '#4f46e5', '#0A1172', '#7c3aed'];
    return colors[index % colors.length];
  }

  getBarWidth(value: number): number {
    const max = this.maxDistributionValue();
    return Math.max(12, Math.min(100, Math.round((value / max) * 100)));
  }

  // التنقل السريع بين صفحات البوابة
  goToTraineesList() {
    this.router.navigate(['/admin/trainees']);
  }

  goToCompaniesList() {
    this.router.navigate(['/admin/companies']);
  }

  goToProgramsList() {
    this.router.navigate(['/admin/programs']);
  }

  goToCertificatesList() {
    this.router.navigate(['/admin/certificates']);
  }

  goToWarningsList() {
    this.router.navigate(['/admin/warnings']);
  }

  private initBarChart() {
    const ctx = document.getElementById('batchesBarChart') as HTMLCanvasElement;
    if (!ctx) return;

    const hoverBlockPlugin = {
      id: 'hoverBlockPlugin',
      beforeDraw: (chart: any) => {
        if (chart.tooltip?._active && chart.tooltip._active.length) {
          const activePoint = chart.tooltip._active[0];
          const c = chart.ctx;
          const x = activePoint.element.x;
          const topY = chart.scales.y.top;
          const bottomY = chart.scales.y.bottom;
          const width = activePoint.element.width * 2.2;

          c.save();
          c.fillStyle = '#f1f5f9';
          c.fillRect(x - width / 2, topY, width, bottomY - topY);
          c.restore();
        }
      }
    };

    this.barChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['2025', '2026', '2027'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: '#0A1172',
          hoverBackgroundColor: '#0A1172',
          borderRadius: 6,
          barThickness: 32
        }]
      },
      plugins: [hoverBlockPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: '#ffffff',
            titleColor: '#1e293b',
            bodyColor: '#0A1172',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            padding: { top: 10, bottom: 10, left: 16, right: 16 },
            cornerRadius: 10,
            displayColors: false,
            callbacks: {
              title: (tooltipItems: TooltipItem<'bar'>[]) => tooltipItems[0].label,
              label: (context: TooltipItem<'bar'>) => `عدد الدفعات : ${context.raw || 0}`
            }
          }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#64748b' } },
          x: { grid: { display: false }, ticks: { color: '#64748b' } }
        }
      }
    });
  }

  private initDonutChart() {
    const ctx = document.getElementById('tracksDonutChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.donutChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: ['#ef4444', '#3b82f6', '#eab308', '#10b981', '#1e293b', '#8b5cf6', '#ec4899']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16 } },
          tooltip: {
            enabled: true,
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            cornerRadius: 8,
            padding: { top: 8, bottom: 8, left: 12, right: 12 },
            displayColors: false,
            callbacks: {
              title: () => '',
              label: (context: TooltipItem<'doughnut'>) => `${context.label || ''} : ${context.raw || 0}`,
              labelTextColor: (context: TooltipItem<'doughnut'>) => {
                const colors = context.dataset.backgroundColor as string[];
                return colors[context.dataIndex % colors.length];
              }
            }
          }
        },
        cutout: '70%'
      }
    });
  }

  private updateBarChartData(data: DashboardChartsDto | null) {
    if (!this.barChartInstance || !data?.batchesByYear) return;
    this.barChartInstance.data.labels = data.batchesByYear.map(p => p.label);
    this.barChartInstance.data.datasets[0].data = data.batchesByYear.map(p => p.value);
    this.barChartInstance.update();
  }

  private updateDonutChartData(year: string) {
    if (!this.donutChartInstance) return;

    const yearBatches = this.allBatches().filter(b =>
      b.startDate && new Date(b.startDate).getFullYear().toString() === year
    );

    const trackCounts: Record<string, number> = {};
    yearBatches.forEach(b => {
      const track = b.trackName || 'غير محدد';
      trackCounts[track] = (trackCounts[track] || 0) + 1;
    });

    const labels = Object.keys(trackCounts);
    const dataValues = Object.values(trackCounts);

    if (labels.length > 0) {
      this.donutChartInstance.data.labels = labels;
      this.donutChartInstance.data.datasets[0].data = dataValues;
    } else {
      this.donutChartInstance.data.labels = ['لا توجد بيانات'];
      this.donutChartInstance.data.datasets[0].data = [0];
    }

    this.donutChartInstance.update();
  }

  getActivityClass(action?: string, entityName?: string): string {
    const act = (action || '').toLowerCase();
    const entity = (entityName || '').toLowerCase();

    if (act.includes('إنذار') || act.includes('انذار') || entity.includes('warning')) {
      return 'warning';
    }
    if (act.includes('حضور') || act.includes('غياب') || entity.includes('attendance')) {
      return 'attendance';
    }
    if (act.includes('شهادة') || entity.includes('certificate')) {
      return 'certificate';
    }
    if (act.includes('شركة') || entity.includes('company')) {
      return 'company';
    }
    return 'account';
  }
}