import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanySupervisorDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-company-my-account',
  imports: [CommonModule],
  templateUrl: './my-account.html',
})
export class CompanyMyAccount implements OnInit {
  profile = signal<CompanySupervisorDto | null>(null);
  constructor(private api: CompanyApi, public auth: AuthService) {}
  ngOnInit() {
    const supervisorId = this.auth.userId ?? 1;
    this.api.getSupervisorProfile(supervisorId).subscribe({ next: (p) => this.profile.set(p), error: () => {} });
  }
}
