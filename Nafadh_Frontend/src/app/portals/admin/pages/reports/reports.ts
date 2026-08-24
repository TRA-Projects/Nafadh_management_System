import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { BatchPerformanceReportDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css']
})
export class AdminReports implements OnInit {
  currentView: 'companies' | 'programs' | 'batch-report' = 'companies';

  selectedCompany: any = null;
  selectedBatch: any = null;

  batchIdInput = 1;
  report = signal<BatchPerformanceReportDto | null>(null);

  companies: any[] = [];

  pageSize = 5;
  currentPageNumber = 1;
  isLoading = signal<boolean>(false);

  constructor(
    private api: AdminApi,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadCompaniesData();
  }

  loadCompaniesData() {
    this.isLoading.set(true); // تشغيل التحميل عند البدء

    this.api.getCompanies().subscribe({
      next: (res: any) => {
        const rawData = res.items || res;

        // ملاحظة: البيانات هنا حقيقية بالكامل وتأتي جاهزة من الباك اند
        // (CompanyService.MapToOutputDTO) — تُحسب من جدول Enrollments الفعلي،
        // وليست تقديرية. لا حاجة لأي قيم افتراضية أو حسابات وهمية هنا بعد اليوم.
        this.companies = (rawData || []).map((c: any) => ({
          id: c.companyId,
          name: c.companyName || 'شركة تدريبية',
          programsCount: c.programsCount ?? 0,
          batchesCount: c.batchesCount ?? 0,
          traineesCount: c.traineesCount ?? 0,
          programs: (c.programs || []).map((p: any) => ({
            id: p.programId,
            name: p.title || 'برنامج بدون اسم',
            track: p.track || '—',
            batchesCount: p.batchesCount ?? 0,
            traineesCount: p.traineesCount ?? 0,
            batches: (p.batches || []).map((b: any) => ({
              id: b.batchId,
              dates: b.startDate,
              endDate: b.endDate,
              traineesCount: b.traineesCount ?? 0,
              programName: p.title || 'برنامج بدون اسم'
            }))
          }))
        }));

        this.isLoading.set(false); // إيقاف التحميل بعد معالجة البيانات بنجاح
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('فشل جلب البيانات من الـ API', err);
        this.companies = [];
        this.isLoading.set(false); // إيقاف التحميل في حال حدوث خطأ
        this.cdr.detectChanges();
      }
    });
  }

  selectCompany(company: any) {
    this.selectedCompany = company;
    this.currentView = 'programs';
    this.cdr.detectChanges();
  }

  viewBatchReport(batch?: any) {
    if (batch) {
      this.selectedBatch = batch;
      this.batchIdInput = batch.id;
      this.currentView = 'batch-report';
    }
    this.currentPageNumber = 1;
    this.loadReportPage();
  }

  loadReportPage() {
    this.isLoading.set(true);
    this.api.getBatchPerformanceReport(this.batchIdInput, this.currentPageNumber, this.pageSize).subscribe({
      next: (r: any) => {
        if (r) {
          r.totalCount = r.TotalCount ?? r.totalCount ?? (r.rows ? r.rows.length : 0);
          r.totalPages = r.TotalPages ?? r.totalPages ?? (Math.ceil(r.totalCount / this.pageSize) || 1);
          r.pageNumber = r.PageNumber ?? r.pageNumber ?? this.currentPageNumber;

          if (this.selectedBatch) {
            this.selectedBatch.traineesCount = r.totalCount;
          }
        }

        this.report.set(r);
        this.isLoading.set(false);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('فشل جلب تقرير الأداء', err);
        this.report.set(null);
        this.isLoading.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  nextPage() {
    const r = this.report();
    const totalPages = r?.totalPages || Math.ceil((r?.totalCount || 0) / this.pageSize);

    if (this.currentPageNumber < totalPages) {
      this.currentPageNumber++;
      this.loadReportPage();
    }
  }

  prevPage() {
    if (this.currentPageNumber <= 1) return;
    this.currentPageNumber--;
    this.loadReportPage();
  }

  levelClass(level?: string): string {
    if (!level) return 'level-default';
    const l = level.trim();
    if (l.includes('ممتاز')) return 'level-excellent';
    if (l.includes('جيد جدا') || l.includes('جيد جداً')) return 'level-very-good';
    if (l.includes('جيد')) return 'level-good';
    if (l.includes('راسب')) return 'level-weak';
    return 'level-default';
  }

  exportToPDF() {
    window.print();
  }

  exportToExcel() {
    const rows = this.report()?.rows || [];
    if (rows.length === 0) {
      alert('لا توجد بيانات متدربين لتصديرها');
      return;
    }

    const headers = ['المتدرب', 'التخصص', 'الحضور', 'التقني', 'السلوكي', 'المستوى'];
    const dataRows = rows.map(t => [
      t.traineeName ?? '',
      t.major ?? '',
      (t.attendanceRate ?? 0) + '%',
      (t.technicalScore ?? 0) + '%',
      (t.behavioralScore ?? 0) + '%',
      t.level ?? ''
    ]);

    let csvContent = '\uFEFF' + [headers.join(','), ...dataRows.map(e => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Batch_${this.selectedBatch?.id || 'Report'}_Trainees_Page${this.currentPageNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}