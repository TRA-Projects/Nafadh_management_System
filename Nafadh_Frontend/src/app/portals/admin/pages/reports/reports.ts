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
  // 1. التحكم في الأقسام الفرعية
  currentSubSection: 'company' | 'trainer' | 'trainee' = 'company';
  currentView: 'companies' | 'programs' | 'batch-report' = 'companies';

  selectedCompany: any = null;
  selectedBatch: any = null;

  batchIdInput = 1;
  report = signal<BatchPerformanceReportDto | null>(null);
  isLoading = signal<boolean>(false);

  // 2. بيانات قسم الشركات
  companies: any[] = [];
  pageSize = 5;
  currentPageNumber = 1;

  // 3. بيانات قسم المدربين
  allTrainersData: any[] = [];
  trainers: any[] = [];
  trainersCurrentPage = 1;
  trainersPageSize = 6;
  trainersTotalCount = 0;
  trainersTotalPages = 1;

  // 4. بيانات قسم المتدربين
  allTraineesData: any[] = [];
  traineesList: any[] = [];
  traineesCurrentPage = 1;
  traineesPageSize = 10;
  traineesTotalCount = 0;
  traineesTotalPages = 1;

  constructor(
    private api: AdminApi,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadCompaniesData();
    this.loadTrainersData();
    this.loadTraineesData();
  }

  // --- دوال الشركات ---
  loadCompaniesData() {
    this.isLoading.set(true);
    this.api.getCompanies().subscribe({
      next: (res: any) => {
        const rawData = res.items || res;
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
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.companies = [];
        this.isLoading.set(false);
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
        this.cdr.detectChanges();
      },
      error: () => {
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

  // --- دوال المدربين ---
  loadTrainersData() {
    this.isLoading.set(true);
    const params = { pageNumber: 1, pageSize: 100 };
    const apiCall = (this.api as any).getTrainers 
      ? ((this.api as any).getTrainers(params) || (this.api as any).getTrainers())
      : null;

    if (!apiCall) {
      this.isLoading.set(false);
      return;
    }

    apiCall.subscribe({
      next: (res: any) => {
        const raw = res.items || res.data || res.rows || (Array.isArray(res) ? res : []);
        this.allTrainersData = (raw || []).map((t: any) => ({
          id: t.trainerId || t.id,
          name: t.name || t.fullName || t.trainerName || 'مدرب معتمد',
          specialization: t.specialty || t.specialization || t.track || 'تقنية المعلومات',
          rating: t.rating ?? 4.9,
          totalHours: t.experienceYears ? Math.round(t.experienceYears * 15) : (t.totalHours ?? 40),
          batchesCount: t.batchesCount ?? 1
        }));
        this.trainersTotalCount = this.allTrainersData.length;
        this.trainersTotalPages = Math.ceil(this.trainersTotalCount / this.trainersPageSize) || 1;
        this.updateTrainersPage();
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  updateTrainersPage() {
    const startIndex = (this.trainersCurrentPage - 1) * this.trainersPageSize;
    const endIndex = startIndex + this.trainersPageSize;
    this.trainers = this.allTrainersData.slice(startIndex, endIndex);
  }

  nextTrainerPage() {
    if (this.trainersCurrentPage < this.trainersTotalPages) {
      this.trainersCurrentPage++;
      this.updateTrainersPage();
      this.cdr.detectChanges();
    }
  }

  prevTrainerPage() {
    if (this.trainersCurrentPage > 1) {
      this.trainersCurrentPage--;
      this.updateTrainersPage();
      this.cdr.detectChanges();
    }
  }

  // --- دوال المتدربين ---
  loadTraineesData() {
    this.isLoading.set(true);
    const params = { pageNumber: 1, pageSize: 1000 };
    const apiCall = (this.api as any).getTrainees(params) || this.api.getTrainees();

    apiCall.subscribe({
      next: (res: any) => {
        const raw = res.items || res.data || res.rows || (Array.isArray(res) ? res : []);
        this.allTraineesData = (raw || []).map((t: any) => ({
          traineeId: t.traineeId || t.id,
          traineeName: t.fullName || t.name || t.traineeName || 'متدرب',
          companyName: t.companyName || t.company?.name || t.company?.companyName || '—',
          major: t.major || t.specialization || 'تقنية المعلومات',
          attendanceRate: t.attendanceRate ?? t.attendancePercentage ?? 90,
          technicalScore: t.technicalScore ?? t.technicalGrade ?? 85,
          behavioralScore: t.behavioralScore ?? t.softSkillsScore ?? 90,
          level: t.level || 'ممتاز'
        }));
        this.traineesTotalCount = this.allTraineesData.length;
        this.traineesTotalPages = Math.ceil(this.traineesTotalCount / this.traineesPageSize) || 1;
        this.updateTraineesPage();
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  updateTraineesPage() {
    const startIndex = (this.traineesCurrentPage - 1) * this.traineesPageSize;
    const endIndex = startIndex + this.traineesPageSize;
    this.traineesList = this.allTraineesData.slice(startIndex, endIndex);
  }

  nextTraineePage() {
    if (this.traineesCurrentPage < this.traineesTotalPages) {
      this.traineesCurrentPage++;
      this.updateTraineesPage();
      this.cdr.detectChanges();
    }
  }

  prevTraineePage() {
    if (this.traineesCurrentPage > 1) {
      this.traineesCurrentPage--;
      this.updateTraineesPage();
      this.cdr.detectChanges();
    }
  }

  setSubSection(sub: 'company' | 'trainer' | 'trainee') {
    this.currentSubSection = sub;
  }

  openTrainerModal(trainer: any) {
    console.log('تفاصيل المدرب:', trainer);
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
    const csvContent = '\uFEFF' + [headers.join(','), ...dataRows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Report_Trainees_Page${this.currentPageNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
