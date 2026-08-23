import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
  private readonly api = inject(CompanyApi);
  private readonly auth = inject(AuthService);

  companyId: number = this.auth.companyId ?? 0;
  enrollments = signal<EnrollmentDto[]>([]);

  search = signal('');
  statusFilter = signal('الكل');
  programFilter = signal('الكل');
  batchFilter = signal('الكل');

  ngOnInit() {
    this.loadTraineesData();
  }

  loadTraineesData() {
    if (!this.companyId) return;

    this.api.getEnrollmentsByCompany(this.companyId).subscribe({
      next: (d) => this.enrollments.set(d ?? []),
      error: (err) => console.error('Failed to load trainees:', err),
    });
  }

  ensureUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return 'https://' + trimmed;
    }
    return trimmed;
  }

  /**
   * دالة موحدة وحاسمة لتحديد الحالة برمجياً (لتكون متطابقة بين لوحة التحكم وصفحة المتدربين)
   * المعيار يعتمد على: حالة السيرفر الأصلية، نسبة الإنجاز، أو متوسط التقييمات إن وجد.
   */
  getEffectiveStatus(e: EnrollmentDto & { progressPercentage?: number; averageRating?: number }): string {
    // 1. إذا تم إيقاف المتدرب رسمياً من النظام
    if (e.completionStatus === 'Dropped') {
      return 'Dropped';
    }

    // 2. إذا تم اعتباره مكتملاً صراحةً أو بلغت نسبة الإنجاز 100%
    const progress = e.progressPercentage ?? 0;
    if (e.completionStatus === 'Completed' || progress >= 100) {
      return 'Completed';
    }

    // 3. المنطق الموحد للتعثر (إذا كان السيرفر معتبره متعثراً أو انخفض متوسط التقييم عن 60% مع وجود تقدم)
    const rating = e.averageRating ?? 100;
    if (e.completionStatus === 'Failed' || (rating < 60 && progress > 15)) {
      return 'Failed';
    }

    // 4. الافتراضي: نشط
    return e.completionStatus || 'InProgress';
  }

  statuses = computed(() => {
    const rawStatuses = this.enrollments().map((e) => this.getEffectiveStatus(e));
    return Array.from(new Set(rawStatuses));
  });

  programs = computed(() => Array.from(new Set(this.enrollments().map((e) => e.programTitle).filter((v): v is string => !!v))));
  
  batches = computed(() => Array.from(new Set(this.enrollments().map((e) => e.batchName))));

  filtered = computed(() => {
    const q = this.search().trim();
    return this.enrollments().filter((e) => {
      const effectiveStatus = this.getEffectiveStatus(e);
      if (this.statusFilter() !== 'الكل' && effectiveStatus !== this.statusFilter()) return false;
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
    this.loadTraineesData();
  }

  statusLabel(status: string) { return STATUS_LABELS[status] ?? status; }
  statusChipClass(status: string) { return STATUS_CHIP_CLASS[status] ?? 'gray'; }

  // دوال العرض المعتمدة على الحالة الموحدة
  statusLabelFor(e: EnrollmentDto) { 
    return this.statusLabel(this.getEffectiveStatus(e)); 
  }

  statusChipClassFor(e: EnrollmentDto) { 
    return this.statusChipClass(this.getEffectiveStatus(e)); 
  }

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
    const lines = rows.map((e) => [e.traineeName, e.batchName, e.programTitle ?? '', e.trackName ?? '', this.statusLabelFor(e)]
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