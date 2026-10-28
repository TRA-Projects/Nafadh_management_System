import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AdminApi } from '../../services/admin-api';
import { BatchPerformanceReportDto, AdminSupervisorReportDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css']
})
export class AdminReports implements OnInit {
  // 1. التحكم في الأقسام والشاشات
  currentSubSection: 'company' | 'trainer' | 'trainee' | 'supervisor' = 'company';
  currentView: 'companies' | 'programs' | 'batch-report' | 'company-details' = 'companies';

  selectedCompany: any = null;
  selectedBatch: any = null;
  batchIdInput = 1;

  trainerView: 'grid' | 'details' | 'attendance' = 'grid';
  selectedTrainer: any = null;

  // ==========================================
 // Admin Trainer Attendance - Read Only
 // ==========================================

 // سجلات الحضور القادمة من قاعدة البيانات
 trainerAttendanceRecords: any[] = [];

 // حالة تحميل سجل الحضور
 trainerAttendanceLoading = false;

 // رسالة الخطأ
 trainerAttendanceError = '';

 // طريقة عرض السجل
 trainerAttendanceView: 'day' | 'week' | 'month' | 'custom' = 'month';
  trainerAttendanceDate = this.getLocalDateKey(new Date());
  trainerAttendanceFrom = this.getLocalDateKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  trainerAttendanceTo = this.getLocalDateKey(new Date());
  trainerAttendanceCompanyFilter = 'ALL';
  trainerAttendanceStatusFilter = 'ALL';
  trainerAttendanceConfirmationFilter = 'ALL';
  private attendanceRequestId = 0;

private getLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

 trainerAttendanceCompanies: { id: number; name: string }[] = [];


private updateTrainerAttendanceCompanies(): void {
  const companies = new Map<number, string>();

  for (const record of this.trainerAttendanceRecords) {
    if (record.companyId != null) {
      const id = Number(record.companyId);

      companies.set(
        id,
        record.companyName || `شركة #${id}`
      );
    }
  }

  this.trainerAttendanceCompanies = [...companies]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}


  get filteredTrainerAttendanceRecords(): any[] {
    return this.trainerAttendanceRecords.filter(r =>
      (this.trainerAttendanceCompanyFilter === 'ALL' || String(r.companyId) === this.trainerAttendanceCompanyFilter) &&
      (this.trainerAttendanceStatusFilter === 'ALL' || r.status === this.trainerAttendanceStatusFilter) &&
      (this.trainerAttendanceConfirmationFilter === 'ALL' || String(!!r.isConfirmed) === this.trainerAttendanceConfirmationFilter)
    ).sort((a, b) => String(b.date).localeCompare(String(a.date)) || Number(b.trainerAttendanceId) - Number(a.trainerAttendanceId));
  }

  get trainerAttendanceConfirmedCount(): number {
    return this.filteredTrainerAttendanceRecords.filter(r => r.isConfirmed).length;
  }

  get trainerAttendanceCompanyCount(): number {
    return new Set(this.filteredTrainerAttendanceRecords.map(r => r.companyId).filter((id: any) => id != null)).size;
  }

  getTrainerAttendanceStatusLabel(status: string): string {
    switch (status) {
      case 'Present': return 'حاضر';
      case 'Late': return 'متأخر';
      case 'Absent': return 'غائب';
      case 'EarlyLeave': return 'انصراف مبكر';
      default: return status || 'غير محدد';
    }
  }

  getTrainerAttendanceStatusClass(status: string): string {
    switch (status) {
      case 'Present': return 'present';
      case 'Late': return 'late';
      case 'Absent': return 'absent';
      case 'EarlyLeave': return 'early';
      default: return 'unknown';
    }
  }

  private setTrainerAttendanceRange(view: 'day' | 'week' | 'month'): void {
    const date = new Date(`${this.trainerAttendanceDate}T12:00:00`);
    if (Number.isNaN(date.getTime())) return;
    if (view === 'day') {
      this.trainerAttendanceFrom = this.trainerAttendanceDate;
      this.trainerAttendanceTo = this.trainerAttendanceDate;
    } else if (view === 'week') {
      const start = new Date(date);
      start.setDate(date.getDate() - date.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      this.trainerAttendanceFrom = this.getLocalDateKey(start);
      this.trainerAttendanceTo = this.getLocalDateKey(end);
    } else {
      this.trainerAttendanceFrom = this.getLocalDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
      this.trainerAttendanceTo = this.getLocalDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0));
    }
  }
setTrainerAttendanceView(view: 'day' | 'week' | 'month'): void {
  // Start from today's date when switching views
  this.trainerAttendanceDate = this.getLocalDateKey(new Date());

  this.trainerAttendanceView = view;
  this.setTrainerAttendanceRange(view);
  this.loadTrainerAttendance();
}


navigateTrainerAttendance(direction: -1 | 1): void {
  if (this.trainerAttendanceView === 'custom') return;

  const date = new Date(`${this.trainerAttendanceDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return;

  if (this.trainerAttendanceView === 'day') {
    date.setDate(date.getDate() + direction);
  } else if (this.trainerAttendanceView === 'week') {
    date.setDate(date.getDate() + direction * 7);
  } else if (this.trainerAttendanceView === 'month') {
    // Prevent dates like January 31 from skipping February
    date.setDate(1);
    date.setMonth(date.getMonth() + direction);
  }

  this.trainerAttendanceDate = this.getLocalDateKey(date);

  this.setTrainerAttendanceRange(this.trainerAttendanceView);
  this.loadTrainerAttendance();
}


  onTrainerAttendanceDateChange(): void {
    this.trainerAttendanceView = 'custom';
    this.loadTrainerAttendance();
  }

  resetTrainerAttendanceFilters(): void {
    this.trainerAttendanceCompanyFilter = 'ALL';
    this.trainerAttendanceStatusFilter = 'ALL';
    this.trainerAttendanceConfirmationFilter = 'ALL';
  }

  report = signal<BatchPerformanceReportDto | null>(null);
  isLoading = signal<boolean>(false);

  // 2. بيانات الشركات
  allCompaniesData: any[] = [];
  companies: any[] = [];
  companySearchTerm = '';
  companyFilterSort = 'ALL';
  companyFilterCity = 'ALL';
  companyFilterField = 'ALL';

  programSearchTerm = '';
  programSortFilter = 'ALL';
  batchMajorFilter = 'ALL';
  pageSize = 5;
  currentPageNumber = 1;

  batchTraineeSearch = '';
  batchLevelFilter = 'ALL';

  // 3. بيانات المدربين
  allTrainersData: any[] = [];
  filteredTrainersList: any[] = [];
  trainers: any[] = [];

  trainerSearchTerm = '';
  trainerSpecialtyFilter = 'ALL';
  trainerRatingFilter = 'ALL';

  trainersCurrentPage = 1;
  trainersPageSize = 6;
  trainersTotalCount = 0;
  trainersTotalPages = 1;

  trainerReviewsPage = 1;
  trainerReviewsPageSize = 5;
  trainerReviewSearch = '';

  // 4. بيانات المتدربين
  allTraineesData: any[] = [];
  filteredTraineesList: any[] = [];
  traineesList: any[] = [];

  traineeSearchTerm = '';
  traineeCompanyFilter = 'ALL';
  traineeTrainerFilter = 'ALL';
  traineeLevelFilter = 'ALL';

  traineesCurrentPage = 1;
  traineesPageSize = 10;
  traineesTotalCount = 0;
  traineesTotalPages = 1;

  // 5. إدارة كشف الدرجات العام والفردي المعتمد مع Pagination
  traineeSubView: 'roster' | 'master_transcript' | 'single_transcript' = 'roster';
  selectedTraineeForTranscript: any = null;

  // متغيرات الترقيم لكشف الدرجات العام
  masterTranscriptCurrentPage = 1;
  masterTranscriptPageSize = 10;
  masterTranscriptTotalPages = 1;
  pagedMasterTranscriptList: any[] = [];

  // متغيرات البحث والفلترة الشاملة لكشف الدرجات العام
  masterSearchTerm = '';
  masterCompanyFilter = 'ALL';
  masterLevelFilter = 'ALL';
  masterScoreRangeFilter = 'ALL';
  filteredMasterTranscriptList: any[] = [];


  // =========================================================
  // Supervisor Reports - تقارير المشرفين
  // =========================================================
  allSupervisorsData: AdminSupervisorReportDto[] = [];
  filteredSupervisorsList: AdminSupervisorReportDto[] = [];

  supervisorSearchTerm = '';
  supervisorCompanyFilter = 'ALL';
  supervisorStatusFilter = 'ALL';

  supervisorYear = new Date().getFullYear();
  supervisorMonth = new Date().getMonth() + 1;

  supervisorLoading = false;
  supervisorError = '';
  supervisorDataLoaded = false;

  get supervisorCompanies(): string[] {
    return Array.from(
      new Set(
        this.allSupervisorsData
          .map(s => s.companyName)
          .filter((name): name is string => !!name)
      )
    ).sort();
  }

  get supervisorTotalCount(): number {
    return this.allSupervisorsData.length;
  }

  get supervisorAssignedTrainees(): number {
    return this.allSupervisorsData.reduce(
      (sum, s) => sum + s.assignedTraineesCount, 0
    );
  }

  get supervisorAverageAttendance(): number | null {
    const rates = this.allSupervisorsData
      .map(s => s.averageAttendanceRate)
      .filter((rate): rate is number => rate !== null);

    if (rates.length === 0) return null;

    return Math.round(
      (rates.reduce((sum, rate) => sum + rate, 0) / rates.length) * 100
    ) / 100;
  }

   get supervisorTrainerEvaluations(): number {
    return this.allSupervisorsData.reduce(
      (sum, s) => sum + (s.trainerEvaluationsCount ?? 0), 0
    );
  }

  get supervisorActiveCount(): number {
    return this.allSupervisorsData.filter(
      s => s.status === 'Active'
    ).length;
  }

  get supervisorFollowUpCount(): number | null {
    const counts = this.allSupervisorsData
      .map(s => s.traineesNeedingFollowUpCount);

    if (counts.some(count => count === null)) return null;

    return counts.reduce(
      (sum: number, count) => sum + (count ?? 0), 0
    );
  }


  constructor(
    private api: AdminApi,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['sub'] && ['company', 'trainer', 'trainee', 'supervisor'].includes(params['sub'])) {
        this.currentSubSection = params['sub'];
        this.cdr.detectChanges();
      }
    });

    this.loadCompaniesData();
    this.loadTrainersData();
    this.loadTraineesData();

    if (this.currentSubSection === 'supervisor') {
    this.loadSupervisorsData();
    }
  }

 formatRating(val: any): string {
  if (val === null || val === undefined || val === '') {
    return 'غير متوفر';
  }

  const num = Number(val);

  return Number.isFinite(num) ? num.toFixed(1) : 'غير متوفر';
}

  // =========================================================
  // دوال وفلاتر قسم الشركات (مع Getters لحساب بطاقات الإحصائيات)
  // =========================================================

  // حساب متوسط تقييم الشركات للبطاقة العلوية

get avgCompanyRating(): string {
  const validRatings = (this.allCompaniesData || [])
    .map(c => Number(c.ratingScore))
    .filter((rating, index) =>
      this.allCompaniesData[index].ratingScore != null &&
      Number.isFinite(rating) &&
      rating >= 0 &&
      rating <= 5
    );

  if (validRatings.length === 0) {
    return 'غير متوفر';
  }

  const sum = validRatings.reduce((acc, rating) => acc + rating, 0);

  return (sum / validRatings.length).toFixed(1);
}


  // حساب إجمالي المتدربين المستضافين للبطاقة العلوية

get totalCompanyTrainees(): number {
  return (this.allCompaniesData || []).reduce(
    (total, company) =>
      total + (Number(company.traineesCount) || 0),
    0
  );
}


  loadCompaniesData() {
  this.isLoading.set(true);

  this.api.getAdminCompaniesSummary().subscribe({
    next: (summary: any) => {
      const reportCompanies = summary.companies ?? [];

      // تفاصيل البرامج والمشرفين من API القديم
      this.api.getCompanies().subscribe({
        next: (res: any) => {
          const oldCompanies = Array.isArray(res)
            ? res
            : (res?.items ?? []);

          const detailsMap = new Map<number, any>(
            oldCompanies.map((c: any) => [Number(c.companyId), c])
          );

          this.allCompaniesData = reportCompanies.map((c: any) => {
            const details = detailsMap.get(Number(c.companyId));

            const supervisor = details?.supervisors?.[0];
            const supervisorName = supervisor
              ? (supervisor.fullName ?? supervisor.user?.fullName ?? null)
              : (details?.supervisorName ?? null);

            return {
              id: c.companyId,
              companyId: c.companyId,
              name: c.companyName ?? 'غير متوفر',
              commercialRegister: c.commercialRegister ?? '—',
              workField: c.workField ?? 'غير متوفر',
              city: details?.city ??
                (c.address ? c.address.split('،')[0] : 'غير متوفر'),
              address: c.address ?? '—',
              phone: c.phone ?? '—',
              email: c.email ?? '—',
              website: details?.website ?? '',
              capacity: c.capacity,
              status: c.status,
              rejectionReason: details?.rejectionReason ?? null,

              // لا نعرض تقييمات غير موجودة
              ratingScore: details?.ratingScore ?? null,

              notes: details?.notes ?? '',
              supervisorName,

              // الأعداد المعتمدة من API التقارير الجديد
              programsCount: c.programsCount,
              batchesCount: c.batchesCount,
              traineesCount: c.traineesCount,

              // تفاصيل البرامج فقط من API القديم
              supervisors: details?.supervisors ?? [],
              // البرامج والدفعات من API التقارير الجديد
programs: (c.programs ?? []).map((p: any) => ({
  id: p.programId,
  name: p.programName ?? 'غير متوفر',
  track: p.trackName ?? '—',

  batchesCount: p.batchesCount,
  traineesCount: p.traineesCount,

  batches: (p.batches ?? []).map((b: any) => ({
    id: b.batchId,
    name: b.batchName,
    dates: b.startDate
      ? String(b.startDate).split('T')[0]
      : '—',
    endDate: b.endDate
      ? String(b.endDate).split('T')[0]
      : '—',
    traineesCount: b.traineesCount,
    programName: p.programName ?? 'غير متوفر'
  }))
}))
            };
          });

          this.applyCompanyFilters();
          this.isLoading.set(false);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Company details error:', err);
          this.isLoading.set(false);
          this.cdr.detectChanges();
        }
      });
    },
    error: (err) => {
      console.error('Admin companies summary error:', err);
      this.allCompaniesData = [];
      this.companies = [];
      this.isLoading.set(false);
      this.cdr.detectChanges();
    }
  });
}

  get uniqueCompanyCities(): string[] {
    const list = this.allCompaniesData.map(c => c.city).filter(Boolean);
    return Array.from(new Set(list));
  }

  get uniqueCompanyFields(): string[] {
    const list = this.allCompaniesData.map(c => c.workField).filter(Boolean);
    return Array.from(new Set(list));
  }

  applyCompanyFilters() {
    let result = [...this.allCompaniesData];

    if (this.companySearchTerm.trim()) {
      const q = this.companySearchTerm.toLowerCase().trim();
      result = result.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.commercialRegister && c.commercialRegister.includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.workField && c.workField.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
      );
    }

    if (this.companyFilterCity !== 'ALL') {
      result = result.filter(c => c.city === this.companyFilterCity);
    }

    if (this.companyFilterField !== 'ALL') {
      result = result.filter(c => c.workField === this.companyFilterField);
    }

    const sortChoice = this.companyFilterSort;
    if (sortChoice === 'TOP_TRAINEES') {
      result = result.sort((a, b) => (b.traineesCount || 0) - (a.traineesCount || 0));
    } else if (sortChoice === 'TOP_PROGRAMS') {
      result = result.sort((a, b) => (b.programsCount || 0) - (a.programsCount || 0));
    } else if (sortChoice === 'TOP_BATCHES') {
      result = result.sort((a, b) => (b.batchesCount || 0) - (a.batchesCount || 0));
    }

    this.companies = result;
  }

  resetCompanyFilters() {
    this.companySearchTerm = '';
    this.companyFilterSort = 'ALL';
    this.companyFilterCity = 'ALL';
    this.companyFilterField = 'ALL';
    this.applyCompanyFilters();
  }

  selectCompany(company: any) {
    this.selectedCompany = company;
    this.programSearchTerm = '';
    this.programSortFilter = 'ALL';
    this.currentView = 'programs';
    this.cdr.detectChanges();
  }

  openCompanyFullDetails(company: any) {
    this.selectedCompany = company;
    this.currentView = 'company-details';
    this.cdr.detectChanges();
  }

  get filteredCompanyPrograms(): any[] {
    if (!this.selectedCompany?.programs) return [];
    let list = [...this.selectedCompany.programs];

    if (this.programSearchTerm.trim()) {
      const q = this.programSearchTerm.toLowerCase().trim();
      list = list.filter(prog => {
        const matchName = prog.name && prog.name.toLowerCase().includes(q);
        const matchTrack = prog.track && prog.track.toLowerCase().includes(q);
        const matchBatch = (prog.batches || []).some((b: any) => String(b.id).includes(q));
        return matchName || matchTrack || matchBatch;
      });
    }

    if (this.programSortFilter === 'MOST_BATCHES') {
      list = list.sort((a, b) => (b.batches?.length || 0) - (a.batches?.length || 0));
    } else if (this.programSortFilter === 'MOST_TRAINEES') {
      list = list.sort((a, b) => (b.traineesCount || 0) - (a.traineesCount || 0));
    }

    return list;
  }

  resetProgramFilters() {
    this.programSearchTerm = '';
    this.programSortFilter = 'ALL';
  }

  viewBatchReport(batch?: any) {
    if (batch) {
      this.selectedBatch = batch;
      this.batchIdInput = batch.id;
      this.currentView = 'batch-report';
    }
    this.currentPageNumber = 1;
    this.batchTraineeSearch = '';
    this.batchLevelFilter = 'ALL';
    this.loadReportPage();
  }

  loadReportPage() {
  const companyId = Number(this.selectedCompany?.id);
  const batchId = Number(this.batchIdInput);

  if (!companyId || !batchId) {
    console.error('Missing companyId or batchId', {
      companyId,
      batchId
    });
    this.report.set(null);
    this.isLoading.set(false);
    return;
  }

  this.isLoading.set(true);

  this.api.getAdminCompanyBatchPerformanceReport(
    companyId,
    batchId,
    this.currentPageNumber,
    this.pageSize
  ).subscribe({
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
    error: (err) => {
      console.error('Company batch performance error:', err);
      this.report.set(null);
      this.isLoading.set(false);
      this.cdr.detectChanges();
    }
  });
}
  // استخراج جميع التخصصات الفعلية القادمة من الداتابيز تلقائياً بدون تكرار
  get uniqueBatchMajors(): string[] {
    const rows = this.report()?.rows || [];
    let list = rows.map((t: any) => t.major).filter(Boolean);

    // إذا كانت الدفعة جديدة، يقرأ التخصصات من قاعدة بيانات المتدربين العامة
    if (list.length === 0 && this.allTraineesData) {
      list = this.allTraineesData.map((t: any) => t.major).filter(Boolean);
    }

    return Array.from(new Set(list));
  }
  get filteredBatchReportRows(): any[] {
    const rawRows = this.report()?.rows || [];
    return rawRows.filter(t => {
      const matchSearch = !this.batchTraineeSearch.trim() ||
        (t.traineeName && t.traineeName.toLowerCase().includes(this.batchTraineeSearch.toLowerCase().trim())) ||
        (t.major && t.major.toLowerCase().includes(this.batchTraineeSearch.toLowerCase().trim()));

      const matchLevel = this.batchLevelFilter === 'ALL' || (t.level && t.level.includes(this.batchLevelFilter));
      const matchMajor = this.batchMajorFilter === 'ALL' || (t.major && t.major.includes(this.batchMajorFilter));

      return matchSearch && matchLevel && matchMajor;
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

  // =========================================================
  // دوال وفلاتر قسم المدربين
  // =========================================================
  loadTrainersData() {
    this.isLoading.set(true);
    const params = { pageNumber: 1, pageSize: 1000 };
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

        this.allTrainersData = (raw || []).map((t: any, index: number) => {
          const rawRating = t.rating != null ? Number(t.rating) : null;
          const cleanRating = rawRating != null ? rawRating.toFixed(1) : '—';
          const cleanExp = t.experienceYears != null
  ? Number(t.experienceYears).toFixed(1)
  : 'غير متوفر';


          return {
            id: t.trainerId || t.id,
            name: t.fullName || t.name || t.trainerName || 'مدرب معتمد',
            specialization: t.specialty || t.specialization || t.track || 'تقنية المعلومات',
            rating: cleanRating,
            experienceYears: cleanExp,
            totalHours: t.totalHours != null ? Number(t.totalHours) : null,
            batchesCount: t.batchesCount != null ? Number(t.batchesCount) : null,
            biography: t.biography || 'مدرب تقني معتمد لدى الهيئة، يمتلك سجلاً حافلاً بالخبرات العملية في تأهيل الكوادر الوطنية.',
            status: t.status === 'Active' ? 'نشط': t.status === 'Inactive' ? 'غير نشط': t.status === 'Suspended' ? 'موقوف' : t.status ?? 'غير متوفر',
            warningsCount: t.warningsCount != null ? Number(t.warningsCount) : null,
            warningTitle: t.warningTitle ?? 'غير متوفر'
          };
        });

        this.applyTrainerFilters();
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  get uniqueTrainerSpecialties(): string[] {
    const list = this.allTrainersData.map(t => t.specialization).filter(Boolean);
    return Array.from(new Set(list));
  }

  applyTrainerFilters() {
    let result = [...this.allTrainersData];

    if (this.trainerSearchTerm.trim()) {
      const q = this.trainerSearchTerm.toLowerCase().trim();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.specialization.toLowerCase().includes(q) ||
        String(t.id).includes(q)
      );
    }

    if (this.trainerSpecialtyFilter !== 'ALL') {
      result = result.filter(t => t.specialization === this.trainerSpecialtyFilter);
    }

    if (this.trainerRatingFilter !== 'ALL') {
  const minRating = Number(this.trainerRatingFilter);

  result = result.filter(t => {
    if (t.rating == null || t.rating === '' || t.rating === 'غير متوفر' || t.rating === '—') {
      return false;
    }

    const rating = Number(t.rating);
    return Number.isFinite(rating) && rating >= minRating;
  });
}

    this.filteredTrainersList = result;
    this.trainersTotalCount = result.length;
    this.trainersTotalPages = Math.ceil(this.trainersTotalCount / this.trainersPageSize) || 1;
    this.trainersCurrentPage = 1;
    this.updateTrainersPage();
  }

  resetTrainerFilters() {
    this.trainerSearchTerm = '';
    this.trainerSpecialtyFilter = 'ALL';
    this.trainerRatingFilter = 'ALL';
    this.applyTrainerFilters();
  }

  updateTrainersPage() {
    const startIndex = (this.trainersCurrentPage - 1) * this.trainersPageSize;
    const endIndex = startIndex + this.trainersPageSize;
    this.trainers = this.filteredTrainersList.slice(startIndex, endIndex);
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

  goToTrainerPage(page: number) {
    if (page >= 1 && page <= this.trainersTotalPages) {
      this.trainersCurrentPage = page;
      this.updateTrainersPage();
      this.cdr.detectChanges();
    }
  }

   getTrainerPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.trainersCurrentPage - 2);
    let end = Math.min(this.trainersTotalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
   }

    // ==========================================
    // Open Trainer Attendance - Admin Read Only
   // ==========================================
openTrainerAttendance(trainer: any): void {
  if (!trainer?.id) return;

  ++this.attendanceRequestId;

  this.selectedTrainer = trainer;
  this.trainerAttendanceRecords = [];
  this.trainerAttendanceError = '';

  this.trainerAttendanceDate = this.getLocalDateKey(new Date());
  this.trainerAttendanceView = 'month';

  this.resetTrainerAttendanceFilters();
  this.setTrainerAttendanceRange('month');

  this.trainerView = 'attendance';
  this.loadTrainerAttendance();
  this.cdr.detectChanges();
}




loadTrainerAttendance(): void {
  if (!this.selectedTrainer?.id) return;

  const trainerId = Number(this.selectedTrainer.id);
  const from = this.trainerAttendanceFrom;
  const to = this.trainerAttendanceTo;

  // Prevent old requests from updating the screen
  const requestId = ++this.attendanceRequestId;

  this.trainerAttendanceError = '';
  this.trainerAttendanceRecords = [];

  if (!from || !to || from > to) {
    this.trainerAttendanceLoading = false;
    this.trainerAttendanceError =
      'يرجى اختيار فترة صحيحة: تاريخ البداية يجب أن يسبق تاريخ النهاية.';
    this.cdr.detectChanges();
    return;
  }

  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    this.trainerAttendanceLoading = false;
    this.trainerAttendanceError = 'التاريخ المحدد غير صالح.';
    this.cdr.detectChanges();
    return;
  }

  const days =
    Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

  if (days > 366) {
    this.trainerAttendanceLoading = false;
    this.trainerAttendanceError =
      'الحد الأقصى للفترة هو 366 يومًا.';
    this.cdr.detectChanges();
    return;
  }

  this.trainerAttendanceLoading = true;

  this.api.getAdminTrainerAttendance(
    from,
    to,
    trainerId
  ).subscribe({
    next: (records) => {

  if (requestId !== this.attendanceRequestId) return;

  this.trainerAttendanceRecords = records ?? [];
  this.updateTrainerAttendanceCompanies();
  this.trainerAttendanceLoading = false;
  this.cdr.detectChanges();
},
    error: (err) => {
      if (requestId !== this.attendanceRequestId) return;

      console.error('Trainer attendance error:', err);
      this.trainerAttendanceRecords = [];
      this.trainerAttendanceError =
        'تعذر تحميل سجل حضور المدرب. حاول مرة أخرى.';
      this.trainerAttendanceLoading = false;
      this.cdr.detectChanges();
    }
  });
}



// Weekly attendance - Admin Read Only

getTrainerAttendanceWeekDays(): { date: string; label: string }[] {
  const selected = new Date(`${this.trainerAttendanceDate}T12:00:00`);

  if (Number.isNaN(selected.getTime())) return [];

  // Week starts on Sunday
  const start = new Date(selected);
  start.setDate(selected.getDate() - selected.getDay());

  const dayNames = [
    'الأحد', 'الاثنين', 'الثلاثاء',
    'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
  ];

  return dayNames.map((label, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');

    return { date: dateKey, label };
  });
}


// Return filtered attendance records for a specific day
getTrainerAttendanceRecordsForDay(date: string): any[] {
  return this.filteredTrainerAttendanceRecords.filter(record =>
    String(record.date).substring(0, 10) === date
  );
}


// Convert attendance status to the same symbols used in Company Portal
getTrainerAttendanceSymbol(status: string | null | undefined): string {
  switch (status) {
    case 'Present': return 'ح';
    case 'Late': return 'ت';
    case 'Absent': return 'غ';
    case 'EarlyLeave': return 'م';
    default: return '—';
  }
}


// Monthly attendance weeks - Admin Read Only
getTrainerAttendanceMonthWeeks(): {
  index: number;
  label: string;
  days: { date: string; label: string }[];
}[] {
  const selected = new Date(`${this.trainerAttendanceDate}T12:00:00`);

  if (Number.isNaN(selected.getTime())) return [];

  const year = selected.getFullYear();
  const month = selected.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  const weeks: {
    index: number;
    label: string;
    days: { date: string; label: string }[];
  }[] = [];

  let currentWeek: { date: string; label: string }[] = [];

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day, 12);

    const dateKey = [
      year,
      String(month + 1).padStart(2, '0'),
      String(day).padStart(2, '0')
    ].join('-');

    currentWeek.push({
      date: dateKey,
      label: `${day}`
    });

    // Saturday ends the week, or the final day of the month
    if (date.getDay() === 6 || day === lastDay) {
      weeks.push({
        index: weeks.length,
        label: `${currentWeek[0].date} إلى ${currentWeek[currentWeek.length - 1].date}`,
        days: currentWeek
      });

      currentWeek = [];
    }
  }

  return weeks;
}



 // Return to trainers list
 backFromTrainerAttendance(): void {
  this.trainerView = 'grid';
  this.selectedTrainer = null;
  ++this.attendanceRequestId;
  this.trainerAttendanceRecords = [];
  this.trainerAttendanceError = '';

  this.cdr.detectChanges();
 }

  openTrainerModal(trainer: any) {
  this.selectedTrainer = trainer;

  if (!this.selectedTrainer) return;

  this.trainerReviewsPage = 1;
  this.trainerReviewSearch = '';

  // لا نعرض تقييمات وهمية
  this.selectedTrainer.allReviews = [];
  this.selectedTrainer.traineeReviews = [];

  this.trainerView = 'details';
  this.cdr.detectChanges();
}

  get filteredTrainerReviewsList(): any[] {
    const all = this.selectedTrainer?.allReviews || [];
    if (!this.trainerReviewSearch.trim()) return all;
    const q = this.trainerReviewSearch.toLowerCase().trim();
    return all.filter((r: any) =>
      r.traineeName.toLowerCase().includes(q) ||
      r.companyName.toLowerCase().includes(q) ||
      r.batchName.toLowerCase().includes(q)
    );
  }

  updateTrainerReviewsSlice() {
    const list = this.filteredTrainerReviewsList;
    const start = (this.trainerReviewsPage - 1) * this.trainerReviewsPageSize;
    this.selectedTrainer.traineeReviews = list.slice(start, start + this.trainerReviewsPageSize);
  }

  nextTrainerReviewPage() {
    const total = Math.ceil(this.filteredTrainerReviewsList.length / this.trainerReviewsPageSize);
    if (this.trainerReviewsPage < total) {
      this.trainerReviewsPage++;
      this.updateTrainerReviewsSlice();
      this.cdr.detectChanges();
    }
  }

  prevTrainerReviewPage() {
    if (this.trainerReviewsPage > 1) {
      this.trainerReviewsPage--;
      this.updateTrainerReviewsSlice();
      this.cdr.detectChanges();
    }
  }

  backToTrainersList() {
    this.trainerView = 'grid';
    this.selectedTrainer = null;
    this.cdr.detectChanges();
  }

  // =========================================================
  // دوال وفلاتر قسم المتدربين
  // =========================================================
  loadTraineesData() {
    this.isLoading.set(true);
    const params = { pageNumber: 1, pageSize: 1000 };
    const apiRef = this.api as any;
    const apiCall = apiRef.getTrainees
      ? apiRef.getTrainees(params)
      : (apiRef.getAllTrainees ? apiRef.getAllTrainees() : null);

    if (!apiCall) {
      this.isLoading.set(false);
      return;
    }

    apiCall.subscribe({
      next: (res: any) => {
        const raw = res.items || res.data || res.rows || (Array.isArray(res) ? res : []);

        this.allTraineesData = (raw || []).map((t: any) => {
          const attendRate = t.attendanceRate ?? t.AttendanceRate ?? 0;
          const techScore = t.technicalScore ?? t.TechnicalScore ?? 0;
          const projScore = t.projectScore ?? t.ProjectScore ?? 0;
          const behavScore = t.behavioralScore ?? t.BehavioralScore ?? 0;

          const calculatedLevel = techScore >= 90
            ? 'ممتاز'
            : (techScore >= 80 ? 'جيد جداً' : (techScore >= 70 ? 'جيد' : 'غير مجتاز'));

          return {
            traineeId: t.traineeId || t.TraineeId || t.id,
            traineeName: t.fullName || t.FullName || t.traineeName || 'متدرب',
            companyName: t.companyName || t.CompanyName || t.company?.companyName || '—',
            major: t.major || t.Major || t.specialization || 'علوم الحاسوب',

            attendanceRate: attendRate,
            technicalScore: techScore,
            projectScore: projScore,
            behavioralScore: behavScore,
            level: t.level || calculatedLevel,

            assignedTrainer: t.trainerName || t.assignedTrainer || 'المشرف المعتمد',

            trainerNotes: t.trainerNotes || t.TrainerNotes || 'لا توجد ملاحظات مسجلة',
            trainerRecommendation: t.trainerRecommendation || t.TrainerRecommendation || 'قيد المراجعة والاعتماد'
          };
        });

        this.applyTraineeFilters();
        if (this.updateMasterTranscriptPage) {
          this.updateMasterTranscriptPage();
        }
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  get uniqueTraineeCompanies(): string[] {
    const list = this.allTraineesData.map(t => t.companyName).filter(Boolean);
    return Array.from(new Set(list));
  }

  get uniqueTraineeTrainers(): string[] {
    const list = this.allTraineesData.map(t => t.assignedTrainer).filter(Boolean);
    return Array.from(new Set(list));
  }

  applyTraineeFilters() {
    let result = [...this.allTraineesData];

    if (this.traineeSearchTerm.trim()) {
      const q = this.traineeSearchTerm.toLowerCase().trim();
      result = result.filter(t =>
        t.traineeName.toLowerCase().includes(q) ||
        t.companyName.toLowerCase().includes(q) ||
        t.major.toLowerCase().includes(q) ||
        t.assignedTrainer.toLowerCase().includes(q)
      );
    }

    if (this.traineeCompanyFilter !== 'ALL') {
      result = result.filter(t => t.companyName === this.traineeCompanyFilter);
    }

    if (this.traineeTrainerFilter !== 'ALL') {
      result = result.filter(t => t.assignedTrainer === this.traineeTrainerFilter);
    }

    if (this.traineeLevelFilter !== 'ALL') {
      result = result.filter(t => t.level.includes(this.traineeLevelFilter));
    }

    this.filteredTraineesList = result;
    this.traineesTotalCount = result.length;
    this.traineesTotalPages = Math.ceil(this.traineesTotalCount / this.traineesPageSize) || 1;
    this.traineesCurrentPage = 1;
    this.updateTraineesPage();
    this.updateMasterTranscriptPage();
  }

  resetTraineeFilters() {
    this.traineeSearchTerm = '';
    this.traineeCompanyFilter = 'ALL';
    this.traineeTrainerFilter = 'ALL';
    this.traineeLevelFilter = 'ALL';
    this.applyTraineeFilters();
  }

  updateTraineesPage() {
    const startIndex = (this.traineesCurrentPage - 1) * this.traineesPageSize;
    const endIndex = startIndex + this.traineesPageSize;
    this.traineesList = this.filteredTraineesList.slice(startIndex, endIndex);
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

  // =========================================================
  // دوال كشف الدرجات العام والفردي المعتمد
  // =========================================================
  openTraineeTranscript(trainee: any) {
    this.selectedTraineeForTranscript = trainee;
    this.traineeSubView = 'single_transcript';
    this.cdr.detectChanges();
  }

  closeTraineeTranscript() {
    this.traineeSubView = 'roster';
    this.selectedTraineeForTranscript = null;
    this.cdr.detectChanges();
  }

  openMasterTranscript() {
    this.traineeSubView = 'master_transcript';
    this.masterSearchTerm = '';
    this.masterCompanyFilter = 'ALL';
    this.masterLevelFilter = 'ALL';
    this.masterScoreRangeFilter = 'ALL';
    this.applyMasterTranscriptFilters();
    this.cdr.detectChanges();
  }
  // دالة البحث الشامل في كل حقول كشف الدرجات
  applyMasterTranscriptFilters() {
    let list = [...this.allTraineesData];

    // 1. البحث الشامل بالاسم، الرقم الأكاديمي، الشركة، التخصص، أو المدرب
    if (this.masterSearchTerm.trim()) {
      const q = this.masterSearchTerm.toLowerCase().trim();
      list = list.filter(t => {
        const name = (t.traineeName || '').toLowerCase();
        const id = String(t.traineeId || '').toLowerCase();
        const fullId = `nfd-${id}`;
        const comp = (t.companyName || '').toLowerCase();
        const major = (t.major || '').toLowerCase();
        const trainer = (t.assignedTrainer || '').toLowerCase();
        const level = (t.level || '').toLowerCase();
        const score = String(this.getTraineeFinalScore(t));

        return name.includes(q) ||
          id.includes(q) ||
          fullId.includes(q) ||
          comp.includes(q) ||
          major.includes(q) ||
          trainer.includes(q) ||
          level.includes(q) ||
          score.includes(q);
      });
    }

    // 2. فلتر المنشأة المستضيفة
    if (this.masterCompanyFilter !== 'ALL') {
      list = list.filter(t => t.companyName === this.masterCompanyFilter);
    }

    // 3. فلتر التقدير
    if (this.masterLevelFilter !== 'ALL') {
      list = list.filter(t => t.level && t.level.includes(this.masterLevelFilter));
    }

    // 4. فلتر نطاق المجموع النهائي
    if (this.masterScoreRangeFilter === '90_PLUS') {
      list = list.filter(t => this.getTraineeFinalScore(t) >= 90);
    } else if (this.masterScoreRangeFilter === '80_PLUS') {
      list = list.filter(t => this.getTraineeFinalScore(t) >= 80);
    } else if (this.masterScoreRangeFilter === '70_PLUS') {
      list = list.filter(t => this.getTraineeFinalScore(t) >= 70);
    }

    this.filteredMasterTranscriptList = list;
    this.masterTranscriptCurrentPage = 1;
    this.updateMasterTranscriptPage();
  }

  // إعادة تعيين وتصفير فلاتر الكشف العام
  resetMasterTranscriptFilters() {
    this.masterSearchTerm = '';
    this.masterCompanyFilter = 'ALL';
    this.masterLevelFilter = 'ALL';
    this.masterScoreRangeFilter = 'ALL';
    this.applyMasterTranscriptFilters();
  }

  // تحديث الصفحة المعروضة في كشف الدرجات بعد الفلترة
  updateMasterTranscriptPage() {
    const list = this.filteredMasterTranscriptList || [];
    this.masterTranscriptTotalPages = Math.ceil(list.length / this.masterTranscriptPageSize) || 1;
    if (this.masterTranscriptCurrentPage > this.masterTranscriptTotalPages) {
      this.masterTranscriptCurrentPage = this.masterTranscriptTotalPages;
    }
    const startIndex = (this.masterTranscriptCurrentPage - 1) * this.masterTranscriptPageSize;
    const endIndex = startIndex + this.masterTranscriptPageSize;
    this.pagedMasterTranscriptList = list.slice(startIndex, endIndex);
  }


  nextMasterTranscriptPage() {
    if (this.masterTranscriptCurrentPage < this.masterTranscriptTotalPages) {
      this.masterTranscriptCurrentPage++;
      this.updateMasterTranscriptPage();
      this.cdr.detectChanges();
    }
  }

  prevMasterTranscriptPage() {
    if (this.masterTranscriptCurrentPage > 1) {
      this.masterTranscriptCurrentPage--;
      this.updateMasterTranscriptPage();
      this.cdr.detectChanges();
    }
  }

  goToMasterTranscriptPage(page: number) {
    if (page >= 1 && page <= this.masterTranscriptTotalPages) {
      this.masterTranscriptCurrentPage = page;
      this.updateMasterTranscriptPage();
      this.cdr.detectChanges();
    }
  }

  onMasterTranscriptPageSizeChange() {
    this.masterTranscriptCurrentPage = 1;
    this.updateMasterTranscriptPage();
    this.cdr.detectChanges();
  }

  getMasterTranscriptPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.masterTranscriptCurrentPage - 2);
    let end = Math.min(this.masterTranscriptTotalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  getTraineeFinalScore(tr: any): number {
    if (!tr) return 0;
    const att = Number(tr.attendanceRate || 0) * 0.15;
    const tech = Number(tr.technicalScore || 0) * 0.35;
    const proj = Number(tr.projectScore ?? tr.technicalScore ?? 0) * 0.30;
    const beh = Number(tr.behavioralScore || 0) * 0.20;
    return Math.round(att + tech + proj + beh);
  }

  getTraineeGpa(tr: any): string {
    const finalScore = this.getTraineeFinalScore(tr);
    return ((finalScore / 100) * 4).toFixed(2);
  }


  setSubSection(sub: 'company' | 'trainer' | 'trainee' | 'supervisor') {
  this.currentSubSection = sub;
  this.trainerView = 'grid';
  this.traineeSubView = 'roster';

  if (sub === 'supervisor' && !this.supervisorDataLoaded) {
    this.loadSupervisorsData();
  }
 }


  // Load Supervisor Reports
  loadSupervisorsData(): void {
    this.supervisorLoading = true;
    this.supervisorError = '';

    this.api.getAdminSupervisorReports(
      this.supervisorYear,
      this.supervisorMonth
    ).subscribe({
      next: (data) => {
        this.allSupervisorsData = data;
        this.applySupervisorFilters();

        this.supervisorLoading = false;
        this.supervisorDataLoaded = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading supervisor reports:', err);

        this.allSupervisorsData = [];
        this.filteredSupervisorsList = [];
        this.supervisorError = 'تعذر تحميل تقارير المشرفين. حاول مرة أخرى.';
        this.supervisorLoading = false;
        this.supervisorDataLoaded = false;
        this.cdr.detectChanges();
      }
    });
  }

  applySupervisorFilters(): void {
    const search = this.supervisorSearchTerm.trim().toLowerCase();

    this.filteredSupervisorsList = this.allSupervisorsData.filter(s => {
      const matchesSearch =
        !search ||
        (s.fullName ?? '').toLowerCase().includes(search) ||
        (s.department ?? '').toLowerCase().includes(search) ||
        (s.companyName ?? '').toLowerCase().includes(search) ||
        String(s.supervisorId).includes(search);

      const matchesCompany =
        this.supervisorCompanyFilter === 'ALL' ||
        s.companyName === this.supervisorCompanyFilter;

      const matchesStatus =
        this.supervisorStatusFilter === 'ALL' ||
        s.status === this.supervisorStatusFilter;

      return matchesSearch && matchesCompany && matchesStatus;
    });
  }

  resetSupervisorFilters(): void {
    this.supervisorSearchTerm = '';
    this.supervisorCompanyFilter = 'ALL';
    this.supervisorStatusFilter = 'ALL';
    this.applySupervisorFilters();
  }









  levelClass(level?: string): string {
    if (!level) return 'level-default';
    const l = level.trim();
    if (l.includes('ممتاز')) return 'level-excellent';
    if (l.includes('جيد جدا') || l.includes('جيد جداً')) return 'level-very-good';
    if (l.includes('جيد')) return 'level-good';
    return 'level-default';
  }

  exportToPDF() {
    const styleId = 'nfd-print-override-style';
    let printStyle = document.getElementById(styleId) as HTMLStyleElement;
    if (!printStyle) {
      printStyle = document.createElement('style');
      printStyle.id = styleId;
      document.head.appendChild(printStyle);
    }

    printStyle.innerHTML = `
      @media print {
        body * {
          visibility: hidden !important;
        }

        .reports-container,
        .reports-container * {
          visibility: visible !important;
        }

        .reports-container {
          position: absolute !important;
          right: 0 !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 8mm 12mm !important;
          background: #ffffff !important;
          box-sizing: border-box !important;
        }

        .subsections-tabs-bar,
        .sub-view-nav-bar,
        .filter-toolbar-card,
        .actions-left,
        .card-footer,
        .card-footer-actions,
        .compact-pagination-wrapper,
        .back-btn,
        .btn-reset-filters,
        .no-print,
        button {
          display: none !important;
        }

        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .summary-metrics-grid {
          display: flex !important;
          flex-direction: row !important;
          justify-content: space-between !important;
          gap: 12px !important;
          margin-bottom: 20px !important;
          width: 100% !important;
          page-break-inside: avoid !important;
        }

        .metric-card {
          flex: 1 !important;
          padding: 12px 16px !important;
          border: 1px solid #cbd5e1 !important;
          box-shadow: none !important;
          background: #ffffff !important;
        }

        .table-card, .official-sheet-card {
          border: 1px solid #cbd5e1 !important;
          box-shadow: none !important;
          padding: 16px !important;
          width: 100% !important;
        }

        .custom-table, .official-table {
          width: 100% !important;
          border-collapse: collapse !important;
        }

        .custom-table th, .official-table th {
          background-color: #f8fafc !important;
          color: #0D1C8C !important;
          border: 1px solid #cbd5e1 !important;
          padding: 8px 10px !important;
          font-size: 11px !important;
        }

        .custom-table td, .official-table td {
          border: 1px solid #e2e8f0 !important;
          padding: 8px 10px !important;
          font-size: 10.5px !important;
          page-break-inside: avoid !important;
        }

        @page {
          size: A4 portrait;
          margin: 8mm;
        }
      }
    `;

    setTimeout(() => {
      window.print();
    }, 150);
  }

  exportToExcel() {
    const rows = this.filteredBatchReportRows;
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
    link.setAttribute('download', `Batch_${this.selectedBatch?.id || 'Report'}_Trainees.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportCompaniesToExcel() {
    const list = this.companies;
    if (!list || list.length === 0) {
      alert('لا توجد بيانات شركات لتصديرها');
      return;
    }
    const headers = ['اسم الشركة', 'السجل التجاري', 'مجال العمل', 'المدينة', 'الهاتف', 'المشرف', 'عدد البرامج', 'عدد الدفعات', 'إجمالي المتدربين'];
    const dataRows = list.map(c => [
      `"${c.name || ''}"`,
      `"${c.commercialRegister || ''}"`,
      `"${c.workField || ''}"`,
      `"${c.city || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.supervisorName || ''}"`,
      c.programsCount || 0,
      c.batchesCount || 0,
      c.traineesCount || 0
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...dataRows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_الشركات_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportTrainersToExcel() {
    const list = this.filteredTrainersList;
    if (!list || list.length === 0) {
      alert('لا توجد بيانات مدربين لتصديرها');
      return;
    }
    const headers = ['اسم المدرب', 'التخصص', 'التقييم العام', 'سنوات الخبرة', 'إجمالي الساعات', 'عدد الدفعات', 'عدد الإنذارات'];
    const dataRows = list.map(t => [
  `"${String(t.name ?? '').replace(/"/g, '""')}"`,
  `"${String(t.specialization ?? '').replace(/"/g, '""')}"`,
  t.rating ?? 'غير متوفر',
  t.experienceYears ?? 'غير متوفر',
  t.totalHours ?? 'غير متوفر',
  t.batchesCount ?? 'غير متوفر',
  t.warningsCount ?? 'غير متوفر'
]);
    const csvContent = '\uFEFF' + [headers.join(','), ...dataRows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_المدربين_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportTraineesToExcel() {
    const list = this.filteredTraineesList;
    if (!list || list.length === 0) {
      alert('لا توجد بيانات متدربين لتصديرها');
      return;
    }
    const headers = ['الرقم الأكاديمي', 'اسم المتدرب', 'الشركة الراعية', 'التخصص', 'المدرب المشرف', 'الحضور (15%)', 'التقني (35%)', 'المشروع (30%)', 'السلوكي (20%)', 'المجموع الكلي (100%)', 'المستوى'];
    const dataRows = list.map(t => [
      `"NFD-${t.traineeId || ''}"`,
      `"${t.traineeName || ''}"`,
      `"${t.companyName || ''}"`,
      `"${t.major || ''}"`,
      `"${t.assignedTrainer || ''}"`,
      (t.attendanceRate || 0) + '%',
      (t.technicalScore || 0) + '%',
      (t.projectScore || t.technicalScore || 0) + '%',
      (t.behavioralScore || 0) + '%',
      this.getTraineeFinalScore(t) + '%',
      `"${t.level || ''}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...dataRows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `كشف_درجات_المتدربين_المعتمد_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}