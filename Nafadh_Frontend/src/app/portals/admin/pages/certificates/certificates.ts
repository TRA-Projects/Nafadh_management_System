import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApi } from '../../services/admin-api';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface BatchCertificateCardDto {
  id: number;
  batchId: number;
  programId?: number;
  batchName: string;
  companyName: string;
  trackName: string;
  status: string | number;
  statusText?: string;
  issuedCertificatesCount: number;
  totalTraineesCount: number;
  startDate?: string | Date;
  endDate?: string | Date;
}

export interface TraineeDto {
  traineeId: number;
  enrollmentId: number;
  fullName: string;
  isIssued: boolean;
  fileUrl?: string;
  grade?: string;
  gradeLabel?: string;
  serialNumber: string;
  verificationCode: string;
  issueDate?: string;
}

export interface ActiveCertificateModal {
  traineeName: string;
  traineeId: number;
  enrollmentId: number;
  trackName: string;
  companyName: string;
  batchName: string;
  startDate?: string | Date;
  endDate?: string | Date;
  grade?: string;
  gradeLabel: string;
  serialNumber: string;
  verificationCode: string;
  issueDate: string;
  fileUrl?: string;
  totalHours: number;
  techHours: number;
  practicalHours: number;
}

export interface CertificateMessage {
  type: 'error' | 'warning' | 'success';
  title: string;
  message: string;
}

@Component({
  selector: 'app-admin-certificates',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './certificates.html',
  styleUrls: ['./certificates.css']
})
export class AdminCertificates implements OnInit {

  private static cachedBatches: BatchCertificateCardDto[] | null = null;
  private static cachedTraineesByBatch = new Map<number, TraineeDto[]>();

  readonly batches = signal<BatchCertificateCardDto[]>([]);
  readonly selectedBatch = signal<BatchCertificateCardDto | null>(null);
  readonly selectedBatchTrainees = signal<TraineeDto[]>([]);

  readonly viewMode = signal<'list' | 'details'>('list');

  readonly loading = signal<boolean>(false);
  readonly loadingTrainees = signal<boolean>(false);

  readonly companiesList = signal<string[]>([]);
  readonly tracksList = signal<string[]>([]);
  readonly allBatchesList = signal<BatchCertificateCardDto[]>([]);

  readonly companyFilter = signal<string>('all');
  readonly trackFilter = signal<string>('all');
  readonly batchIdFilter = signal<string>('all');
  readonly statusFilter = signal<string>('all');
  readonly searchTerm = signal<string>('');
  readonly traineeSearchTerm = signal<string>('');

  readonly completedBatchesCount = signal<number>(0);
  readonly ongoingBatchesCount = signal<number>(0);
  readonly notStartedBatchesCount = signal<number>(0);
  readonly totalIssuedCertificatesCount = signal<number>(0);

  readonly verifyQuery = signal<string>('');
  readonly verifyResult = signal<{
    checked: boolean;
    found: boolean;
    certData?: ActiveCertificateModal;
  }>({ checked: false, found: false });

  readonly copiedText = signal<string | null>(null);

  readonly certificateMessage = signal<CertificateMessage | null>(null);
  private messageTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly isModalOpen = signal<boolean>(false);
  readonly activeCertData = signal<ActiveCertificateModal | null>(null);

  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(9);
  readonly totalBatchesCount = signal<number>(0);

  readonly totalPages = computed(() =>
    Math.ceil(this.totalBatchesCount() / this.pageSize()) || 1
  );

  readonly filteredBatchTrainees = computed(() => {
    const q = this.traineeSearchTerm().trim().toLowerCase();
    const list = this.selectedBatchTrainees();
    if (!q) return list;
    return list.filter(t =>
      (t.fullName || '').toLowerCase().includes(q) ||
      (t.serialNumber || '').toLowerCase().includes(q) ||
      (t.verificationCode || '').toLowerCase().includes(q)
    );
  });

  private allBatches: BatchCertificateCardDto[] = [];

  constructor(private readonly api: AdminApi) {}

  ngOnInit(): void {
    this.fetchBatches();
  }

  private showCertificateMessage(
    type: 'error' | 'warning' | 'success',
    title: string,
    message: string
  ): void {
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }

    this.certificateMessage.set({ type, title, message });

    this.messageTimeout = setTimeout(() => {
      this.certificateMessage.set(null);
    }, 5000);
  }

  closeCertificateMessage(): void {
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }
    this.certificateMessage.set(null);
  }

  private cleanId(val: any): number {
    if (!val) return 0;
    const str = String(val).split(':')[0].trim();
    const parsed = parseInt(str, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  generateSerialNumber(batchId: number, enrollmentId: number, traineeId: number): string {
    const year = new Date().getFullYear();
    const bPart = String(batchId || 1).padStart(3, '0');
    const ePart = String(enrollmentId || traineeId || 1).padStart(4, '0');
    return `SN-${year}-${bPart}-${ePart}`;
  }

  generateVerificationCode(batchId: number, enrollmentId: number, traineeId: number): string {
    const seed = ((batchId + 7) * 313 + (enrollmentId + 11) * 97 + (traineeId + 3) * 53) % 9000 + 1000;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const c1 = chars[(batchId + enrollmentId) % chars.length];
    const c2 = chars[(traineeId + enrollmentId * 3) % chars.length];
    const ePart = String(enrollmentId || traineeId || 1).padStart(3, '0');
    return `VR-NAF-${seed}${c1}${c2}-${ePart}`;
  }

  // حساب عدد الساعات تلقائياً من تاريخ بداية ونهاية الدفعة (بمعدل 7 ساعات يومياً / 5 أيام في الأسبوع)
  calculateTrainingHours(startDate?: string | Date, endDate?: string | Date): {
    totalHours: number;
    techHours: number;
    practicalHours: number;
  } {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end.getTime() - start.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (!isNaN(diffDays) && diffDays > 0) {
        const workingDays = Math.max(1, Math.round((diffDays / 7) * 5));
        const totalHours = Math.round((workingDays * 7) / 10) * 10 || 1260;
        const techHours = Math.round((totalHours * 2) / 3);
        const practicalHours = totalHours - techHours;
        return { totalHours, techHours, practicalHours };
      }
    }
    return { totalHours: 1260, techHours: 840, practicalHours: 420 };
  }

  getGradeLabel(gradeStr?: string): string {
    if (!gradeStr) return 'اجتياز بنجاح';
    const num = parseFloat(String(gradeStr).replace('%', '').trim());
    if (isNaN(num)) return 'اجتياز بنجاح';
    if (num >= 95) return 'امتياز مع مرتبة الشرف';
    if (num >= 90) return 'امتياز';
    if (num >= 80) return 'جيد جداً';
    if (num >= 70) return 'جيد';
    if (num >= 50) return 'مقبول';
    return 'غير مجتاز';
  }

  copyToClipboard(text?: string): void {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    this.copiedText.set(text);
    setTimeout(() => this.copiedText.set(null), 1800);
  }

  onVerifyInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.verifyQuery.set(input.value);
    if (!input.value.trim()) {
      this.verifyResult.set({ checked: false, found: false });
    }
  }

  verifyCertificateByCode(): void {
    const q = this.verifyQuery().trim().toUpperCase();
    if (!q) return;

    for (const [bId, trainees] of AdminCertificates.cachedTraineesByBatch.entries()) {
      const batch = this.allBatches.find(b => (b.batchId || b.id) === bId);
      if (!batch) continue;

      const matched = trainees.find(
        t =>
          t.isIssued &&
          (t.serialNumber.toUpperCase() === q || t.verificationCode.toUpperCase() === q)
      );

      if (matched) {
        const modalData = this.buildModalData(matched, batch);
        this.verifyResult.set({
          checked: true,
          found: true,
          certData: modalData
        });
        return;
      }
    }

    this.verifyResult.set({
      checked: true,
      found: false
    });
  }

  openVerifiedCertificate(): void {
    const res = this.verifyResult();
    if (res.found && res.certData) {
      this.activeCertData.set(res.certData);
      this.isModalOpen.set(true);
    }
  }

  fetchBatches(): void {
    if (AdminCertificates.cachedBatches && AdminCertificates.cachedBatches.length > 0) {
      this.allBatches = AdminCertificates.cachedBatches;
      this.populateFilterOptions(this.allBatches);
      this.applyFilters();
      this.loading.set(false);
    } else {
      this.loading.set(true);
    }

    this.api.getBatches().subscribe({
      next: (response: any[]) => {
        const rawBatches = response || [];

        if (rawBatches.length === 0) {
          this.allBatches = [];
          this.batches.set([]);
          this.totalBatchesCount.set(0);
          this.loading.set(false);
          return;
        }

        const normalizedBatches = rawBatches.map((b: any) => this.normalizeBatch(b));

        this.allBatches = normalizedBatches;
        AdminCertificates.cachedBatches = normalizedBatches;
        this.populateFilterOptions(normalizedBatches);
        this.applyFilters();
        this.loading.set(false);

        const batchRequests$ = normalizedBatches.map((normalized: BatchCertificateCardDto) => {
          const bId = this.cleanId(normalized.batchId ?? normalized.id);

          return this.api.getBatchCertificatesStatus(bId).pipe(
            map((res: any) => {
              const rawList = Array.isArray(res) ? res : (res?.items || []);
              const mappedTrainees = this.mapTraineesList(rawList, bId);
              AdminCertificates.cachedTraineesByBatch.set(bId, mappedTrainees);

              const issuedCount = mappedTrainees.filter(t => t.isIssued).length;

              return {
                ...normalized,
                totalTraineesCount: mappedTrainees.length,
                issuedCertificatesCount: issuedCount
              };
            }),
            catchError(() =>
              of({
                ...normalized,
                totalTraineesCount: normalized.totalTraineesCount || 0,
                issuedCertificatesCount: normalized.issuedCertificatesCount || 0
              })
            )
          );
        });

        forkJoin<BatchCertificateCardDto[]>(batchRequests$).subscribe({
          next: (finalBatches) => {
            this.allBatches = finalBatches;
            AdminCertificates.cachedBatches = finalBatches;
            this.populateFilterOptions(finalBatches);
            this.applyFilters();
          }
        });
      },
      error: (err) => {
        console.error('Error fetching batches:', err);
        this.loading.set(false);
      }
    });
  }

  private mapTraineesList(rawList: any[], batchId: number): TraineeDto[] {
    return rawList.map((t: any) => {
      const cleanEId = this.cleanId(t.enrollmentId);
      const cleanTId = this.cleanId(t.traineeId);
      const gradeFormatted =
        t.grade != null ? `${Number(t.grade).toFixed(2)}%` : undefined;

      return {
        traineeId: cleanTId,
        enrollmentId: cleanEId,
        fullName: t.fullName || 'متدرب',
        isIssued: !!t.isIssued,
        fileUrl: t.fileUrl || undefined,
        grade: gradeFormatted,
        gradeLabel: this.getGradeLabel(gradeFormatted),
        serialNumber:
          t.serialNumber || this.generateSerialNumber(batchId, cleanEId, cleanTId),
        verificationCode:
          t.verificationCode || this.generateVerificationCode(batchId, cleanEId, cleanTId),
        issueDate: t.issuedAt || t.issueDate || new Date().toISOString().slice(0, 10)
      };
    });
  }

  private populateFilterOptions(batches: BatchCertificateCardDto[]): void {
    const companies = Array.from(
      new Set(batches.map(b => b.companyName).filter(Boolean))
    ).sort();
    const tracks = Array.from(
      new Set(batches.map(b => b.trackName).filter(Boolean))
    ).sort();

    this.companiesList.set(companies);
    this.tracksList.set(tracks);
    this.allBatchesList.set(batches);

    let completed = 0;
    let ongoing = 0;
    let notStarted = 0;
    let totalIssued = 0;

    for (const b of batches) {
      totalIssued += b.issuedCertificatesCount || 0;
      if (this.isBatchCompleted(b)) {
        completed++;
      } else if (this.isBatchOngoing(b)) {
        ongoing++;
      } else {
        notStarted++;
      }
    }

    this.completedBatchesCount.set(completed);
    this.ongoingBatchesCount.set(ongoing);
    this.notStartedBatchesCount.set(notStarted);
    this.totalIssuedCertificatesCount.set(totalIssued);
  }

  private applyFilters(): void {
    const search = this.searchTerm().trim().toLowerCase();
    const selectedStatus = this.statusFilter();
    const selectedCompany = this.companyFilter();
    const selectedTrack = this.trackFilter();
    const selectedBatchId = this.batchIdFilter();

    let filteredBatches = [...this.allBatches];

    if (selectedCompany !== 'all') {
      filteredBatches = filteredBatches.filter(b => b.companyName === selectedCompany);
    }

    if (selectedTrack !== 'all') {
      filteredBatches = filteredBatches.filter(b => b.trackName === selectedTrack);
    }

    if (selectedBatchId !== 'all') {
      filteredBatches = filteredBatches.filter(
        b => String(b.batchId || b.id) === selectedBatchId
      );
    }

    if (selectedStatus !== 'all') {
      filteredBatches = filteredBatches.filter(batch => {
        if (selectedStatus === 'completed') return this.isBatchCompleted(batch);
        if (selectedStatus === 'ongoing') return this.isBatchOngoing(batch);
        if (selectedStatus === 'not-started') {
          return !this.isBatchCompleted(batch) && !this.isBatchOngoing(batch);
        }
        return true;
      });
    }

    if (search) {
      filteredBatches = filteredBatches.filter(batch => {
        const batchName = (batch.batchName || '').toLowerCase();
        const companyName = (batch.companyName || '').toLowerCase();
        const trackName = (batch.trackName || '').toLowerCase();
        return (
          batchName.includes(search) ||
          companyName.includes(search) ||
          trackName.includes(search)
        );
      });
    }

    filteredBatches.sort((a, b) => {
      const aComp = this.isBatchCompleted(a) ? 0 : this.isBatchOngoing(a) ? 1 : 2;
      const bComp = this.isBatchCompleted(b) ? 0 : this.isBatchOngoing(b) ? 1 : 2;
      return aComp - bComp;
    });

    this.totalBatchesCount.set(filteredBatches.length);

    const totalPages = Math.ceil(filteredBatches.length / this.pageSize()) || 1;
    if (this.currentPage() > totalPages) {
      this.currentPage.set(totalPages);
    }

    const startIndex = (this.currentPage() - 1) * this.pageSize();
    const paginatedBatches = filteredBatches.slice(
      startIndex,
      startIndex + this.pageSize()
    );

    this.batches.set(paginatedBatches);
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.currentPage.set(1);
    this.applyFilters();
  }

  onTraineeSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.traineeSearchTerm.set(input.value);
  }

  onCompanyFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.companyFilter.set(select.value);
    this.currentPage.set(1);
    this.applyFilters();
  }

  onTrackFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.trackFilter.set(select.value);
    this.currentPage.set(1);
    this.applyFilters();
  }

  onBatchIdFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.batchIdFilter.set(select.value);
    this.currentPage.set(1);
    this.applyFilters();
  }

  onStatusFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.statusFilter.set(select.value);
    this.currentPage.set(1);
    this.applyFilters();
  }

  setQuickStatusFilter(status: string): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return (
      this.companyFilter() !== 'all' ||
      this.trackFilter() !== 'all' ||
      this.batchIdFilter() !== 'all' ||
      this.statusFilter() !== 'all' ||
      this.searchTerm().trim() !== ''
    );
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.companyFilter.set('all');
    this.trackFilter.set('all');
    this.batchIdFilter.set('all');
    this.statusFilter.set('all');
    this.currentPage.set(1);
    this.applyFilters();
  }

  onPageChange(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages()) {
      this.currentPage.set(newPage);
      this.applyFilters();
    }
  }

  isBatchCompleted(batch?: BatchCertificateCardDto | null): boolean {
    if (!batch) return false;
    const st = String(batch.status).toLowerCase().trim();
    const stText = String(batch.statusText || '').trim();
    return (
      st === 'completed' ||
      st === '2' ||
      st === 'مكتملة' ||
      stText === 'مكتملة'
    );
  }

  isBatchOngoing(batch?: BatchCertificateCardDto | null): boolean {
    if (!batch) return false;
    const st = String(batch.status).toLowerCase().trim();
    const stText = String(batch.statusText || '').trim();
    return (
      st === 'ongoing' ||
      st === '1' ||
      st === 'active' ||
      st === 'جارية' ||
      stText === 'جارية'
    );
  }

  onViewTrainees(batch: BatchCertificateCardDto): void {
    if (!this.isBatchCompleted(batch)) {
      const msg = this.isBatchOngoing(batch)
        ? `الدفعة "${batch.batchName}" لا تزال جارية حالياً. لا يمكن إصدار الشهادات إلا بعد اكتمال الدفعة التدريبية.`
        : `الدفعة "${batch.batchName}" لم تبدأ بعد. إصدار الشهادات متاح فقط للدفعات المكتملة.`;

      this.showCertificateMessage(
        'warning',
        'إصدار الشهادات غير متاح لهذه الدفعة',
        msg
      );
      return;
    }

    this.selectedBatch.set(batch);
    this.traineeSearchTerm.set('');
    this.viewMode.set('details');

    const bId = this.cleanId(batch.batchId || batch.id);

    const cached = AdminCertificates.cachedTraineesByBatch.get(bId);
    if (cached && cached.length > 0) {
      this.selectedBatchTrainees.set(cached);
      this.loadingTrainees.set(false);
    } else {
      this.loadingTrainees.set(true);
    }

    this.api.getBatchCertificatesStatus(bId).subscribe({
      next: (res: any) => {
        const rawList = Array.isArray(res) ? res : (res?.items || []);
        const mappedList = this.mapTraineesList(rawList, bId);

        AdminCertificates.cachedTraineesByBatch.set(bId, mappedList);
        this.selectedBatchTrainees.set(mappedList);

        const realTotal = mappedList.length;
        const realIssued = mappedList.filter(t => t.isIssued).length;

        this.selectedBatch.update(b =>
          b ? { ...b, totalTraineesCount: realTotal, issuedCertificatesCount: realIssued } : null
        );

        this.allBatches = this.allBatches.map(b =>
          (b.batchId === bId || b.id === bId)
            ? { ...b, totalTraineesCount: realTotal, issuedCertificatesCount: realIssued }
            : b
        );
        AdminCertificates.cachedBatches = this.allBatches;
        this.populateFilterOptions(this.allBatches);
        this.applyFilters();

        this.loadingTrainees.set(false);
      },
      error: (err) => {
        console.error('Error fetching certificate statuses:', err);
        this.loadingTrainees.set(false);
      }
    });
  }

  private buildModalData(
    trainee: TraineeDto,
    batch?: BatchCertificateCardDto | null
  ): ActiveCertificateModal {
    const bId = this.cleanId(batch?.batchId || batch?.id || 1);
    const hours = this.calculateTrainingHours(batch?.startDate, batch?.endDate);

    return {
      traineeName: trainee.fullName,
      traineeId: trainee.traineeId,
      enrollmentId: trainee.enrollmentId,
      trackName: batch?.trackName || 'البرنامج التدريبي المعتمد',
      companyName: batch?.companyName || 'الشركة المدربة المعتمدة',
      batchName: batch?.batchName || '',
      startDate: batch?.startDate || '2026-01-01',
      endDate: batch?.endDate || '2026-06-30',
      grade: trainee.grade || '92.00%',
      gradeLabel: trainee.gradeLabel || this.getGradeLabel(trainee.grade),
      serialNumber:
        trainee.serialNumber ||
        this.generateSerialNumber(bId, trainee.enrollmentId, trainee.traineeId),
      verificationCode:
        trainee.verificationCode ||
        this.generateVerificationCode(bId, trainee.enrollmentId, trainee.traineeId),
      issueDate: trainee.issueDate || new Date().toISOString().slice(0, 10),
      fileUrl: trainee.fileUrl,
      totalHours: hours.totalHours,
      techHours: hours.techHours,
      practicalHours: hours.practicalHours
    };
  }

  viewSingleCertificate(trainee: TraineeDto): void {
    const batch = this.selectedBatch();
    this.activeCertData.set(this.buildModalData(trainee, batch));
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.activeCertData.set(null);
  }

  // طباعة الشهادة في صفحة واحدة A4 Landscape مضبوطة الأبعاد 100%
  downloadPdf(): void {
    const certEl = document.getElementById('printable-certificate');
    if (!certEl) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>شهادة إتمام تدريب - ${this.activeCertData()?.traineeName || ''}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
  ${styles}
  <style>
    @page {
      size: A4 landscape;
      margin: 6mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100%;
      height: auto;
      background: #ffffff;
      direction: rtl;
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      overflow: hidden;
    }
    #printable-certificate {
      width: 100% !important;
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
      page-break-inside: avoid !important;
      page-break-after: avoid !important;
      break-inside: avoid !important;
    }
    .cert-outer-border {
      padding: 10px !important;
    }
    .cert-inner-gold-border {
      padding: 16px 24px !important;
    }
    .official-cert-header {
      padding-bottom: 10px !important;
    }
    .official-cert-body {
      padding: 10px 6px !important;
    }
    .cert-trainee-full-name {
      margin: 4px 0 8px 0 !important;
      font-size: 24px !important;
    }
    .cert-completion-paragraph {
      margin: 0 auto 10px auto !important;
      line-height: 1.65 !important;
    }
    .cert-curriculum-breakdown {
      padding: 8px 14px !important;
      margin: 0 auto 10px auto !important;
    }
    .cert-scores-strip {
      margin: 0 auto 10px auto !important;
    }
    .official-cert-footer {
      padding-top: 10px !important;
    }
  </style>
</head>
<body>${certEl.outerHTML}</body>
</html>`);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 350);
    }
  }

  issueSingleCertificate(trainee: TraineeDto, autoOpenModal: boolean = true): void {
    const batch = this.selectedBatch();

    if (!this.isBatchCompleted(batch)) {
      this.showCertificateMessage(
        'error',
        'غير مسموح بإصدار الشهادة',
        'لا يمكن إصدار الشهادات إلا للدفعات المكتملة فقط.'
      );
      return;
    }

    const eId = this.cleanId(trainee.enrollmentId);
    if (!eId) {
      this.showCertificateMessage(
        'error',
        'تعذر إصدار الشهادة',
        'لم يتم العثور على رقم التسجيل (Enrollment ID) الخاص بالمتدرب.'
      );
      return;
    }

    const grade =
      trainee.grade != null
        ? Number(String(trainee.grade).replace('%', '').trim())
        : NaN;

    if (isNaN(grade)) {
      this.showCertificateMessage(
        'warning',
        'لا يمكن إصدار الشهادة',
        `لم يتم العثور على درجة مرصودة للمتدرب ${trainee.fullName}.`
      );
      return;
    }

    if (grade < 50) {
      this.showCertificateMessage(
        'error',
        'لا يمكن إصدار الشهادة',
        `درجة ${trainee.fullName} الحالية هي ${grade.toFixed(2)}%، والحد الأدنى للاجتياز وإصدار الشهادة هو 50%.`
      );
      return;
    }

    const payload = {
      enrollmentId: eId,
      type: 0
    };

    this.api.issueCertificate(payload).subscribe({
      next: (res: any) => {
        const certObj = res?.certificate || res;
        const newFileUrl = certObj?.fileUrl || res?.certificateUrl || trainee.fileUrl;

        this.updateTraineeStatusInState(eId, true, newFileUrl);

        if (batch) {
          this.refreshBatchStatus(batch.batchId || batch.id);
        }

        this.showCertificateMessage(
          'success',
          'تم إصدار الشهادة وتوليد السيريال بنجاح',
          `تم إصدار شهادة ${trainee.fullName} برقم تسلسلي (${trainee.serialNumber}).`
        );

        if (autoOpenModal) {
          this.viewSingleCertificate({
            ...trainee,
            isIssued: true,
            fileUrl: newFileUrl
          });
        }
      },
      error: (err) => {
        const message = err?.error?.message || 'حدث خطأ أثناء إصدار الشهادة.';
        this.showCertificateMessage(
          'error',
          'فشل إصدار الشهادة',
          `${trainee.fullName}: ${message}`
        );
      }
    });
  }

  issueAllCertificates(): void {
    const batch = this.selectedBatch();
    if (!this.isBatchCompleted(batch)) {
      this.showCertificateMessage(
        'error',
        'غير مسموح بإصدار الشهادات',
        'إصدار الشهادات متاح فقط للدفعات المكتملة.'
      );
      return;
    }

    const unissued = this.selectedBatchTrainees().filter(t => !this.isCertificateIssued(t));

    if (unissued.length === 0) {
      this.showCertificateMessage(
        'warning',
        'مكتملة بالكامل',
        'جميع الشهادات لمتدربي هذه الدفعة صُدرت بالفعل.'
      );
      return;
    }

    const requests$ = unissued.map(trainee => {
      const payload = {
        enrollmentId: trainee.enrollmentId,
        type: 0
      };
      return this.api.issueCertificate(payload).pipe(
        catchError(err => {
          console.error(`فشل إصدار شهادة ${trainee.fullName}`, err);
          return of(null);
        })
      );
    });

    forkJoin(requests$).subscribe({
      next: () => {
        if (batch) {
          this.reloadTraineesAndBatchStatus(batch.batchId || batch.id);
        }
        this.showCertificateMessage(
          'success',
          'تم إصدار جميع الشهادات بنجاح',
          `تم إصدار وتوثيق الشهادات لـ ${unissued.length} متدربين بأرقامهم التسلسلية.`
        );
      },
      error: () => {
        this.showCertificateMessage(
          'error',
          'حدث خطأ',
          'حدث خطأ أثناء إصدار الشهادات الجماعي.'
        );
      }
    });
  }

  private reloadTraineesAndBatchStatus(batchId: number): void {
    const bId = this.cleanId(batchId);
    this.loadingTrainees.set(true);

    this.api.getBatchCertificatesStatus(bId).subscribe({
      next: (res: any) => {
        const trainees = Array.isArray(res) ? res : (res?.items || []);
        const mappedList = this.mapTraineesList(trainees, bId);

        AdminCertificates.cachedTraineesByBatch.set(bId, mappedList);
        this.selectedBatchTrainees.set(mappedList);

        const totalTrainees = mappedList.length;
        const issuedCertificates = mappedList.filter(t => t.isIssued).length;

        this.selectedBatch.update(batch =>
          batch
            ? {
                ...batch,
                totalTraineesCount: totalTrainees,
                issuedCertificatesCount: issuedCertificates
              }
            : null
        );

        this.allBatches = this.allBatches.map(batch =>
          (batch.batchId === bId || batch.id === bId)
            ? {
                ...batch,
                totalTraineesCount: totalTrainees,
                issuedCertificatesCount: issuedCertificates
              }
            : batch
        );
        AdminCertificates.cachedBatches = this.allBatches;
        this.populateFilterOptions(this.allBatches);
        this.applyFilters();
        this.loadingTrainees.set(false);
      },
      error: () => {
        this.loadingTrainees.set(false);
      }
    });
  }

  private refreshBatchStatus(batchId: number): void {
    const bId = this.cleanId(batchId);

    this.api.getBatchCertificatesStatus(bId).subscribe({
      next: (res: any) => {
        const trainees = Array.isArray(res) ? res : (res?.items || []);
        const mappedList = this.mapTraineesList(trainees, bId);
        AdminCertificates.cachedTraineesByBatch.set(bId, mappedList);

        const totalTrainees = mappedList.length;
        const issuedCertificates = mappedList.filter(t => t.isIssued).length;

        this.selectedBatch.update(batch =>
          batch
            ? {
                ...batch,
                totalTraineesCount: totalTrainees,
                issuedCertificatesCount: issuedCertificates
              }
            : null
        );

        this.allBatches = this.allBatches.map(batch =>
          (batch.batchId === bId || batch.id === bId)
            ? {
                ...batch,
                totalTraineesCount: totalTrainees,
                issuedCertificatesCount: issuedCertificates
              }
            : batch
        );
        AdminCertificates.cachedBatches = this.allBatches;
        this.populateFilterOptions(this.allBatches);
        this.applyFilters();
      }
    });
  }

  private normalizeBatch(raw: any): BatchCertificateCardDto {
    const bId = this.cleanId(raw.batchId ?? raw.id ?? 0);
    return {
      id: bId,
      batchId: bId,
      programId: raw.programId,
      batchName: raw.batchName || `الدفعة ${bId}`,
      companyName: raw.companyName || 'جهة تدريبية معتمدة',
      trackName: raw.trackName || raw.programName || 'مسار تدريبي تخصصي',
      status: raw.status ?? 'Ongoing',
      statusText: this.getArabicStatusText(raw.status),
      issuedCertificatesCount: raw.issuedCertificatesCount ?? 0,
      totalTraineesCount: raw.totalTraineesCount ?? 0,
      startDate: raw.startDate,
      endDate: raw.endDate
    };
  }

  isCertificateIssued(trainee: TraineeDto): boolean {
    return trainee.isIssued;
  }

  getBatchStatusClass(status?: string | number): string {
    const st = String(status).toLowerCase().trim();
    if (st === 'completed' || st === '2' || st === 'مكتملة') {
      return 'completed';
    }
    if (st === 'ongoing' || st === '1' || st === 'active' || st === 'جارية') {
      return 'ongoing';
    }
    return 'not-started';
  }

  private getArabicStatusText(status?: string | number): string {
    const st = String(status).toLowerCase().trim();
    if (st === 'completed' || st === '2' || st === 'مكتملة') {
      return 'مكتملة';
    }
    if (st === 'ongoing' || st === '1' || st === 'active' || st === 'جارية') {
      return 'جارية';
    }
    return 'لم تبدأ';
  }

  private updateTraineeStatusInState(
    enrollmentId: number,
    isIssued: boolean,
    fileUrl?: string
  ): void {
    const today = new Date().toISOString().slice(0, 10);
    this.selectedBatchTrainees.update(list =>
      list.map(t =>
        t.enrollmentId === enrollmentId
          ? {
              ...t,
              isIssued,
              issueDate: today,
              fileUrl: fileUrl || t.fileUrl
            }
          : t
      )
    );
  }

  backToBatches(): void {
    this.viewMode.set('list');
    this.selectedBatch.set(null);
    this.selectedBatchTrainees.set([]);
  }
}