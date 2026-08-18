import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { BatchPerformanceReportDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-admin-reports',
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
})
export class AdminReports {
  batchIdInput = 1;
  report = signal<BatchPerformanceReportDto | null>(null);

  constructor(private api: AdminApi) {}

  viewBatchReport() {
    this.api.getBatchPerformanceReport(this.batchIdInput).subscribe((r) => this.report.set(r));
  }
}