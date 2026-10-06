import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  CompanyProgramBatchDto,
  CompanyProgramDetailsDto,
  CompanyProgramModuleDto,
  ProgressSummaryDto,
} from '../../../../core/models/dtos';

interface ProgramInfo {
  id: number;
  title: string;
  description: string;
  category: string;
  department: string;
  durationHours: number;
  capacity: number;
  occupied: number;
  available: number;
  percent: number;
  status: string;
  approved: boolean;
  batchCount: number;
  enrollmentCount: number;
  currentTraineeCount: number;
  color: string;
  batches: CompanyProgramBatchDto[];
}

interface TraineeRow {
  enrollmentId: number;
  traineeId: number;
  name: string;
  cohort: string;
  department: string;
  supervisor: string;
  status: string;
  progress: number;
  gitHubUrl?: string;
  linkedInUrl?: string;
}

@Component({
  selector: 'app-company-program-details',
  templateUrl: './program-details.html',
  styleUrl: './program-details.scss',
})
export class CompanyProgramDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(CompanyApi);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal('');

  readonly program = signal<ProgramInfo | null>(null);
  readonly modules = signal<CompanyProgramModuleDto[]>([]);
  readonly trainees = signal<TraineeRow[]>([]);

  readonly supervisorCount = signal(0);
  readonly averageProgress = signal(0);

  // Search & Status Filter Signals
  readonly searchTerm = signal('');
  readonly selectedStatus = signal('all');

  readonly filteredTrainees = computed(() => {
    const list = this.trainees();
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.selectedStatus();

    return list.filter((row) => {
      const matchesStatus = status === 'all' || row.status === status;
      const matchesSearch =
        !query ||
        row.name.toLowerCase().includes(query) ||
        row.department.toLowerCase().includes(query) ||
        row.supervisor.toLowerCase().includes(query) ||
        row.cohort.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  });

  readonly companyId = this.auth.companyId;

  get p(): ProgramInfo | null {
    return this.program();
  }

  ngOnInit(): void {
    const programId = Number(this.route.snapshot.paramMap.get('id'));
    const companyId = this.companyId;

    if (!companyId) {
      this.error.set('لا يمكن تحديد الشركة الحالية من جلسة الدخول.');
      this.loading.set(false);
      return;
    }

    if (!programId || !Number.isFinite(programId)) {
      this.error.set('معرّف البرنامج غير صالح.');
      this.loading.set(false);
      return;
    }

    this.load(programId, companyId);
  }

  load(programId: number, companyId: number): void {
    if (!companyId) {
      this.error.set('لا يمكن تحديد الشركة الحالية.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.api.getCompanyProgramDetails(companyId, programId).subscribe({
      next: (details) => {
        this.applyDetails(details);
      },

      error: (error) => {
        console.error('Failed to load company program details:', error);

        this.program.set(null);
        this.modules.set([]);
        this.trainees.set([]);
        this.supervisorCount.set(0);
        this.averageProgress.set(0);

        this.error.set('تعذر تحميل تفاصيل البرنامج من قاعدة البيانات.');
        this.loading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/company/specialties']);
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.searchTerm.set(input?.value ?? '');
  }

  setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
  }

  exportPdf(): void {
    window.print();
  }

  exportExcel(): void {
    const rows = this.filteredTrainees();
    if (!rows.length) {
      return;
    }

    const headers = ['المتدرب', 'القسم', 'الدفعة', 'المشرف', 'نسبة الإنجاز', 'الحالة'];
    const csvLines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          `"${r.name}"`,
          `"${r.department}"`,
          `"${r.cohort}"`,
          `"${r.supervisor}"`,
          `"${r.progress}%"`,
          `"${r.status}"`,
        ].join(',')
      ),
    ];

    const blob = new Blob(['\uFEFF' + csvLines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `program-${this.p?.id ?? 'details'}-trainees.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private applyDetails(details: CompanyProgramDetailsDto): void {
    const durationHours = Number(details.durationHours ?? 0);
    const capacity = Number(details.allocatedCapacity ?? 0);
    const occupied = Number(details.usedCapacity ?? 0);
    const available = Number(details.remainingCapacity ?? 0);

    const utilizationPercentage = this.clamp(
      Number(details.utilizationPercentage ?? 0)
    );

    const color = this.colorFor(details.title);

    this.program.set({
      id: details.programId,
      title: details.title?.trim() || 'برنامج تدريبي',
      description: details.description?.trim() || 'لا يوجد وصف للبرنامج.',
      category: details.category?.trim() || 'غير محدد',
      department: details.departments?.length
        ? details.departments.join('، ')
        : 'غير محدد',
      durationHours,
      capacity,
      occupied,
      available,
      percent: utilizationPercentage,
      status: details.status || '',
      approved: Boolean(details.approvedForCompany),
      batchCount: Number(details.batchCount ?? 0),
      enrollmentCount: Number(details.enrollmentCount ?? 0),
      currentTraineeCount: Number(details.currentTraineeCount ?? 0),
      color,
      batches: details.batches ?? [],
    });

    this.modules.set(details.modules ?? []);

    const rows: TraineeRow[] = (details.enrollments ?? []).map(
      (enrollment) => ({
        enrollmentId: enrollment.enrollmentId,
        traineeId: enrollment.traineeId,
        name: enrollment.traineeName?.trim() || 'متدرب بدون اسم',
        cohort: enrollment.batchName?.trim() || 'غير محدد',
        department: enrollment.departmentName?.trim() || 'غير محدد',
        supervisor: enrollment.supervisorName?.trim() || 'غير محدد',
        status: this.statusLabel(enrollment.completionStatus),
        progress: 0,
        gitHubUrl: enrollment.traineeGitHubUrl,
        linkedInUrl: enrollment.traineeLinkedInUrl,
      })
    );

    if (!rows.length) {
      this.finishRows([]);
      return;
    }

    forkJoin(
      rows.map((row) =>
        this.api
          .getProgressSummary(row.enrollmentId)
          .pipe(catchError(() => of<ProgressSummaryDto | null>(null)))
      )
    ).subscribe({
      next: (progressResults) => {
        const hydratedRows = rows.map((row, index) => ({
          ...row,
          progress: this.progressValue(progressResults[index]),
        }));

        this.finishRows(hydratedRows);
      },

      error: () => {
        this.finishRows(rows);
      },
    });
  }

  private progressValue(progress: ProgressSummaryDto | null): number {
    if (!progress) {
      return 0;
    }

    return this.clamp(Number(progress.progressPercentage ?? 0));
  }

  utilizationRing(): string {
    const value = this.clamp(this.p?.percent ?? 0);
    const angle = value * 3.6;

    return `conic-gradient(
      #0ea5e9 0deg ${angle}deg,
      #e2e8f0 ${angle}deg 360deg
    )`;
  }

  formatPercent(value: number): string {
    return Math.round(this.clamp(Number(value ?? 0))).toString();
  }

  initials(name: string): string {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return (
      parts
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join('') || '—'
    );
  }

  statusClass(value: string): string {
    const status = String(value ?? '').toLowerCase();

    if (status.includes('complete') || status.includes('مكتمل')) {
      return 'done';
    }

    if (
      status.includes('drop') ||
      status.includes('withdraw') ||
      status.includes('suspend') ||
      status.includes('متوقف')
    ) {
      return 'stopped';
    }

    if (status.includes('fail') || status.includes('متعثر')) {
      return 'failed';
    }

    return 'pending';
  }

  programStatusLabel(value: string): string {
    const status = String(value ?? '').toLowerCase();

    if (
      status.includes('active') ||
      status.includes('approved') ||
      status.includes('نشط')
    ) {
      return 'نشط';
    }

    if (
      status.includes('suspend') ||
      status.includes('inactive') ||
      status.includes('معلق')
    ) {
      return 'معلق';
    }

    if (
      status.includes('complete') ||
      status.includes('completed') ||
      status.includes('مكتمل')
    ) {
      return 'مكتمل';
    }

    return value || 'غير محدد';
  }

  formatDate(value: string): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('ar-OM', {
      dateStyle: 'medium',
    }).format(date);
  }

  githubUrl(url?: string): string | null {
    return this.socialUrl(url, 'github.com');
  }

  linkedInUrl(url?: string): string | null {
    return this.socialUrl(url, 'linkedin.com');
  }

  private socialUrl(
    url: string | undefined,
    allowedDomain: string
  ): string | null {
    if (!url?.trim()) {
      return null;
    }

    const value = url.trim();
    const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;

    try {
      const parsed = new URL(normalized);

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }

      const host = parsed.hostname.toLowerCase();
      const validHost =
        host === allowedDomain || host.endsWith(`.${allowedDomain}`);

      return validHost ? parsed.toString() : null;
    } catch {
      return null;
    }
  }

  private finishRows(rows: TraineeRow[]): void {
    this.trainees.set(rows);

    const supervisors = new Set(
      rows
        .map((row) => row.supervisor)
        .filter((value) => !!value && value !== '—' && value !== 'غير محدد')
    );

    this.supervisorCount.set(supervisors.size);

    const average = rows.length
      ? rows.reduce((sum, row) => sum + row.progress, 0) / rows.length
      : 0;

    this.averageProgress.set(Math.round(average));
    this.loading.set(false);
  }

  private clamp(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(0, Math.min(100, value));
  }

  private statusLabel(value: unknown): string {
    const status = String(value ?? '').toLowerCase();

    if (status.includes('complete') || status.includes('مكتمل')) {
      return 'مكتمل';
    }

    if (
      status.includes('drop') ||
      status.includes('withdraw') ||
      status.includes('suspend') ||
      status.includes('متوقف')
    ) {
      return 'متوقف';
    }

    if (status.includes('fail') || status.includes('متعثر')) {
      return 'متعثر';
    }

    return 'قيد التدريب';
  }

  private colorFor(title: string): string {
    if (/بيانات|data/i.test(title)) {
      return '#007cae';
    }

    if (/أمن|cyber/i.test(title)) {
      return '#00338d';
    }

    if (/دعم/i.test(title)) {
      return '#efbb20';
    }

    if (/تصميم|جرافيك/i.test(title)) {
      return '#1ebbf0';
    }

    return '#00338d';
  }
}
