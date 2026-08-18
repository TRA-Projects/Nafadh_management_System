import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApi } from '../../services/admin-api';

export interface BatchCertificateCardDto {
  id: number;
  batchName: string;
  companyName: string;
  trackName: string;
  status: string;
  statusText?: string;
  issuedCertificatesCount: number;
  totalTraineesCount: number;
  startDate: string | Date;
  endDate: string | Date;
}

export interface TraineeDto {
  traineeId: number;
  fullName: string;
  completionStatus?: number | string;
}

@Component({
  selector: 'app-admin-certificates',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './certificates.html',
  styleUrls: ['./certificates.css']
})
export class AdminCertificates implements OnInit {
  batches = signal<BatchCertificateCardDto[]>([]);

  // حالة التحكم بالعرض: 'list' لعرض بطاقات الدفعات، 'details' لعرض صفحة المتدربين الكاملة
  viewMode = signal<'list' | 'details'>('list');
  selectedBatch = signal<BatchCertificateCardDto | null>(null);
  selectedBatchTrainees = signal<TraineeDto[]>([]);
  loadingTrainees = signal<boolean>(false);

  constructor(private api: AdminApi) {}

  ngOnInit() {
    this.loadBatchesData();
  }

  loadBatchesData() {
    this.api.getBatches().subscribe({
      next: (data: any[]) => {
        if (data && data.length > 0) {
          const mappedBatches: BatchCertificateCardDto[] = data.map((b) => ({
            id: b.batchId || b.id,
            batchName: b.batchName || b.name || `الدفعة ${b.batchId || b.id}`,
            companyName: b.companyName || b.company || b.hostCompany || b.organizationName || b.companyNameAr || 'غير محدد',
            trackName: b.trackName || b.programName || b.track || b.program || b.trackNameAr || 'عام',
            status: b.status || 'Ongoing',
            statusText: this.formatStatusText(b.status),
            issuedCertificatesCount: b.issuedCertificatesCount ?? 0,
            totalTraineesCount: b.totalTraineesCount ?? b.capacity ?? b.traineesCount ?? 0,
            startDate: b.startDate,
            endDate: b.endDate
          }));
          this.batches.set(mappedBatches);
        } else {
          this.setDefaultData();
        }
      },
      error: (err) => {
        console.error('حدث خطأ أثناء جلب الدفعات:', err);
        this.setDefaultData();
      }
    });
  }

  private setDefaultData() {
    this.batches.set([
      {
        id: 14,
        batchName: 'الدفعة 14',
        companyName: 'مركز البيانات الوطني',
        trackName: 'Cloud Infrastructure',
        status: 'Ongoing',
        statusText: 'جارية',
        issuedCertificatesCount: 8,
        totalTraineesCount: 10,
        startDate: '2025-05-01',
        endDate: '2025-08-31'
      },
      {
        id: 15,
        batchName: 'الدفعة 15',
        companyName: 'شبكة الابتكار',
        trackName: 'AI Fundamentals',
        status: 'NotStarted',
        statusText: 'لم تبدأ',
        issuedCertificatesCount: 0,
        totalTraineesCount: 12,
        startDate: '2025-07-01',
        endDate: '2025-10-31'
      }
    ]);
  }

  private formatStatusText(status: string | number): string {
    const s = String(status).toLowerCase();
    if (s === 'ongoing' || s === '1' || s === 'active') return 'جارية';
    if (s === 'upcoming' || s === '0' || s === 'notstarted') return 'لم تبدأ';
    if (s === 'completed' || s === '2') return 'مكتملة';
    return 'غير محدد';
  }

  getBatchStatusClass(status?: string | number): string {
    const s = String(status).toLowerCase();
    if (s === 'ongoing' || s === '1' || s === 'جارية') return 'ongoing';
    if (s === 'upcoming' || s === '0' || s === 'notstarted' || s === 'لم تبدأ') return 'not-started';
    return 'not-started';
  }

  // عند الضغط على عرض المتدربين: تحويل الواجهة لصفحة التفاصيل الكاملة
  onViewTrainees(batch: BatchCertificateCardDto) {
    this.selectedBatch.set(batch);
    this.viewMode.set('details');
    this.loadingTrainees.set(true);

    this.api.getTrainees({ batchId: batch.id } as any).subscribe({
      next: (res: any) => {
        const list = res?.items || res || [];
        this.selectedBatchTrainees.set(list);
        this.loadingTrainees.set(false);
      },
      error: (err: any) => {
        console.error('حدث خطأ أثناء جلب المتدربين:', err);
        this.selectedBatchTrainees.set([]);
        this.loadingTrainees.set(false);
      }
    });
  }

  // إصدار الشهادات لجميع المتدربين في الدفعة
  issueAllCertificates() {
    const batch = this.selectedBatch();
    if (!batch) return;

    console.log(`جاري إصدار جميع الشهادات للدفعة رقم: ${batch.id}`);

    // في حال توفر endpoint بالخدمة يمكن ربطه هنا مباشرة:
    /*
    this.api.issueBatchCertificates(batch.id).subscribe({
      next: () => {
        alert('تم إصدار الشهادات لجميع المتدربين بنجاح');
        this.onViewTrainees(batch); // إعادة تحميل القائمة بعد التحديث
      },
      error: (err) => console.error('حدث خطأ أثناء إصدار الشهادات:', err)
    });
    */
  }

  // العودة إلى قائمة الدفعات
  backToBatches() {
    this.viewMode.set('list');
    this.selectedBatch.set(null);
    this.selectedBatchTrainees.set([]);
  }
}