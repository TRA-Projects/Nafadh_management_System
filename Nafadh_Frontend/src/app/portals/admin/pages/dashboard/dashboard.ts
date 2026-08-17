import { Component, OnInit, AfterViewInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminApi } from '../../services/admin-api';
import { AuditLogDto, DashboardChartsDto } from '../../../../core/models/dtos';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class AdminDashboard implements OnInit, AfterViewInit {
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
    this.api.getRecentAudit().subscribe((data) => this.recentActivity.set((data || []).slice(0, 10)));
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

  onBatchChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedBatch.set(val);
    this.updateDonutChartData(val);
  }

  // 1. الانتقال المباشر لصفحة إدارة المتدربين
  goToTraineesList() {
    this.router.navigate(['/admin/trainees']);
  }

  // 2. الانتقال المباشر لصفحة الشركات المستضيفة
  goToCompaniesList() {
    this.router.navigate(['/admin/companies']);
  }

  // 3. الانتقال المباشر لصفحة البرامج والدفعات
  goToProgramsList() {
    this.router.navigate(['/admin/programs']);
  }

  // التوجيه لصفحة سجل الأنشطة الكامل عند الضغط على "عرض الكل"
  viewAllActivities() {
    this.router.navigate(['/admin/activities']);
  }

  private initBarChart() {
    const ctx = document.getElementById('batchesBarChart') as HTMLCanvasElement;
    if (!ctx) return;

    // إضافة Plugin لرسم المربع الرمادي خلف العمود المختار عند الهوفر
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
          backgroundColor: '#0d9488',
          hoverBackgroundColor: '#0d9488',
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
            bodyColor: '#0d9488',
            bodyFont: { size: 13, weight: 'normal' },
            bodyAlign: 'center',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            padding: { top: 10, bottom: 10, left: 16, right: 16 },
            cornerRadius: 10,
            displayColors: false,
            callbacks: {
              title: (tooltipItems) => {
                return tooltipItems[0].label;
              },
              label: (context) => {
                const value = context.raw || 0;
                return `عدد الدفعات : ${value}`;
              }
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
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.raw || 0;
                return ` ${label} : ${value} متدرب`;
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
}