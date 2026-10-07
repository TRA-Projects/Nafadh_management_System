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

  // ==================== State ====================

  readonly batches = signal<BatchCertificateCardDto[]>([]);
  readonly selectedBatch = signal<BatchCertificateCardDto | null>(null);
  readonly selectedBatchTrainees = signal<TraineeDto[]>([]);

  readonly viewMode = signal<'list' | 'details'>('list');

  readonly loading = signal<boolean>(false);
  readonly loadingTrainees = signal<boolean>(false);

  // ==================== Smart Filter Options ====================

  readonly companiesList = signal<string[]>([]);
  readonly tracksList = signal<string[]>([]);
  readonly allBatchesList = signal<BatchCertificateCardDto[]>([]);

  readonly companyFilter = signal<string>('all');
  readonly trackFilter = signal<string>('all');
  readonly batchIdFilter = signal<string>('all');
  readonly statusFilter = signal<string>('all');
  readonly searchTerm = signal<string>('');
  readonly traineeSearchTerm = signal<string>('');

  // ==================== KPI Counters ====================

  readonly completedBatchesCount = signal<number>(0);
  readonly ongoingBatchesCount = signal<number>(0);
  readonly notStartedBatchesCount = signal<number>(0);
  readonly totalIssuedCertificatesCount = signal<number>(0);

  // ==================== Verification Checker ====================

  readonly verifyQuery = signal<string>('');
  readonly verifyResult = signal<{
    checked: boolean;
    found: boolean;
    certData?: ActiveCertificateModal;
  }>({ checked: false, found: false });

  readonly copiedText = signal<string | null>(null);

  // ==================== Certificate Message ====================

  readonly certificateMessage = signal<CertificateMessage | null>(null);
  private messageTimeout: ReturnType<typeof setTimeout> | null = null;

  // ==================== Modal ====================

  readonly isModalOpen = signal<boolean>(false);
  readonly activeCertData = signal<ActiveCertificateModal | null>(null);

  // ==================== Pagination ====================

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

  // ============================================================
  // CERTIFICATE MESSAGE
  // ============================================================

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

  // ============================================================
  // SERIAL NUMBER & VERIFICATION CODE GENERATORS
  // ============================================================

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

  // ============================================================
  // VERIFY CERTIFICATE AUTHENTICITY BY SERIAL OR CODE
  // ============================================================

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

  // ============================================================
  // 1. GET BATCHES (ZERO-LATENCY INSTANT LOADING)
  // ============================================================

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

  // ============================================================
  // 2. SMART FILTERS + SEARCH + PAGINATION
  // ============================================================

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

  // ============================================================
  // 3. VIEW TRAINEES (COMPLETED BATCHES ONLY RULE)
  // ============================================================

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
        'إصدار الشهادات غير متاح لهذه الدفعة 🔒',
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

  // ============================================================
  // 4. VIEW & PRINT OFFICIAL SINGLE-PAGE A4 CERTIFICATE
  // ============================================================

  private buildModalData(
    trainee: TraineeDto,
    batch?: BatchCertificateCardDto | null
  ): ActiveCertificateModal {
    const bId = this.cleanId(batch?.batchId || batch?.id || 1);
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
      fileUrl: trainee.fileUrl
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

  private formatDateAr(d?: string | Date): string {
    if (!d) return '';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return String(d);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  }

  downloadPdf(): void {
    const cert = this.activeCertData();
    if (!cert) return;

    // طباعة الشهادة وحدها في إطار مخفي بحجم A4 بالعرض (صفحة واحدة فقط بدون أي عناصر خارجية)
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const startStr = this.formatDateAr(cert.startDate);
    const endStr = this.formatDateAr(cert.endDate);
    const issueStr = this.formatDateAr(cert.issueDate);

    const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>شهادة إتمام تدريب - ${cert.traineeName}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #ffffff;
      direction: rtl;
    }
    .cert-page-wrap {
      width: 100%;
      padding: 6px;
      page-break-inside: avoid;
      page-break-after: avoid;
    }
    .cert-outer {
      border: 6px double #0A1172;
      border-radius: 14px;
      padding: 16px;
      background: linear-gradient(135deg, #ffffff 0%, #f8faff 100%);
    }
    .cert-inner {
      border: 2px solid #c59b27;
      border-radius: 10px;
      padding: 24px 32px;
      position: relative;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .emblem {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #0A1172;
      border: 2px solid #c59b27;
      color: #ffffff;
      font-size: 22px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-title {
      font-size: 16px;
      font-weight: 800;
      color: #0A1172;
    }
    .brand-sub {
      font-size: 11.5px;
      color: #64748b;
    }
    .crest {
      text-align: center;
    }
    .medal {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #fef3c7;
      border: 2px solid #c59b27;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    .crest-lbl {
      display: block;
      font-size: 11px;
      font-weight: 800;
      color: #92400e;
      margin-top: 4px;
    }
    .serial-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 8px 14px;
      font-size: 11.5px;
      line-height: 1.7;
    }
    .serial-line {
      display: flex;
      justify-content: space-between;
      gap: 10px;
    }
    .s-val {
      font-family: monospace;
      font-weight: 800;
      color: #0A1172;
    }
    .s-code {
      font-family: monospace;
      font-weight: 800;
      color: #059669;
    }
    .body {
      text-align: center;
      padding: 20px 10px;
    }
    .banner {
      display: inline-block;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #0A1172;
      padding: 5px 20px;
      border-radius: 30px;
      font-size: 13px;
      font-weight: 800;
      margin-bottom: 12px;
    }
    .witness {
      font-size: 14.5px;
      color: #475569;
      margin: 0 0 8px 0;
    }
    .trainee-name {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      margin: 6px 0 14px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #c59b27;
      display: inline-block;
      min-width: 45%;
    }
    .desc {
      font-size: 15px;
      line-height: 1.85;
      color: #334155;
      max-width: 720px;
      margin: 0 auto 18px auto;
    }
    .scores-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      max-width: 680px;
      margin: 0 auto;
    }
    .score-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px;
    }
    .score-card.highlight {
      background: #ecfdf5;
      border-color: #a7f3d0;
    }
    .sc-lbl {
      display: block;
      font-size: 11px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .sc-val {
      font-size: 15px;
      font-weight: 800;
      color: #0A1172;
    }
    .footer {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 18px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
    }
    .sig {
      text-align: right;
      line-height: 1.6;
    }
    .sig-lbl { font-size: 11.5px; color: #64748b; font-weight: 700; display: block; }
    .sig-comp { font-size: 14px; color: #0f172a; font-weight: 800; display: block; }
    .sig-ok { font-size: 11.5px; color: #0A1172; font-weight: 700; display: block; }
    .stamp {
      width: 110px;
      height: 110px;
      border-radius: 50%;
      border: 4px double #0A1172;
      background: rgba(10, 17, 114, 0.03);
      color: #0A1172;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 8px;
      transform: rotate(-7deg);
      text-align: center;
    }
    .st-top { font-size: 9px; font-weight: 800; }
    .st-line { width: 65%; height: 1px; background: rgba(10,17,114,0.3); margin: 3px 0; }
    .st-comp { font-size: 10px; font-weight: 800; line-height: 1.2; }
    .st-date { font-size: 9px; color: #0d9488; font-weight: 800; margin-top: 2px; }
    .st-ver { font-size: 8px; color: #64748b; font-weight: 700; }
    .qr-box {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
    }
    .qr-text {
      text-align: right;
      font-size: 10.5px;
      line-height: 1.5;
    }
    .qr-title { font-weight: 800; color: #059669; }
    .qr-mono { font-family: monospace; color: #1e293b; }
    .qr-svg {
      width: 54px;
      height: 54px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 4px;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <div class="cert-page-wrap">
    <div class="cert-outer">
      <div class="cert-inner">
        <div class="header">
          <div class="brand">
            <div class="emblem">ن</div>
            <div>
              <div class="brand-title">منظومة نفاذ الوطنية للتدريب</div>
              <div class="brand-sub">هيئة تنظيم الاتصالات · سلطنة عُمان</div>
            </div>
          </div>
          <div class="crest">
            <div class="medal">🏅</div>
            <span class="crest-lbl">شهادة إتمام تدريب معتمدة</span>
          </div>
          <div class="serial-box">
            <div class="serial-line">
              <span>الرقم التسلسلي (Serial No):</span>
              <span class="s-val">${cert.serialNumber}</span>
            </div>
            <div class="serial-line">
              <span>كود التحقق (Verify Code):</span>
              <span class="s-code">${cert.verificationCode}</span>
            </div>
          </div>
        </div>

        <div class="body">
          <div class="banner">شهادة إتمام البرنامج التدريبي التخصصي</div>
          <p class="witness">
            تشهد <strong>منظومة نفاذ للتدريب</strong> بالشراكة مع الشركة المدربة
            <strong style="color:#0d9488">${cert.companyName}</strong> بأن المتدرب / المتدربة:
          </p>
          <div class="trainee-name">${cert.traineeName}</div>
          <p class="desc">
            قد أتمّ بنجاح كافة متطلبات الساعات التدريبية والمشاريع العملية المقررة في برنامج
            <strong style="color:#0A1172">«${cert.trackName}»</strong>
            ضمن <strong>(${cert.batchName})</strong>، والمنعقد خلال الفترة من
            <strong>${startStr}</strong> إلى <strong>${endStr}</strong>.
          </p>

          <div class="scores-grid">
            <div class="score-card">
              <span class="sc-lbl">الدرجة النهائية المكتسبة</span>
              <span class="sc-val">${cert.grade || '90.00%'}</span>
            </div>
            <div class="score-card highlight">
              <span class="sc-lbl">التقدير العام</span>
              <span class="sc-val" style="color:#059669">${cert.gradeLabel}</span>
            </div>
            <div class="score-card">
              <span class="sc-lbl">الجهة المدربة المعتمدة</span>
              <span class="sc-val" style="color:#0d9488">${cert.companyName}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <div class="sig">
            <span class="sig-lbl">اعتماد الجهة المدربة المستضيفة</span>
            <span class="sig-comp">${cert.companyName}</span>
            <span class="sig-ok">✓ تم الاعتماد والتوقيع الإلكتروني</span>
          </div>

          <div class="stamp">
            <span class="st-top">ختم رسمي معتمد</span>
            <div class="st-line"></div>
            <span class="st-comp">${cert.companyName}</span>
            <span class="st-date">${issueStr}</span>
            <span class="st-ver">VERIFIED SEAL</span>
          </div>

          <div class="qr-box">
            <div class="qr-text">
              <div class="qr-title">🛡️ شهادة موثقة وقابلة للتحقق</div>
              <div class="qr-mono">SN: <strong>${cert.serialNumber}</strong></div>
              <div class="qr-mono">Code: <strong>${cert.verificationCode}</strong></div>
              <div style="color:#64748b;font-size:10px">تاريخ الإصدار: ${issueStr}</div>
            </div>
            <div class="qr-svg">
              <svg viewBox="0 0 36 36" style="width:100%;height:100%;fill:#0A1172">
                <path d="M2 2h10v10H2V2zm2 2v6h6V4H4zm2 2h2v2H6V6zm18-4h10v10H24V2zm2 2v6h6V4h-6zm2 2h2v2h-2V6zM2 24h10v10H2V24zm2 2v6h6v-6H4zm2 2h2v2H6v-2zm10-24h2v4h-2V4zm4 2h2v4h-2V6zm-4 6h4v2h-4v-2zm6 2h2v4h-2v-4zm-8 4h2v4h-2v-4zm4 2h4v4h-4v-4zm10-2h4v2h-4v-2zm-16 2h2v2H10v-2zm-8 4h4v2H2v-2zm6 0h4v2H8v-2zm8 2h2v6h-2v-6zm6-2h4v4h-4v-4zm6 2h4v4h-4v-4zm-8 6h6v4h-6v-4zm8 2h4v2h-4v-2z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 250);
    }
  }

  // ============================================================
  // 5. ISSUE SINGLE CERTIFICATE
  // ============================================================

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

  // ============================================================
  // 6. ISSUE ALL CERTIFICATES IN COMPLETED BATCH
  // ============================================================

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

  // ============================================================
  // 7. RELOAD & REFRESH HELPERS
  // ============================================================

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