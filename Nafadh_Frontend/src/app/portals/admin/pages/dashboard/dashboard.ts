import { Component, OnInit, AfterViewInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminApi } from '../../services/admin-api';
import { AuditLogDto, DashboardChartsDto } from '../../../../core/models/dtos';
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
  charts = signal<DashboardChartsDto | null>(null);
  traineeCount = signal(3891);
  companyCount = signal(94);
  batchCount = signal(32);
  selectedBatch = signal('12');

  private barChartInstance: Chart | null = null;
  private donutChartInstance: Chart | null = null;

  constructor(
    private api: AdminApi,
    private router: Router
  ) {}

  ngOnInit() {
    this.api.getRecentAudit().subscribe((data) => {
      const sorted = (data || []).sort((a: any, b: any) => {
        const timeA = new Date(a.timestamp ?? a.createdAt ?? 0).getTime();
        const timeB = new Date(b.timestamp ?? b.createdAt ?? 0).getTime();
        return timeB - timeA;
      });
      this.recentActivity.set(sorted.slice(0, 10));
    });

    this.api.getDashboardCharts().subscribe((c) => {
      this.charts.set(c);
      this.updateBarChartData(c);
    });

    this.api.getTrainees({ pageSize: 1 }).subscribe((r) => this.traineeCount.set(r.totalCount ?? 3891));
    this.api.getCompanies().subscribe((c) => this.companyCount.set(c.length || 94));
    this.api.getBatches().subscribe((b) => this.batchCount.set(b.length || 32));
  }

  ngAfterViewInit() {
    this.initBarChart();
    this.initDonutChart();
  }

  ngOnDestroy() {
    if (this.barChartInstance) this.barChartInstance.destroy();
    if (this.donutChartInstance) this.donutChartInstance.destroy();
  }

  onBatchChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedBatch.set(val);
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
        labels: ['أمن معلومات', 'علوم حاسب', 'نظم معلومات', 'هندسة برمجيات', 'هندسة شبكات'],
        datasets: [{
          data: [30, 20, 25, 15, 10],
          backgroundColor: ['#ef4444', '#3b82f6', '#eab308', '#10b981', '#1e293b']
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
              label: (context: TooltipItem<'doughnut'>) => `${context.label || ''} : ${context.raw || 0} متدرب`,
              labelTextColor: (context: TooltipItem<'doughnut'>) => {
                const colors = context.dataset.backgroundColor as string[];
                return colors[context.dataIndex];
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

  private updateDonutChartData(batchId: string) {
    if (!this.donutChartInstance) return;
    const dummyData: Record<string, number[]> = {
      '12': [30, 20, 25, 15, 10],
      '11': [15, 25, 30, 20, 10],
      '10': [20, 20, 20, 20, 20]
    };
    this.donutChartInstance.data.datasets[0].data = dummyData[batchId] || [20, 20, 20, 20, 20];
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