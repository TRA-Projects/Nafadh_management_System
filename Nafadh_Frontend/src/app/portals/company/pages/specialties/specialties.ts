import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyApi } from '../../services/company-api';

@Component({
  selector: 'app-company-specialties',
  imports: [CommonModule],
  templateUrl: './specialties.html',
})
export class CompanySpecialties implements OnInit {
  companyId = 1;
  programs = signal<unknown[]>([]);
  constructor(private api: CompanyApi) {}
  ngOnInit() { this.api.getCompanyPrograms(this.companyId).subscribe((d) => this.programs.set(d ?? [])); }
}
