import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CompanyApi } from '../../services/company-api';
import { EnrollmentDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-company-trainees',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './trainees.html',
})
export class CompanyTrainees implements OnInit {
  companyId = 1;
  enrollments = signal<EnrollmentDto[]>([]);
  search = '';
  showAnnounce = signal(false);
  showWarn = signal(false);
  announceMsg = '';
  announceScope: 'Company' | 'Batch' = 'Company';
  warnTarget: EnrollmentDto | null = null;
  warnForm = { type: 'Attendance', level: 'Low', evidence: '' };
//
  constructor(private api: CompanyApi) {}
  ngOnInit() { this.api.getEnrollmentsByCompany(this.companyId).subscribe((d) => this.enrollments.set(d ?? [])); }

  filtered() {
    const q = this.search.trim();
    if (!q) return this.enrollments();
    return this.enrollments().filter((e) => e.traineeName?.includes(q));
  }

  postAnnouncement() {
    this.api.postAnnouncement({ scopeType: this.announceScope, scopeId: this.companyId, message: this.announceMsg, createdByUserId: 2 }).subscribe(() => {
      this.showAnnounce.set(false);
      this.announceMsg = '';
    });
  }

  openWarn(e: EnrollmentDto) { this.warnTarget = e; this.showWarn.set(true); }

  issueWarning() {
    if (!this.warnTarget) return;
    this.api.createWarning({ scope: 'Trainee', enrollmentId: this.warnTarget.enrollmentId, type: this.warnForm.type, level: this.warnForm.level, evidence: this.warnForm.evidence, raisedByUserId: 2 }).subscribe(() => {
      this.showWarn.set(false);
    });
  }
}
