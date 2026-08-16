import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { AnnouncementDto, TraineeListItemDto, WarningDto } from '../../../../core/models/dtos';

// NOTE: this portal's companyId is resolved from the logged-in supervisor's
// own CompanySupervisor record in a full implementation; for now it reads a
// stored company id set at first load (see resolveCompanyId), matching the
// single-company-per-session assumption of the original demo.
@Component({
  selector: 'app-company-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
})
export class CompanyDashboard implements OnInit {
  companyId = 1;
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
