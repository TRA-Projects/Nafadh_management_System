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
}

export interface ActiveCertificateModal {
  traineeName: string;
  trackName: string;
  companyName: string;
  batchName: string;
  startDate?: string | Date;
  endDate?: string | Date;
  grade?: string;
  fileUrl?: string;
}

@Component({
  selector: 'app-admin-certificates',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './certificates.html',
  styleUrls: ['./certificates.css']
})
export class AdminCertificates implements OnInit {

  // ==================== State ====================

  readonly batches = signal<BatchCertificateCardDto[]>([]);
  readonly selectedBatch = signal<BatchCertificateCardDto | null>(null);
  readonly selectedBatchTrainees = signal<TraineeDto[]>([]);

  readonly viewMode = signal<'list' | 'details'>('list');

  readonly loading = signal<boolean>(false);
  readonly loadingTrainees = signal<boolean>(false);

  // ==================== Modal ====================

  readonly isModalOpen = signal<boolean>(false);
  readonly activeCertData =
    signal<ActiveCertificateModal | null>(null);

  // ==================== Pagination ====================

  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(8);
  readonly totalBatchesCount = signal<number>(0);

  readonly totalPages = computed(() =>
    Math.ceil(
      this.totalBatchesCount() / this.pageSize()
    ) || 1
  );

  // ==================== Search & Filter ====================

  readonly searchTerm = signal<string>('');
  readonly statusFilter = signal<string>('all');

  private allBatches: BatchCertificateCardDto[] = [];

  constructor(
    private readonly api: AdminApi
  ) {}

  ngOnInit(): void {
    this.fetchBatches();
  }

  // ==================== Helper ====================

  private cleanId(val: any): number {
    if (!val) {
      return 0;
    }

    const str = String(val)
      .split(':')[0]
      .trim();

    const parsed = parseInt(str, 10);

    return isNaN(parsed) ? 0 : parsed;
  }

  // ============================================================
  // 1. GET BATCHES
  // ============================================================

  fetchBatches(): void {

    this.loading.set(true);

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

        const normalizedBatches =
          rawBatches.map(
            (b: any) => this.normalizeBatch(b)
          );

        // جلب الحالة الحقيقية للشهادات لكل دفعة
        const batchRequests$ =
          normalizedBatches.map(
            (normalized: BatchCertificateCardDto) => {

              const bId = this.cleanId(
                normalized.batchId ??
                normalized.id
              );

              return this.api
                .getBatchCertificatesStatus(bId)
                .pipe(

                  map((res: any) => {

                    const trainees =
                      Array.isArray(res)
                        ? res
                        : (res?.items || []);

                    const issuedCount =
                      trainees.filter(
                        (t: any) => !!t.isIssued
                      ).length;

                    return {
                      ...normalized,

                      // العدد الحقيقي من API
                      totalTraineesCount:
                        trainees.length,

                      // العدد الحقيقي للشهادات
                      issuedCertificatesCount:
                        issuedCount
                    };

                  }),

                  catchError((err) => {

                    console.error(
                      `Error fetching certificate status for batch ${bId}:`,
                      err
                    );

                    return of({
                      ...normalized,
                      totalTraineesCount: 0,
                      issuedCertificatesCount: 0
                    });

                  })
                );
            }
          );

        forkJoin<BatchCertificateCardDto[]>(
          batchRequests$
        ).subscribe({

          next: (finalBatches) => {

            // المصدر الأساسي
            this.allBatches = finalBatches;

            this.applyFilters();

            this.loading.set(false);
          },

          error: (err) => {

            console.error(
              'Error loading batch certificate statuses:',
              err
            );

            this.allBatches = normalizedBatches;

            this.applyFilters();

            this.loading.set(false);
          }

        });

      },

      error: (err) => {

        console.error(
          'Error fetching batches:',
          err
        );

        this.allBatches = [];
        this.batches.set([]);
        this.totalBatchesCount.set(0);

        this.loading.set(false);
      }

    });
  }

  // ============================================================
  // 2. SEARCH + FILTER + PAGINATION
  // ============================================================

  private applyFilters(): void {

    const search =
      this.searchTerm()
        .trim()
        .toLowerCase();

    const selectedStatus =
      this.statusFilter();

    let filteredBatches =
      [...this.allBatches];

    // ================= SEARCH =================

    if (search) {

      filteredBatches =
        filteredBatches.filter(batch => {

          const batchName =
            (batch.batchName || '')
              .toLowerCase();

          const companyName =
            (batch.companyName || '')
              .toLowerCase();

          const trackName =
            (batch.trackName || '')
              .toLowerCase();

          return (
            batchName.includes(search) ||
            companyName.includes(search) ||
            trackName.includes(search)
          );
        });
    }

    // ================= FILTER =================

    if (selectedStatus !== 'all') {

      filteredBatches =
        filteredBatches.filter(batch => {

          const status =
            String(batch.status)
              .toLowerCase();

          if (selectedStatus === 'ongoing') {

            return (
              status === 'ongoing' ||
              status === '1' ||
              status === 'active'
            );
          }

          if (selectedStatus === 'completed') {

            return (
              status === 'completed' ||
              status === '2'
            );
          }

          if (selectedStatus === 'not-started') {

            return (
              status !== 'ongoing' &&
              status !== '1' &&
              status !== 'active' &&
              status !== 'completed' &&
              status !== '2'
            );
          }

          return true;
        });
    }

    // ================= TOTAL =================

    this.totalBatchesCount.set(
      filteredBatches.length
    );

    // ================= PAGINATION =================

    const totalPages =
      Math.ceil(
        filteredBatches.length /
        this.pageSize()
      ) || 1;

    if (this.currentPage() > totalPages) {
      this.currentPage.set(totalPages);
    }

    const startIndex =
      (this.currentPage() - 1) *
      this.pageSize();

    const paginatedBatches =
      filteredBatches.slice(
        startIndex,
        startIndex + this.pageSize()
      );

    this.batches.set(
      paginatedBatches
    );
  }

  // ============================================================
  // SEARCH
  // ============================================================

  onSearch(event: Event): void {

    const input =
      event.target as HTMLInputElement;

    this.searchTerm.set(
      input.value
    );

    this.currentPage.set(1);

    this.applyFilters();
  }

  // ============================================================
  // STATUS FILTER
  // ============================================================

  onStatusFilterChange(event: Event): void {

    const select =
      event.target as HTMLSelectElement;

    this.statusFilter.set(
      select.value
    );

    this.currentPage.set(1);

    this.applyFilters();
  }

  // ============================================================
  // RESET
  // ============================================================

  resetFilters(): void {

    this.searchTerm.set('');
    this.statusFilter.set('all');

    this.currentPage.set(1);

    this.applyFilters();
  }

  // ============================================================
  // PAGINATION
  // ============================================================

  onPageChange(newPage: number): void {

    if (
      newPage >= 1 &&
      newPage <= this.totalPages()
    ) {

      this.currentPage.set(
        newPage
      );

      this.applyFilters();
    }
  }

  // ============================================================
  // 3. VIEW TRAINEES
  // ============================================================

  onViewTrainees(
    batch: BatchCertificateCardDto
  ): void {

    this.selectedBatch.set(batch);

    this.viewMode.set('details');

    this.loadingTrainees.set(true);

    const bId =
      this.cleanId(
        batch.batchId || batch.id
      );

    this.api
      .getBatchCertificatesStatus(bId)
      .subscribe({

        next: (res: any) => {

          console.log(
            '🔥 RESPONSE FROM API:',
            res
          );

          const rawList =
            Array.isArray(res)
              ? res
              : (res?.items || []);

          const mappedList:
            TraineeDto[] =
            rawList.map((t: any) => {

              const cleanEId =
                this.cleanId(
                  t.enrollmentId
                );

              const cleanTId =
                this.cleanId(
                  t.traineeId
                );

              return {

                traineeId: cleanTId,

                enrollmentId: cleanEId,

                fullName:
                  t.fullName ||
                  'متدرب بدون اسم',

                isIssued:
                  !!t.isIssued,

                fileUrl:
                  t.fileUrl ||
                  undefined,

                grade:
                  t.grade != null
                    ? `${Number(t.grade).toFixed(2)}%`
                    : undefined
              };

            });

          this.selectedBatchTrainees.set(
            mappedList
          );

          const realTotal =
            mappedList.length;

          const realIssued =
            mappedList.filter(
              t => t.isIssued
            ).length;

          // تحديث الدفعة المحددة
          this.selectedBatch.update(
            b => b
              ? {
                  ...b,
                  totalTraineesCount:
                    realTotal,
                  issuedCertificatesCount:
                    realIssued
                }
              : null
          );

          // تحديث القائمة
          this.batches.update(
            list =>
              list.map(b =>
                (
                  b.batchId === bId ||
                  b.id === bId
                )
                  ? {
                      ...b,
                      totalTraineesCount:
                        realTotal,
                      issuedCertificatesCount:
                        realIssued
                    }
                  : b
              )
          );

          // تحديث المصدر الأساسي
          this.allBatches =
            this.allBatches.map(b =>
              (
                b.batchId === bId ||
                b.id === bId
              )
                ? {
                    ...b,
                    totalTraineesCount:
                      realTotal,
                    issuedCertificatesCount:
                      realIssued
                  }
                : b
            );

          this.loadingTrainees.set(false);
        },

        error: (err) => {

          console.error(
            'Error fetching certificate statuses:',
            err
          );

          this.selectedBatchTrainees.set([]);

          this.loadingTrainees.set(false);
        }

      });
  }

  // ============================================================
  // 4. VIEW CERTIFICATE
  // ============================================================

  viewSingleCertificate(
    trainee: TraineeDto
  ): void {

    const batch =
      this.selectedBatch();

    this.activeCertData.set({

      traineeName:
        trainee.fullName,

      trackName:
        batch?.trackName ||
        'مسار التدريب',

      companyName:
        batch?.companyName ||
        'نفاذ',

      batchName:
        batch?.batchName ||
        '',

      startDate:
        batch?.startDate ||
        '2025-01-01',

      endDate:
        batch?.endDate ||
        '2025-04-30',

      grade:
        trainee.grade,

      fileUrl:
        trainee.fileUrl

    });

    this.isModalOpen.set(true);
  }

  closeModal(): void {

    this.isModalOpen.set(false);

    this.activeCertData.set(null);
  }

  downloadPdf(): void {
  const cert = this.activeCertData();

  if (cert?.fileUrl) {
    window.open(cert.fileUrl, '_blank');
    return;
  }

  window.print();
}

  // ============================================================
  // 5. ISSUE SINGLE CERTIFICATE
  // ============================================================

  issueSingleCertificate(
    trainee: TraineeDto,
    autoOpenModal: boolean = true
  ): void {

    const eId =
      this.cleanId(
        trainee.enrollmentId
      );

    if (!eId) {

      alert(
        'خطأ: لم يتم العثور على رقم التسجيل (enrollmentId) الخاص بالمتدرب.'
      );

      return;
    }

    const payload = {

      enrollmentId: eId,

      type: 0
    };

    console.log(
      '📤 Sending certificate payload:',
      payload
    );

    this.api
      .issueCertificate(payload)
      .subscribe({

        next: (res: any) => {

          console.log(
            '✅ Certificate POST response:',
            res
          );

          const certObj =
            res?.certificate ||
            res;

          const newFileUrl =
            certObj?.fileUrl ||
            res?.certificateUrl ||
            trainee.fileUrl;

          // تحديث المتدرب محليًا
          this.updateTraineeStatusInState(
            eId,
            true,
            newFileUrl
          );

          // 🔥 أهم شيء:
          // لا نحسب العدد يدويًا.
          // نقرأ العدد الحقيقي من قاعدة البيانات.
          const batch =
            this.selectedBatch();

          if (batch) {

            this.refreshBatchStatus(
              batch.batchId ||
              batch.id
            );
          }

          if (autoOpenModal) {

            this.viewSingleCertificate({

              ...trainee,

              isIssued: true,

              fileUrl:
                newFileUrl
            });
          }
        },

        error: (err) => {

          console.error(
            '❌ فشل إصدار الشهادة:',
            err
          );

          console.error(
            '❌ Error body:',
            err?.error
          );

          alert(
            `حدث خطأ أثناء إصدار الشهادة للمتدرب (${trainee.fullName}).`
          );
        }

      });
  }

  // ============================================================
  // 6. ISSUE ALL
  // ============================================================

  issueAllCertificates(): void {

    const unissued =
      this.selectedBatchTrainees()
        .filter(
          t => !this.isCertificateIssued(t)
        );

    if (unissued.length === 0) {

      alert(
        'جميع الشهادات لهذه الدفعة صُدرت بالفعل.'
      );

      return;
    }

    if (
      !confirm(
        `هل ترغب بإصدار الشهادات لـ ${unissued.length} متدربين؟`
      )
    ) {
      return;
    }

    const requests$ =
      unissued.map(trainee => {

        const payload = {

          enrollmentId:
            trainee.enrollmentId,

          type: 0
        };

        return this.api
          .issueCertificate(payload)
          .pipe(

            catchError(err => {

              console.error(
                `❌ فشل إصدار شهادة ${trainee.fullName}`,
                err
              );

              return of(null);
            })
          );
      });

    // ننتظر انتهاء كل عمليات الإصدار
    forkJoin(requests$)
      .subscribe({

        next: () => {

          console.log(
            '✅ Finished issuing all certificates'
          );

          // تحديث المتدربين من قاعدة البيانات
          const batch =
            this.selectedBatch();

          if (batch) {

            this.reloadTraineesAndBatchStatus(
              batch.batchId ||
              batch.id
            );
          }
        },

        error: (err) => {

          console.error(
            '❌ Error issuing certificates:',
            err
          );

        }

      });
  }

  // ============================================================
  // 7. RELOAD TRAINEES + BATCH STATUS
  // ============================================================

  private reloadTraineesAndBatchStatus(
    batchId: number
  ): void {

    const bId =
      this.cleanId(batchId);

    this.loadingTrainees.set(true);

    this.api
      .getBatchCertificatesStatus(bId)
      .subscribe({

        next: (res: any) => {

          console.log(
            '🔄 Reloaded batch status:',
            res
          );

          const trainees =
            Array.isArray(res)
              ? res
              : (res?.items || []);

          const mappedList:
            TraineeDto[] =
            trainees.map((t: any) => ({

              traineeId:
                this.cleanId(
                  t.traineeId
                ),

              enrollmentId:
                this.cleanId(
                  t.enrollmentId
                ),

              fullName:
                t.fullName ||
                'متدرب بدون اسم',

              isIssued:
                !!t.isIssued,

              fileUrl:
                t.fileUrl ||
                undefined,

              grade:
                t.grade != null
                  ? `${Number(t.grade).toFixed(2)}%`
                  : undefined
            }));

          this.selectedBatchTrainees.set(
            mappedList
          );

          const totalTrainees =
            mappedList.length;

          const issuedCertificates =
            mappedList.filter(
              t => t.isIssued
            ).length;

          // تحديث selectedBatch
          this.selectedBatch.update(
            batch => batch
              ? {
                  ...batch,
                  totalTraineesCount:
                    totalTrainees,
                  issuedCertificatesCount:
                    issuedCertificates
                }
              : null
          );

          // تحديث allBatches
          this.allBatches =
            this.allBatches.map(batch =>
              (
                batch.batchId === bId ||
                batch.id === bId
              )
                ? {
                    ...batch,
                    totalTraineesCount:
                      totalTrainees,
                    issuedCertificatesCount:
                      issuedCertificates
                  }
                : batch
            );

          // إعادة تطبيق البحث والفلترة
          this.applyFilters();

          this.loadingTrainees.set(false);
        },

        error: (err) => {

          console.error(
            '❌ Failed to reload batch status:',
            err
          );

          this.loadingTrainees.set(false);
        }

      });
  }

  // ============================================================
  // 8. REFRESH BATCH STATUS
  // ============================================================

  private refreshBatchStatus(
    batchId: number
  ): void {

    const bId =
      this.cleanId(batchId);

    this.api
      .getBatchCertificatesStatus(bId)
      .subscribe({

        next: (res: any) => {

          console.log(
            '🔄 Refreshed batch status:',
            res
          );

          const trainees =
            Array.isArray(res)
              ? res
              : (res?.items || []);

          const totalTrainees =
            trainees.length;

          const issuedCertificates =
            trainees.filter(
              (t: any) => !!t.isIssued
            ).length;

          // selectedBatch
          this.selectedBatch.update(
            batch => batch
              ? {
                  ...batch,
                  totalTraineesCount:
                    totalTrainees,
                  issuedCertificatesCount:
                    issuedCertificates
                }
              : null
          );

          // allBatches
          this.allBatches =
            this.allBatches.map(batch =>
              (
                batch.batchId === bId ||
                batch.id === bId
              )
                ? {
                    ...batch,
                    totalTraineesCount:
                      totalTrainees,
                    issuedCertificatesCount:
                      issuedCertificates
                  }
                : batch
            );

          // القائمة الظاهرة
          this.applyFilters();
        },

        error: (err) => {

          console.error(
            '❌ Failed to refresh batch status:',
            err
          );
        }

      });
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private normalizeBatch(
    raw: any
  ): BatchCertificateCardDto {

    const bId =
      this.cleanId(
        raw.batchId ??
        raw.id ??
        0
      );

    return {

      id: bId,

      batchId: bId,

      programId:
        raw.programId,

      batchName:
        raw.batchName ||
        `الدفعة ${bId}`,

      companyName:
        raw.companyName ||
        'جهة غير محددة',

      trackName:
        raw.trackName ||
        'مسار عام',

      status:
        raw.status ??
        'Ongoing',

      statusText:
        this.getArabicStatusText(
          raw.status
        ),

      issuedCertificatesCount:
        raw.issuedCertificatesCount ??
        0,

      totalTraineesCount:
        raw.totalTraineesCount ??
        0,

      startDate:
        raw.startDate,

      endDate:
        raw.endDate
    };
  }

  isCertificateIssued(
    trainee: TraineeDto
  ): boolean {

    return trainee.isIssued;
  }

  getBatchStatusClass(
    status?: string | number
  ): string {

    const st =
      String(status)
        .toLowerCase();

    return (
      st === 'ongoing' ||
      st === '1' ||
      st === 'active'
    )
      ? 'ongoing'
      : 'not-started';
  }

  private getArabicStatusText(
    status?: string | number
  ): string {

    const st =
      String(status)
        .toLowerCase();

    if (
      st === 'ongoing' ||
      st === '1' ||
      st === 'active'
    ) {
      return 'جارية';
    }

    if (
      st === 'completed' ||
      st === '2'
    ) {
      return 'مكتملة';
    }

    return 'لم تبدأ';
  }

  private updateTraineeStatusInState(
    enrollmentId: number,
    isIssued: boolean,
    fileUrl?: string
  ): void {

    this.selectedBatchTrainees.update(
      list =>
        list.map(t =>
          t.enrollmentId === enrollmentId
            ? {
                ...t,
                isIssued,
                fileUrl:
                  fileUrl ||
                  t.fileUrl
              }
            : t
        )
    );
  }

  // ============================================================
  // BACK
  // ============================================================

  backToBatches(): void {

    this.viewMode.set('list');

    this.selectedBatch.set(null);

    this.selectedBatchTrainees.set([]);
  }
}