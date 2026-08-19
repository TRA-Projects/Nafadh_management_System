import { Component, OnInit, signal } from '@angular/core';
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
  completionStatus: string | number;
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
  // State Management Signals
  readonly batches = signal<BatchCertificateCardDto[]>([]);
  readonly selectedBatch = signal<BatchCertificateCardDto | null>(null);
  readonly selectedBatchTrainees = signal<TraineeDto[]>([]);
  
  readonly viewMode = signal<'list' | 'details'>('list');
  readonly loading = signal<boolean>(false);
  readonly loadingTrainees = signal<boolean>(false);

  // Modal State Signals
  readonly isModalOpen = signal<boolean>(false);
  readonly activeCertData = signal<ActiveCertificateModal | null>(null);

  constructor(private readonly api: AdminApi) {}

  ngOnInit(): void {
    this.fetchBatches();
  }

  // ==================== Helper: تنظيف الـ ID من الشوائب ====================
  private cleanId(val: any): number {
    if (!val) return 0;
    const str = String(val).split(':')[0].trim();
    const parsed = parseInt(str, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  // ==================== 1. جلب الدفعات وحساب الإحصائيات خفيفة الوزن ====================
  fetchBatches(): void {
    this.loading.set(true);
    this.api.getBatches().subscribe({
      next: (response: any[]) => {
        const rawBatches = response || [];
        if (rawBatches.length === 0) {
          this.batches.set([]);
          this.loading.set(false);
          return;
        }

        const batchRequests$ = rawBatches.map((b: any) => {
          const bId = this.cleanId(b.batchId ?? b.id);
          const normalized = this.normalizeBatch(b);

          return this.api.getTrainees({ batchId: bId } as any).pipe(
            map((res: any) => {
              const trainees = res?.items || (Array.isArray(res) ? res : []);
              
              // حساب الشهادات المصدرة مباشرة من بيانات المتدربين بدلاً من طلبات API فرعية
              const issuedCount = trainees.filter((t: any) => {
                const rawStatus = String(t.completionStatus ?? t.status ?? '').toLowerCase();
                const fileUrl = t.fileUrl || t.certificateUrl || t.pdfUrl;
                return rawStatus === 'issued' || rawStatus === 'completed' || rawStatus === '1' || !!fileUrl;
              }).length;

              return {
                ...normalized,
                totalTraineesCount: trainees.length,
                issuedCertificatesCount: issuedCount
              };
            }),
            catchError(() => of({ ...normalized, totalTraineesCount: 0, issuedCertificatesCount: 0 }))
          );
        });

        forkJoin<BatchCertificateCardDto[]>(batchRequests$).subscribe({
          next: (finalBatches) => {
            this.batches.set(finalBatches);
            this.loading.set(false);
          },
          error: () => {
            this.batches.set(rawBatches.map(b => this.normalizeBatch(b)));
            this.loading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Error fetching batches:', err);
        this.batches.set([]);
        this.loading.set(false);
      }
    });
  }

  // ==================== 2. جلب المتدربين للدفعة المحددة ====================
  onViewTrainees(batch: BatchCertificateCardDto): void {
    this.selectedBatch.set(batch);
    this.viewMode.set('details');
    this.loadingTrainees.set(true);

    const bId = this.cleanId(batch.batchId || batch.id);

    this.api.getTrainees({ batchId: bId } as any).subscribe({
      next: (res: any) => {
        const rawList = res?.items || (Array.isArray(res) ? res : []);

        const mappedList: TraineeDto[] = rawList.map((t: any) => {
          const fileUrl = t.fileUrl || t.certificateUrl || t.pdfUrl || null;
          const rawStatus = String(t.completionStatus ?? t.status ?? '').toLowerCase();
          const isIssued = rawStatus === 'issued' || rawStatus === 'completed' || rawStatus === '1' || !!fileUrl;

          const cleanEId = this.cleanId(t.enrollmentId ?? t.id ?? t.traineeId);
          const cleanTId = this.cleanId(t.traineeId ?? t.id);

          return {
            traineeId: cleanTId,
            enrollmentId: cleanEId,
            fullName: t.fullName || t.traineeName || 'متدرب بدون اسم',
            completionStatus: isIssued ? 'Issued' : 'Pending',
            fileUrl: fileUrl,
            grade: t.grade || '91%'
          };
        });

        this.selectedBatchTrainees.set(mappedList);

        // تحديث إحصائيات الكرت الحالي
        const realTotal = mappedList.length;
        const realIssued = mappedList.filter(t => this.isCertificateIssued(t)).length;

        this.selectedBatch.update(b => b ? {
          ...b,
          totalTraineesCount: realTotal,
          issuedCertificatesCount: realIssued
        } : null);

        this.batches.update(list => 
          list.map(b => (b.batchId === bId || b.id === bId) 
            ? { ...b, totalTraineesCount: realTotal, issuedCertificatesCount: realIssued } 
            : b
          )
        );

        this.loadingTrainees.set(false);
      },
      error: (err) => {
        console.error('Error fetching trainees:', err);
        this.selectedBatchTrainees.set([]);
        this.loadingTrainees.set(false);
      }
    });
  }

  // ==================== 3. معاينة وفتح المودال ====================
  viewSingleCertificate(trainee: TraineeDto): void {
    const batch = this.selectedBatch();
    this.activeCertData.set({
      traineeName: trainee.fullName,
      trackName: batch?.trackName || 'مسار التدريب',
      companyName: batch?.companyName || 'نفاذ',
      batchName: batch?.batchName || '',
      startDate: batch?.startDate || '2025-01-01',
      endDate: batch?.endDate || '2025-04-30',
      grade: trainee.grade || '91%',
      fileUrl: trainee.fileUrl
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
    } else {
      window.print();
    }
  }

// ==================== 4. إصدار الشهادات ====================
  issueSingleCertificate(trainee: TraineeDto, autoOpenModal: boolean = true): void {
    // التأكد من وجود رقم التسجيل الصحيح بدلاً من الاعتماد على قيم fallback قد تكون خاطئة
    const eId = trainee.enrollmentId || trainee.traineeId;

    if (!eId || eId === 0) {
      alert('خطأ: لم يتم العثور على رقم التسجيل (enrollmentId) الخاص بالمتدرب.');
      return;
    }

    const payload = {
      enrollmentId: eId,
      type: 0
    };

    this.api.issueCertificate(payload as any).subscribe({
      next: (res: any) => {
        // استخراج البيانات المرجعة من كائن certificate الداخلي إذا وجد
        const certObj = res?.certificate || res;
        const newFileUrl = certObj?.fileUrl || res?.certificateUrl || trainee.fileUrl;
        
        // تحديث حالة المتدرب وإحصائيات الدفعة في الـ State
        this.updateTraineeStatusInState(trainee.traineeId, 'Issued', newFileUrl);
        this.incrementBatchIssuedCount();

        // فتح مودال المعاينة فقط في حال الإصدار الفردي لتجنب تضارب المودالات عند الإصدار الجماعي
        if (autoOpenModal) {
          this.viewSingleCertificate({ 
            ...trainee, 
            completionStatus: 'Issued', 
            fileUrl: newFileUrl 
          });
        }
      },
      error: (err) => {
        console.error(`فشل إصدار الشهادة للمتدرب ID: ${trainee.traineeId}`, err);
        alert(`حدث خطأ أثناء إصدار الشهادة للمتدرب (${trainee.fullName}).`);
      }
    });
  }

  issueAllCertificates(): void {
    const unissued = this.selectedBatchTrainees().filter(t => !this.isCertificateIssued(t));
    
    if (unissued.length === 0) {
      alert('جميع الشهادات لهذه الدفعة صُدرت بالفعل.');
      return;
    }

    if (confirm(`هل ترغب بإصدار الشهادات لـ ${unissued.length} متدربين؟`)) {
      // تمرير false كـ autoOpenModal لتجنب فتح المودال لكل متدرب في الحلقة التكرارية
      unissued.forEach(t => this.issueSingleCertificate(t, false));
    }
  }
  // ==================== Helper Methods ====================
  private normalizeBatch(raw: any): BatchCertificateCardDto {
    const bId = this.cleanId(raw.batchId ?? raw.id ?? 0);
    return {
      id: bId,
      batchId: bId,
      programId: raw.programId,
      batchName: raw.batchName || `الدفعة ${bId}`,
      companyName: raw.companyName || 'جهة غير محددة',
      trackName: raw.trackName || 'مسار عام',
      status: raw.status ?? 'Ongoing',
      statusText: this.getArabicStatusText(raw.status),
      issuedCertificatesCount: raw.issuedCertificatesCount ?? 0,
      totalTraineesCount: raw.totalTraineesCount ?? 0,
      startDate: raw.startDate,
      endDate: raw.endDate
    };
  }

  isCertificateIssued(trainee: TraineeDto): boolean {
    const st = String(trainee.completionStatus).toLowerCase();
    return st === 'issued' || st === '1' || st === 'completed' || !!trainee.fileUrl;
  }

  getBatchStatusClass(status?: string | number): string {
    const st = String(status).toLowerCase();
    return (st === 'ongoing' || st === '1' || st === 'active') ? 'ongoing' : 'not-started';
  }

  private getArabicStatusText(status?: string | number): string {
    const st = String(status).toLowerCase();
    if (st === 'ongoing' || st === '1' || st === 'active') return 'جارية';
    if (st === 'completed' || st === '2') return 'مكتملة';
    return 'لم تبدأ';
  }

  private updateTraineeStatusInState(traineeId: number, status: string, fileUrl?: string): void {
    this.selectedBatchTrainees.update(list =>
      list.map(t => (t.traineeId === traineeId || t.enrollmentId === traineeId)
        ? { ...t, completionStatus: status, fileUrl: fileUrl || t.fileUrl } 
        : t
      )
    );
  }

  private incrementBatchIssuedCount(): void {
    const activeBatch = this.selectedBatch();
    if (!activeBatch) return;

    const updatedIssued = activeBatch.issuedCertificatesCount + 1;

    this.selectedBatch.set({
      ...activeBatch,
      issuedCertificatesCount: updatedIssued
    });

    this.batches.update(list =>
      list.map(b => (b.batchId === activeBatch.batchId || b.id === activeBatch.id)
        ? { ...b, issuedCertificatesCount: updatedIssued }
        : b
      )
    );
  }

  backToBatches(): void {
    this.viewMode.set('list');
    this.selectedBatch.set(null);
    this.selectedBatchTrainees.set([]);
  }
}