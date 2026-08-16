import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApi } from '../../services/admin-api';
import { AuditLogDto, DashboardChartsDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
})
export class AdminDashboard implements OnInit {
  recentActivity = signal<AuditLogDto[]>([]);
  charts = signal<DashboardChartsDto | null>(null);
  traineeCount = signal(0);
  companyCount = signal(0);
  batchCount = signal(0);

  constructor(private api: AdminApi) {}

  ngOnInit() {
    this.api.getRecentAudit().subscribe((data) => this.recentActivity.set((data || []).slice(0, 10)));
    this.api.getDashboardCharts().subscribe((c) => this.charts.set(c));
    this.api.getTrainees({ pageSize: 1 }).subscribe((r) => this.traineeCount.set(r.totalCount ?? 0));
    this.api.getCompanies().subscribe((c) => this.companyCount.set(c.length));
    this.api.getBatches().subscribe((b) => this.batchCount.set(b.length));
  }
}
