import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { AnnouncementDto, TraineeListItemDto, WarningDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-company-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
})
export class CompanyDashboard implements OnInit {
  // Resolved from the logged-in supervisor's session (set at login from
  // their CompanySupervisor record), not a hardcoded placeholder.
  companyId = this.auth.companyId ?? 0;
  capacity = signal<{ total?: number; used?: number; remaining?: number } | null>(null);
  topPerformers = signal<TraineeListItemDto[]>([]);
  atRisk = signal<TraineeListItemDto[]>([]);
  warnings = signal<WarningDto[]>([]);
  announcements = signal<AnnouncementDto[]>([]);

  constructor(private api: CompanyApi, private auth: AuthService) {}

  ngOnInit() {
    this.api.getCapacity(this.companyId).subscribe((d) => this.capacity.set(d));
    this.api.getTopPerformers(this.companyId).subscribe((d) => this.topPerformers.set(d ?? []));
    this.api.getAtRiskTrainees(this.companyId).subscribe((d) => this.atRisk.set(d ?? []));
    this.api.getCompanyWarnings(this.companyId).subscribe((d) => this.warnings.set(d ?? []));
    this.api.getPlatformAnnouncements().subscribe((d) => this.announcements.set(d ?? []));
  }
}
