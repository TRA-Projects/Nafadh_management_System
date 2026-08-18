import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminApi } from '../../services/admin-api';

// نموذج بطاقة الدفعة الخاص بصفحة الشهادات
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

@Component({
  selector: 'app-admin-certificates',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './certificates.html',
  styleUrls: ['./certificates.css']
})
export class AdminCertificates implements OnInit {
  batches = signal<BatchCertificateCardDto[]>([]);

  constructor(
    private api: AdminApi,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadBatchesData();
  }

  loadBatchesData() {
    this.api.getBatches().subscribe({
      next: (data: any[]) => {
        // طباعة البيانات القادمة من الـ API لمعرفة أسماء الحقول بدقة في Console المتصفح (F12)
        console.log('بيانات الدفعات القادمة من الـ API:', data);

        if (data && data.length > 0) {
          const mappedBatches: BatchCertificateCardDto[] = data.map((b) => ({
            id: b.batchId || b.id,
            batchName: b.batchName || b.name || `الدفعة ${b.batchId || b.id}`,

            // البحث عن اسم الشركة في عدة مسميات محتملة
            companyName: b.companyName || b.company || b.hostCompany || b.organizationName || b.companyNameAr || 'غير محدد',

            // البحث عن المسار/البرنامج في عدة مسميات محتملة
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

  onViewTrainees(batch: BatchCertificateCardDto) {
    this.router.navigate(['/admin/trainees'], { queryParams: { batchId: batch.id } });
  }
}