import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { AuditLogDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit.html',
  styleUrls: ['./audit.css']
})
export class AdminAudit implements OnInit {
  logs = signal<AuditLogDto[]>([]);
  search = signal<string>('');
  selectedAction = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  selectedLog = signal<AuditLogDto | null>(null);

  // Pagination Signals
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  constructor(private api: AdminApi) {}

  ngOnInit() {
    this.api.getAuditLog().subscribe((d) => this.logs.set(d ?? []));
  }

  filteredLogs = computed(() => {
    const q = this.search().trim().toLowerCase();
    const actionFilter = this.selectedAction();
    const start = this.startDate() ? new Date(this.startDate()) : null;
    const end = this.endDate() ? new Date(this.endDate()) : null;

    return this.logs().filter((l) => {
      const matchSearch = !q || 
        l.action?.toLowerCase().includes(q) || 
        l.userName?.toLowerCase().includes(q) || 
        l.entityName?.toLowerCase().includes(q) ||
        l.entityId?.toString().includes(q);

      const matchAction = !actionFilter || l.action === actionFilter;

      const logDate = new Date(l.timestamp || l.createdAt || '');
      const matchStart = !start || logDate >= start;
      const matchEnd = !end || logDate <= end;

      return matchSearch && matchAction && matchStart && matchEnd;
    });
  });

  // Calculate paginated logs
  totalPages = computed(() => Math.ceil(this.filteredLogs().length / this.pageSize()) || 1);

  paginatedLogs = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredLogs().slice(start, start + this.pageSize());
  });

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  exportToCsv() {
    const data = this.filteredLogs();
    if (!data.length) return;

    const headers = ['الإجراء', 'المستخدم', 'الكيان المتأثر', 'رقم الكيان', 'التوقيت'];
    const rows = data.map(l => [
      `"${l.action || ''}"`,
      `"${l.userName || 'غير محدد'}"`,
      `"${l.entityName || ''}"`,
      `"${l.entityId || ''}"`,
      `"${l.timestamp || l.createdAt || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  }

  viewDetails(log: AuditLogDto) {
    this.selectedLog.set(log);
  }

  closeModal() {
    this.selectedLog.set(null);
  }
}