import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-company-specialties',
  imports: [CommonModule],
  templateUrl: './specialties.html',
})
export class CompanySpecialties implements OnInit {
  companyId = this.auth.companyId ?? 0;
  programs = signal<unknown[]>([]);
  constructor(private api: CompanyApi, private auth: AuthService) {}
  ngOnInit() { this.api.getCompanyPrograms(this.companyId).subscribe((d) => this.programs.set(d ?? [])); }
}
