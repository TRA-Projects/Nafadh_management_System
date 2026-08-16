import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApi } from '../../services/admin-api';
import { CompanyDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-admin-companies',
  imports: [CommonModule],
  templateUrl: './companies.html',
})
export class AdminCompanies implements OnInit {
  companies = signal<CompanyDto[]>([]);
  statusFilter = signal('الكل');

  constructor(private api: AdminApi) {}
  ngOnInit() { this.load(); }
  load() { this.api.getCompanies().subscribe((d) => this.companies.set(d)); }

  filtered() {
    const f = this.statusFilter();
    if (f === 'الكل') return this.companies();
    return this.companies().filter((c) => c.status === f);
  }

  approve(c: CompanyDto) { this.api.approveCompany(c.companyId).subscribe(() => this.load()); }
  suspend(c: CompanyDto) { this.api.suspendCompany(c.companyId).subscribe(() => this.load()); }
}
