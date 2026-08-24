import { Component, OnInit, AfterViewInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminApi } from '../../services/admin-api';
import { AuditLogDto, DashboardChartsDto, BatchDto } from '../../../../core/models/dtos';
import Chart, { TooltipItem } from 'chart.js/auto';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class AdminDashboard implements OnInit, AfterViewInit, OnDestroy {
  recentActivity = signal<AuditLogDto[]>([]);
  allActivity = signal<AuditLogDto[]>([]);
  showAllActivity = signal<boolean>(false);

  charts = signal<DashboardChartsDto | null>(null);
  traineeCount = signal(3891);
  companyCount = signal(94);
  batchCount = signal(32);
  
  // إدارة السنوات والدفعات ديناميكياً
  allBatches = signal<BatchDto[]>([]);
  availableYears = signal<string[]>([]);
  selectedYear = signal<string>(new Date().getFullYear().toString());

  private barChartInstance: Chart | null = null;
  private donutChartInstance: Chart | null = null;

  constructor(
    private api: AdminApi,
    private router: Router
  ) {}

  ngOnInit() {
    this.api.getRecentAudit().subscribe((data) => {
      // ترتيب سجل الأنشطة تنازلياً من الأحدث إلى الأقدم
      const sorted = (data || []).sort((a: any, b: any) => {
        const timeA = new Date(a.timestamp ?? a.createdAt ?? 0).getTime();
        const timeB = new Date(b.timestamp ?? b.createdAt ?? 0).getTime();
        return timeB - timeA;
      });
      
      this.allActivity.set(sorted);
      this.updateDisplayedActivity();
    });

    this.api.getDashboardCharts().subscribe((c) => {
      this.charts.set(c);
      this.updateBarChartData(c);
    });

    this.api.getTrainees({ pageSize: 1 }).subscribe((r) => this.traineeCount.set(r.totalCount ?? 3891));
    this.api.getCompanies().subscribe((c) => this.companyCount.set(c.length || 94));
    
    // جلب الدفعات وحساب السنوات والمسارات ديناميكياً
    this.api.getBatches().subscribe((b) => {
      const list = b || [];
      this.batchCount.set(list.length || 32);
      this.allBatches.set(list);

      // استخراج السنوات الفريدة من startDate وتجميعها
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

  // التبديل بين التوب 10 وعرض كافة السجلات
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

  goToTraineesList() {
    this.router.navigate(['/admin/trainees']);
  }

  goToCompaniesList() {
    this.router.navigate(['/admin/companies']);
  }

  goToProgramsList() {
    this.router.navigate(['/admin/programs']);
  }

  private initBarChart() {
    const ctx = document.getElementById('batchesBarChart') as HTMLCanvasElement;
    if (!ctx) return;

    const hoverBlockPlugin = {
      id: 'hoverBlockPlugin',
      beforeDraw: (chart: any) => {
        if (chart.tooltip?._active && chart.tooltip._active.length) {
          const activePoint = chart.tooltip._active[0];
          const ctx = chart.ctx;
          const x = activePoint.element.x;
          const topY = chart.scales.y.top;
          const bottomY = chart.scales.y.bottom;
          const width = activePoint.element.width * 2.2;

          ctx.save();
          ctx.fillStyle = '#cccccc';
          ctx.fillRect(x - width / 2, topY, width, bottomY - topY);
          ctx.restore();
        }
      }
    };

    this.barChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['2021', '2022', '2023', '2024', '2025'],
        datasets: [{
          data: [4, 7, 9, 11, 6],
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
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: { 
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: '#ffffff',
            titleColor: '#1e293b',
            titleFont: { size: 13, weight: 'normal' },
            titleAlign: 'center',
            bodyColor: '#0A1172',
            bodyFont: { size: 13, weight: 'normal' },
            bodyAlign: 'center',
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
          y: { 
            beginAtZero: true, 
            grid: { color: '#f1f5f9' },
            ticks: { color: '#64748b' }
          },
          x: { 
            grid: { display: false },
            ticks: { color: '#64748b' }
          }
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