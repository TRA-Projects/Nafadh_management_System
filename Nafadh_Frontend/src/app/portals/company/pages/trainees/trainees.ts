import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { EnrollmentDto } from '../../../../core/models/dtos';
import { NfdIcon } from '../../../../shared/ui/icon/icon';

const STATUS_LABELS: Record<string, string> = {
  InProgress: 'نشط',
  Completed: 'مكتمل',
  Dropped: 'موقوف',
  Failed: 'متعثر',
};
const STATUS_CHIP_CLASS: Record<string, string> = {
  InProgress: 'ok',
  Completed: 'info',
  Dropped: 'bad',
  Failed: 'warn',
};

const AVATAR_PALETTE = ['#00338d', '#007cae', '#00bbc2', '#efbb20', '#1ebbf0', '#000692', '#5b6fb8', '#475569'];

@Component({
  selector: 'app-company-trainees',
  imports: [CommonModule, FormsModule, RouterLink, NfdIcon],
  templateUrl: './trainees.html',
  styleUrl: './trainees.scss',
})
export class CompanyTrainees implements OnInit {
  companyId: number = 0;
  enrollments = signal<EnrollmentDto[]>([]);

  search = signal('');
  statusFilter = signal('الكل');
  programFilter = signal('الكل');
  batchFilter = signal('الكل');

  constructor(private api: CompanyApi, private auth: AuthService) {
    this.companyId = this.auth.companyId ?? 0;
  }

  ngOnInit() {
    console.log('Current Company ID:', this.companyId);

    this.api.getEnrollmentsByCompany(this.companyId).subscribe((d) => {
      console.log('Enrollments Data Received:', d);
      this.enrollments.set(d ?? []);
    });
  }

  // دالة عامة لضمان صحة أي رابط (GitHub أو LinkedIn) وإضافة البروتوكول إذا كان ناقصاً
  ensureUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return 'https://' + trimmed;
    }
    return trimmed;
  }

  statuses = computed(() => Array.from(new Set(this.enrollments().map((e) => e.completionStatus))));
  programs = computed(() => Array.from(new Set(this.enrollments().map((e) => e.programTitle).filter((v): v is string => !!v))));
  batches = computed(() => Array.from(new Set(this.enrollments().map((e) => e.batchName))));

  filtered = computed(() => {
    const q = this.search().trim();
    return this.enrollments().filter((e) => {
      if (this.statusFilter() !== 'الكل' && e.completionStatus !== this.statusFilter()) return false;
      if (this.programFilter() !== 'الكل' && e.programTitle !== this.programFilter()) return false;
      if (this.batchFilter() !== 'الكل' && e.batchName !== this.batchFilter()) return false;
      if (q && !(e.traineeName?.includes(q) || e.programTitle?.includes(q))) return false;
      return true;
    });
  });

  clearFilters() {
    this.search.set('');
    this.statusFilter.set('الكل');
    this.programFilter.set('الكل');
    this.batchFilter.set('الكل');
  }

  statusLabel(status: string) { return STATUS_LABELS[status] ?? status; }
  statusChipClass(status: string) { return STATUS_CHIP_CLASS[status] ?? 'gray'; }
  padId(id: number) { return String(id).padStart(4, '0'); }

  initials(name?: string) {
    if (!name) return '؟';
    const parts = name.replace(' بن ', ' ').replace(' بنت ', ' ').trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((w) => w.charAt(0)).join('');
  }

  avatarColor(name?: string) {
    if (!name) return AVATAR_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % AVATAR_PALETTE.length;
    return AVATAR_PALETTE[hash];
  }

  exportList() {
    const rows = this.filtered();
    const header = ['المتدرب', 'الدفعة', 'البرنامج', 'التخصص', 'الحالة'];
    const lines = rows.map((e) => [e.traineeName, e.batchName, e.programTitle ?? '', e.trackName ?? '', this.statusLabel(e.completionStatus)]
      .map((v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','));
    const csv = '\uFEFF' + [header.join(','), ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'المتدربون.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}