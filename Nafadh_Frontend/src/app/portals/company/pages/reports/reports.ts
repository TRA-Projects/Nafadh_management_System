import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyApi } from '../../services/company-api';
import { AttendanceReportDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-company-reports',
  imports: [CommonModule],
  templateUrl: './reports.html',
})
export class CompanyReports implements OnInit {
  companyId = 1;
  tab = signal<'attendance' | 'achievement' | 'capacity'>('attendance');
  attendance = signal<AttendanceReportDto | null>(null);
  constructor(private api: CompanyApi) {}
  ngOnInit() { this.api.getCompanyAttendanceReport(this.companyId).subscribe({ next: (d) => this.attendance.set(d), error: () => {} }); }
}
