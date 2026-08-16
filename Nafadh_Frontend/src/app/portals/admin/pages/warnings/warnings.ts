import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { WarningDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-admin-warnings',
  imports: [CommonModule, FormsModule],
  templateUrl: './warnings.html',
})
export class AdminWarnings implements OnInit {
  warnings = signal<WarningDto[]>([]);
  showIssue = signal(false);
  newWarning = { companyId: 1, type: 'Performance', level: 'Medium', evidence: '' };

  constructor(private api: AdminApi) {}
  ngOnInit() { this.load(); }
  load() { this.api.getWarnings({ scope: 'Company' }).subscribe((d) => this.warnings.set(d)); }

  issue() {
    this.api.createWarning({ scope: 'Company', companyId: this.newWarning.companyId, type: this.newWarning.type, level: this.newWarning.level, evidence: this.newWarning.evidence, raisedByUserId: 1 }).subscribe(() => {
      this.showIssue.set(false);
      this.load();
    });
  }
}
