import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  CompanyProgramBatchDto,
  CompanyProgramDetailsDto,
  CompanyProgramModuleDto,
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

  // ============================================================
  // Export (Excel + PDF) — real files built from the loaded data
  // ============================================================

  readonly exporting = signal<'' | 'excel' | 'pdf'>('');

  private exportModel() {
    const p = this.p;
    if (!p) {
      return null;
    }

    const modules = this.modules();
    const titleOf = (id?: number | null) =>
      id ? modules.find((m) => m.moduleId === id)?.title ?? '—' : '—';

    return {
      p,
      exportedAt: new Date(),
      supervisors: this.supervisorCount(),
      averageProgress: this.averageProgress(),
      trainees: this.trainees(),
      modules: modules.map((m, index) => ({
        order: index + 1,
        title: m.title,
        prerequisite: titleOf(m.prerequisiteModuleId),
      })),
      batches: p.batches.map((b) => ({
        name: b.batchName,
        start: new Date(b.startDate),
        end: new Date(b.endDate),
        status: this.batchStatusLabel(b.status),
        capacity: Number(b.capacity ?? 0),
        companyCount: Number(b.companyEnrollmentCount ?? 0),
      })),
    };
  }

  private exportFileName(id: number, extension: 'xlsx' | 'pdf'): string {
    const d = new Date();
    const stamp =
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `program-${id}-details-${stamp}.${extension}`;
  }

  async exportExcel(): Promise<void> {
    const m = this.exportModel();
    if (!m || this.exporting()) {
      return;
    }

    this.exporting.set('excel');

    try {
      const XLSX = await import('xlsx');
      const { p } = m;

      const summary: (string | number | Date)[][] = [
        ['تقرير تفاصيل البرنامج التدريبي', ''],
        ['تاريخ التصدير', m.exportedAt],
        [],
        ['البيان', 'القيمة'],
        ['اسم البرنامج', p.title],
        ['الوصف', p.description],
        ['التصنيف', p.category],
        ['الأقسام', p.department],
        ['حالة البرنامج', this.programStatusLabel(p.status)],
        ['الاعتماد للشركة', p.approved ? 'معتمد للشركة' : 'غير معتمد'],
        ['عدد الساعات التدريبية', p.durationHours],
        ['عدد المراحل', m.modules.length],
        ['عدد الدفعات', p.batchCount],
        ['إجمالي التسجيلات', p.enrollmentCount],
        ['المتدربون الحاليون', p.currentTraineeCount],
        ['عدد المشرفين', m.supervisors],
        ['متوسط الإنجاز (%)', m.averageProgress],
        ['إجمالي المقاعد', p.capacity],
        ['المقاعد المشغولة', p.occupied],
        ['المقاعد المتاحة', p.available],
        ['نسبة الإشغال (%)', Math.round(p.percent * 10) / 10],
      ];

      const modulesSheet: (string | number)[][] = [
        ['الترتيب', 'المرحلة', 'تعتمد على'],
        ...m.modules.map((x) => [x.order, x.title, x.prerequisite]),
      ];

      const batchesSheet: (string | number | Date)[][] = [
        ['الدفعة', 'تاريخ البدء', 'تاريخ الانتهاء', 'الحالة', 'السعة (مقعد)', 'متدربو شركتكم'],
        ...m.batches.map((x) => [x.name, x.start, x.end, x.status, x.capacity, x.companyCount]),
      ];

      const traineesSheet: (string | number)[][] = [
        ['#', 'المتدرب', 'القسم', 'الدفعة', 'المشرف', 'نسبة الإنجاز (%)', 'الحالة', 'GitHub', 'LinkedIn'],
        ...m.trainees.map((t, i) => [
          i + 1,
          t.name,
          t.department,
          t.cohort,
          t.supervisor,
          t.progress,
          t.status,
          t.gitHubUrl ?? '',
          t.linkedInUrl ?? '',
        ]),
      ];

      const book = XLSX.utils.book_new();

      const add = (name: string, rows: unknown[][], widths: number[]) => {
        const sheet = XLSX.utils.aoa_to_sheet(rows as never[][], { cellDates: true });
        sheet['!cols'] = widths.map((wch) => ({ wch }));

        // Show real dates (dd/mm/yyyy) instead of serial numbers.
        for (const address of Object.keys(sheet)) {
          if (address[0] !== '!' && sheet[address].t === 'd') {
            sheet[address].z = 'dd/mm/yyyy';
          }
        }

        XLSX.utils.book_append_sheet(book, sheet, name);
      };

      add('ملخص البرنامج', summary, [26, 70]);
      add('المراحل', modulesSheet, [10, 44, 36]);
      add('الدفعات', batchesSheet, [22, 16, 16, 14, 14, 16]);
      add('المتدربون', traineesSheet, [6, 28, 22, 22, 26, 16, 14, 34, 34]);

      XLSX.writeFile(book, this.exportFileName(p.id, 'xlsx'), { cellDates: true });
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('تعذر إنشاء ملف Excel.');
    } finally {
      this.exporting.set('');
    }
  }

  async exportPdf(): Promise<void> {
    const m = this.exportModel();
    if (!m || this.exporting()) {
      return;
    }

    this.exporting.set('pdf');

    const host = document.createElement('div');
    host.style.cssText =
      'position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1;';
    host.innerHTML = this.buildReportHtml(m);
    document.body.appendChild(host);

    try {
      // Make sure the Arabic web font is ready before rasterising the report.
      await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;

      const html2pdf = (await import('html2pdf.js')).default;

      const options = {
        margin: [10, 8, 12, 8] as [number, number, number, number],
        filename: this.exportFileName(m.p.id, 'pdf'),
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.pdf-title', '.pdf-kpis'] },
      };

      await html2pdf()
        .set(options)
        .from(host.firstElementChild as HTMLElement)
        .save();
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('تعذر إنشاء ملف PDF.');
    } finally {
      host.remove();
      this.exporting.set('');
    }
  }

  private esc(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private buildReportHtml(m: NonNullable<ReturnType<CompanyProgramDetails['exportModel']>>): string {
    const e = (v: unknown) => this.esc(v);
    const { p } = m;
    const date = (d: Date) => this.formatDate(d.toISOString());

    const kpi = (label: string, value: string | number) =>
      `<td class="kpi"><b>${e(value)}</b><span>${e(label)}</span></td>`;

    const table = (headers: string[], rows: string[][]) =>
      `<table><thead><tr>${headers.map((h) => `<th>${e(h)}</th>`).join('')}</tr></thead>` +
      `<tbody>${rows
        .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
        .join('') || `<tr><td colspan="${headers.length}" class="empty">لا توجد بيانات.</td></tr>`}</tbody></table>`;

    const ltr = (v: string) => `<bdi dir="ltr">${e(v)}</bdi>`;

    const info = [
      ['التصنيف', p.category],
      ['الأقسام', p.department],
      ['حالة البرنامج', this.programStatusLabel(p.status)],
      ['الاعتماد للشركة', p.approved ? 'معتمد للشركة' : 'غير معتمد'],
      ['الساعات التدريبية', `${p.durationHours} ساعة`],
      ['عدد المشرفين', String(m.supervisors)],
    ];

    return `
<div dir="rtl" style="font-family:'Cairo','Segoe UI',Tahoma,sans-serif;color:#10254a;width:778px;padding:6px 4px;font-size:12px;line-height:1.7;">
  <style>
    .pdf-head{background:#00338d;color:#fff;border-radius:10px;padding:14px 18px;margin-bottom:12px}
    .pdf-head small{opacity:.8;font-size:11px}
    .pdf-head h1{margin:2px 0 4px;font-size:20px;font-weight:700}
    .pdf-head p{margin:0;font-size:11px;opacity:.9}
    .pdf-title{margin:16px 0 6px;font-size:14px;font-weight:700;color:#00338d;border-right:4px solid #00338d;padding-right:8px}
    .pdf-kpis{width:100%;border-collapse:separate;border-spacing:6px 0;margin:0 -6px}
    td.kpi{background:#f1f5fb;border:1px solid #dbe4f3;border-radius:8px;text-align:center;padding:8px 4px;width:20%}
    td.kpi b{display:block;font-size:17px;color:#00338d}
    td.kpi span{font-size:10.5px;color:#64748b}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:#00338d;color:#fff;padding:6px 8px;text-align:right;font-weight:600}
    td{padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top}
    tr{page-break-inside:avoid}
    tbody tr:nth-child(even) td{background:#f8fafc}
    .empty{text-align:center;color:#94a3b8}
    .kv td:first-child{width:28%;color:#64748b;font-weight:600;background:#f8fafc}
    .bar{height:6px;border-radius:3px;background:#e2e8f0;overflow:hidden;min-width:70px}
    .bar i{display:block;height:100%;background:#0ea5e9}
    .foot{margin-top:16px;border-top:1px solid #e2e8f0;padding-top:6px;color:#94a3b8;font-size:10px;text-align:center}
  </style>

  <div class="pdf-head">
    <small>تقرير تفاصيل البرنامج التدريبي</small>
    <h1>${e(p.title)}</h1>
    <p>${e(p.description)}</p>
  </div>

  <table class="pdf-kpis"><tbody><tr>
    ${kpi('المتدربون الحاليون', p.currentTraineeCount)}
    ${kpi('إجمالي التسجيلات', p.enrollmentCount)}
    ${kpi('الدفعات', p.batchCount)}
    ${kpi('نسبة الإشغال', `${this.formatPercent(p.percent)}%`)}
    ${kpi('متوسط الإنجاز', `${m.averageProgress}%`)}
  </tr></tbody></table>

  <div class="pdf-title">بيانات البرنامج</div>
  <table class="kv"><tbody>${info.map(([k, v]) => `<tr><td>${e(k)}</td><td>${e(v)}</td></tr>`).join('')}</tbody></table>

  <div class="pdf-title">الطاقة الاستيعابية</div>
  ${table(
    ['إجمالي المقاعد', 'المقاعد المشغولة', 'المقاعد المتاحة', 'نسبة الإشغال'],
    [[String(p.capacity), String(p.occupied), String(p.available), `${this.formatPercent(p.percent)}%`]]
  )}

  <div class="pdf-title">مراحل الخطة التدريبية (${m.modules.length})</div>
  ${table(
    ['#', 'المرحلة', 'تعتمد على'],
    m.modules.map((x) => [String(x.order), e(x.title), e(x.prerequisite)])
  )}

  <div class="pdf-title">الدفعات التدريبية (${m.batches.length})</div>
  ${table(
    ['الدفعة', 'تاريخ البدء', 'تاريخ الانتهاء', 'الحالة', 'السعة', 'متدربو شركتكم'],
    m.batches.map((x) => [e(x.name), ltr(date(x.start)), ltr(date(x.end)), e(x.status), String(x.capacity), String(x.companyCount)])
  )}

  <div class="pdf-title">المتدربون المسجلون (${m.trainees.length})</div>
  ${table(
    ['#', 'المتدرب', 'القسم', 'الدفعة', 'المشرف', 'الإنجاز', 'الحالة'],
    m.trainees.map((t, i) => [
      String(i + 1),
      e(t.name),
      e(t.department),
      e(t.cohort),
      e(t.supervisor),
      `<div class="bar"><i style="width:${t.progress}%"></i></div>${t.progress}%`,
      e(t.status),
    ])
  )}

  <div class="foot">صدر من بوابة نفاذ – الشركة المستضيفة · ${e(date(m.exportedAt))}</div>
</div>`;
  }

  private applyDetails(details: CompanyProgramDetailsDto): void {
    const durationHours = Number(details.durationHours ?? 0);
    // Seats of the open batches (shared capacity vs every company's trainees);
    // falls back to the older fields when talking to an older backend.
    const hasOpenSeats =
      details.openSeatCapacity !== undefined && details.openSeatCapacity !== null;

    const capacity = Number(
      hasOpenSeats ? details.openSeatCapacity : details.allocatedCapacity ?? 0
    );
    const occupied = Number(
      hasOpenSeats ? details.openSeatOccupied ?? 0 : details.usedCapacity ?? 0
    );
    const available = Number(
      hasOpenSeats ? details.openSeatRemaining ?? 0 : details.remainingCapacity ?? 0
    );

    const utilizationPercentage = this.clamp(
      Number(
        hasOpenSeats
          ? details.openSeatUtilizationPercentage ?? 0
          : details.utilizationPercentage ?? 0
      )
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
        progress: this.clamp(Number(enrollment.progressPercentage ?? 0)),
        gitHubUrl: enrollment.traineeGitHubUrl,
        linkedInUrl: enrollment.traineeLinkedInUrl,
      })
    );

    this.finishRows(rows);
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
    switch (String(value ?? '').toLowerCase()) {
      case 'published':
        return 'منشور';
      case 'draft':
        return 'مسودة';
      case 'archived':
        return 'مؤرشف';
      default:
        return value || 'غير محدد';
    }
  }

  batchStatusLabel(value: string): string {
    switch (String(value ?? '').toLowerCase()) {
      case 'upcoming':
        return 'قادمة';
      case 'ongoing':
        return 'جارية';
      case 'completed':
        return 'مكتملة';
      case 'cancelled':
        return 'ملغاة';
      default:
        return value || 'غير محدد';
    }
  }

  formatDate(value: string): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString('en-GB');
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
