import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { AuditLogDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-admin-audit',
  imports: [CommonModule, FormsModule],
  templateUrl: './audit.html',
})
export class AdminAudit implements OnInit {
  logs = signal<AuditLogDto[]>([]);
  search = '';

  constructor(private api: AdminApi) {}
  ngOnInit() { this.api.getAuditLog().subscribe((d) => this.logs.set(d ?? [])); }

  filtered() {
    const q = this.search.trim();
    if (!q) return this.logs();
    return this.logs().filter((l) => l.action?.includes(q) || l.userName?.includes(q) || l.entityName?.includes(q));
  }
}
