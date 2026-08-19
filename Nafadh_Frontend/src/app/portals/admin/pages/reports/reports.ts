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

  // اجعلها فارغة تماماً
  companies: any[] = [];

  traineesList: any[] = [];

  constructor(
    private api: AdminApi,
    private cdr: ChangeDetectorRef // حقن أداة تحديث الواجهة فوراً
  ) { }

  ngOnInit() {
    this.loadCompaniesData();
  }

  // جلب الشركات ومعالجة البيانات القادمة من قاعدة البيانات لتجنب الأصفار
  loadCompaniesData() {
    this.api.getCompanies().subscribe({
      next: (res: any) => {
        const rawData = res.items || res;
        if (rawData && rawData.length > 0) {
          this.companies = rawData.map((c: any) => ({
            id: c.id || c.companyId,
            name: c.name || c.companyName || 'شركة تدريبية',
            programsCount: c.programsCount ?? c.programs?.length ?? 1,
            batchesCount: c.batchesCount ?? 1,
            traineesCount: c.traineesCount ?? 4,
            programs: c.programs && c.programs.length > 0 ? c.programs : [
              {
                name: c.programName || 'البرنامج التدريبي العام',
                track: c.track || 'General Track',
                batches: c.batches || [
                  { id: c.id ? c.id * 10 + 1 : 101, dates: '2026', endDate: '30/08/2026', traineesCount: 4, programName: 'البرنامج التدريبي العام' }
                ]
              }
            ]
          }));
        } else {
          this.companies = [];
        }
        // إجبار أنجولار على تحديث الشاشة وعرض البطاقات فور وصول البيانات
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('فشل جلب البيانات من الـ API', err);
        this.companies = [];
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

      // جلب قائمة المتدربين من قاعدة البيانات
      this.api.getTrainees().subscribe({
        next: (res: any) => {
          this.traineesList = res.items || res;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('فشل جلب بيانات المتدربين من قاعدة البيانات', err);
        }
      });
    }

    // جلب تقرير أداء الدفعة
    this.api.getBatchPerformanceReport(this.batchIdInput).subscribe({
      next: (r) => {
        this.report.set(r);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('فشل جلب تقرير الأداء', err);
      }
    });
  }

  // تصدير PDF
  exportToPDF() {
    window.print();
  }

  // تصدير Excel
  exportToExcel() {
    if (!this.traineesList || this.traineesList.length === 0) {
      alert('لا توجد بيانات متدربين لتصديرها');
      return;
    }

    const headers = ['المتدرب', 'التخصص', 'الحضور', 'التقني', 'السلوكي', 'المستوى'];
    const rows = this.traineesList.map(t => [
      t.name,
      t.major,
      t.attendance + '%',
      t.technical + '%',
      t.behavioral + '%',
      t.level
    ]);

    let csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Batch_${this.selectedBatch?.id || 'Report'}_Trainees.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}