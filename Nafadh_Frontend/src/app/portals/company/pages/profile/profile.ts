import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyApi } from '../../services/company-api';
import { CompanyBranchDto, CompanyDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-company-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
})
export class CompanyProfile implements OnInit {
  companyId = 1;
  company = signal<CompanyDto | null>(null);
  branches = signal<CompanyBranchDto[]>([]);
  editing = signal(false);
  capacityDraft = 150;

  constructor(private api: CompanyApi) {}
  ngOnInit() {
    this.api.getCompany(this.companyId).subscribe((c) => { this.company.set(c); this.capacityDraft = c.capacity; });
    this.api.getBranches(this.companyId).subscribe((b) => this.branches.set(b ?? []));
  }

  saveCapacity() {
    const c = this.company();
    if (!c) return;
    this.api.updateCompany(c.companyId, { ...c, capacity: this.capacityDraft }).subscribe(() => {
      this.company.update((cur) => (cur ? { ...cur, capacity: this.capacityDraft } : cur));
      this.editing.set(false);
    });
  }
}
