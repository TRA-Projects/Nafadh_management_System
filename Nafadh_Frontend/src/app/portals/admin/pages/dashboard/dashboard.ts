import { NafadhConstantsService } from '../../../../core/services/nafadh-constants.service';
import { traineeAttendanceKey } from '../../../../core/models/enums';
import { Component, OnInit, AfterViewInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminApi } from '../../services/admin-api';
import { NafadhWarningTypesService } from '../../../../core/services/nafadh-warning-types.service';
import { AuditLogDto, DashboardChartsDto, BatchDto, AnnouncementDto } from '../../../../core/models/dtos';
import Chart, { TooltipItem } from 'chart.js/auto';

export interface AdminDashboardSummary {
  totalTrainees: number;
  activeTrainees: number;
  totalCompanies: number;
  totalBatches: number;
  totalCertificates: number;
  overallAttendanceRate: number;
  topPerformersCount: number;
  topPerformersAvgScore: number;
  atRiskCount: number;
  capacity: {
    total: number;
    used: number;
    remaining: number;
  };

  attendanceWeeks: { label: string; value: number }[];
  companyDistribution: { label: string; value: number }[];
  programDistribution: { label: string; value: number }[];
  topPerformers: {
    traineeId: number;
    enrollmentId: number;
    fullName?: string;
    major?: string;
    companyName?: string;
    gitHubUrl?: string;
    linkedInUrl?: string;
    performancePercent: number;
    attendancePercent: number;
  }[];
  atRiskTrainees: {
    traineeId: number;
    enrollmentId: number;
    fullName?: string;
    major?: string;
    companyName?: string;
    gitHubUrl?: string;
    linkedInUrl?: string;
    performancePercent: number;
    attendancePercent: number;
  }[];
  recentWarnings: {
    warningId: number;
    scope: string;
    traineeId?: number;
    companyId?: number;
    targetName?: string;
    gitHubUrl?: string;
    linkedInUrl?: string;
    type: string;
    level: string;
    status: string;
    issuedDate: string;
  }[];
}

export interface SelectedTraineeDetailView {
  traineeId: number;
  enrollmentId?: number;
  fullName: string;
  initials: string;
  avatarColor: string;

  age?: number;
  nationalId?: string;
  university?: string;
  major?: string;
  academicLevel?: string;
  email?: string;
  phone?: string;

  trackName?: string;
  programName?: string;
  batchName?: string;
  companyName?: string;
  supervisorName?: string;
  trainerName?: string;

  performancePercent?: number;
  technicalScore?: number;
  behavioralScore?: number;
  moduleProgressPercent?: number;
  attendancePercent?: number;

  presentDays?: number;
  absentDays?: number;
  lateDays?: number;
  excusedDays?: number;

  trainerNotes?: string;
  lastEvaluationDate?: string;
  skills?: string[];

  gitHubUrl?: string;
  linkedInUrl?: string;
  resumeUrl?: string;

  warnings: {
    warningId: number;
    type: string;
    level: string;
    status: string;
    date: string;
    reason: string;
  }[];
}

export interface SelectedWarningDetailView {
  warningId: number;
  scope: string;
  targetName: string;
  companyId?: number;
  type: string;
  typeArabic: string;
  level: string;
  status: string;
  statusArabic: string;
  issuedDate: string;
  evidence: string;
  resolution: string;
  companyCapacity: number;
  companyContact: string;
  companyEmail: string;
  companyLocation: string;
  totalWarningsForTarget: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class AdminDashboard implements OnInit, AfterViewInit, OnDestroy {
  readonly constants = inject(NafadhConstantsService);
  readonly warningTypes = inject(NafadhWarningTypesService);
  summary = signal<AdminDashboardSummary | null>(null);
  // Admin Dashboard performance period filter
performancePeriod = signal<'month' | 'year' | 'all' | 'custom'>('month');

performanceStartDate = signal<string>('');
performanceEndDate = signal<string>('');

performancePeriodLoading = signal<boolean>(false);
performancePeriodError = signal<string>('');

private performanceRequestId = 0;

private getPerformancePeriodDates(): {
  startDate: string | null;
  endDate: string | null;
} {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  switch (this.performancePeriod()) {
    case 'month':
      return {
        startDate: `${year}-${month}-01`,
        endDate: `${year}-${month}-${new Date(year, today.getMonth() + 1, 0).getDate()}`
      };

    case 'year':
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`
      };

    case 'all':
      return {
        startDate: null,
        endDate: null
      };

    case 'custom':
      return {
        startDate: this.performanceStartDate() || null,
        endDate: this.performanceEndDate() || null
      };
  }
}

changePerformancePeriod(value: string): void {
  if (
    value !== 'month' &&
    value !== 'year' &&
    value !== 'all' &&
    value !== 'custom'
  ) {
    return;
  }

  this.performancePeriod.set(value);

  if (value !== 'custom') {
    this.loadPerformancePeriod();
  }
}

applyCustomPerformancePeriod(): void {
  const start = this.performanceStartDate();
  const end = this.performanceEndDate();

  if (!start || !end) {
    this.performancePeriodError.set('يرجى تحديد تاريخ البداية والنهاية.');
    return;
  }

  if (start > end) {
    this.performancePeriodError.set('تاريخ البداية يجب ألا يكون بعد تاريخ النهاية.');
    return;
  }

  this.loadPerformancePeriod();
}

loadPerformancePeriod(): void {
  const dates = this.getPerformancePeriodDates();

  const requestId = ++this.performanceRequestId;

  this.performancePeriodLoading.set(true);
  this.performancePeriodError.set('');

  this.api.getAdminDashboardSummaryByPeriod(
    dates.startDate,
    dates.endDate
  ).subscribe({
    next: (result: AdminDashboardSummary) => {
      if (requestId !== this.performanceRequestId) return;

      this.summary.update(current => {
        if (!current) return current;

        return {
          ...current,
          topPerformersCount: result.topPerformersCount,
          topPerformersAvgScore: result.topPerformersAvgScore,
          atRiskCount: result.atRiskCount,
          topPerformers: result.topPerformers || [],
          atRiskTrainees: result.atRiskTrainees || []
        };
      });

      this.allTopPerformers.set(result.topPerformers || []);
      this.allAtRiskTrainees.set(result.atRiskTrainees || []);

      this.topPage.set(1);
      this.riskPage.set(1);

      this.performancePeriodLoading.set(false);
    },
    error: () => {
      if (requestId !== this.performanceRequestId) return;

      this.performancePeriodError.set('تعذر تحميل بيانات الفترة المحددة.');
      this.performancePeriodLoading.set(false);
    }
  });
}

  announcements = signal<any[]>([]);
  showAnnouncements = signal<boolean>(true);
  isLoading = signal<boolean>(false);
  lastUpdated = signal<Date | null>(new Date());
  showRefreshToast = signal<boolean>(false);


  // --- متغيرات فلترة صفحة المتميزين ---
  topLimit = signal<number>(0); // 0 تعني عرض الكل
  topSearchQuery = signal<string>('');
  topSelectedProgram = signal<string>('all');
  topSelectedCompany = signal<string>('all');
  topSortBy = signal<string>('score_desc');

  // استخراج البرامج الفريدة تلقائياً
  availableTopPrograms = computed(() => {
    const list = this.allTopPerformers().map(t => t.major).filter(Boolean);
    return Array.from(new Set(list));
  });

  // استخراج الشركات الفريدة تلقائياً
  availableTopCompanies = computed(() => {
    const list = this.allTopPerformers().map(t => t.companyName).filter(Boolean);
    return Array.from(new Set(list));
  });

  // التحقق هل الفلاتر مفعلة
  hasTopActiveFilters = computed(() => {
    return (
      this.topLimit() !== 0 ||
      this.topSearchQuery().trim() !== '' ||
      this.topSelectedProgram() !== 'all' ||
      this.topSelectedCompany() !== 'all' ||
      this.topSortBy() !== 'score_desc'
    );
  });

  // المتدربون المفلترون حسب الاختيارات
  filteredTopPerformers = computed(() => {
    let list = [...this.allTopPerformers()];

    // 1. البحث النصي (اسم، برنامج، شركة)
    const q = this.topSearchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        (t.fullName && t.fullName.toLowerCase().includes(q)) ||
        (t.major && t.major.toLowerCase().includes(q)) ||
        (t.companyName && t.companyName.toLowerCase().includes(q))
      );
    }

    // 2. فلتر البرنامج
    if (this.topSelectedProgram() !== 'all') {
      list = list.filter(t => t.major === this.topSelectedProgram());
    }

    // 3. فلتر الشركة
    if (this.topSelectedCompany() !== 'all') {
      list = list.filter(t => t.companyName === this.topSelectedCompany());
    }

    // 4. الترتيب
    const sort = this.topSortBy();
    list.sort((a, b) => {
      if (sort === 'score_desc') return (b.performancePercent || 0) - (a.performancePercent || 0);
      if (sort === 'attendance_desc') return (b.attendancePercent || 0) - (a.attendancePercent || 0);
      if (sort === 'name_asc') return (a.fullName || '').localeCompare(b.fullName || '', 'ar');
      return 0;
    });

    // 5. تطبيق تحديد العدد (3 أو 5 أو 10 أو 20 أو الكل)
    const limit = this.topLimit();
    if (limit > 0) {
      list = list.slice(0, limit);
    }

    return list;
  });

  // حساب متوسط الأداء للنتائج المفلترة
  currentFilteredAvgScore = computed(() => {
    const list = this.filteredTopPerformers();
    if (list.length === 0) return 0;
    const total = list.reduce((sum, item) => sum + (item.performancePercent || 0), 0);
    return Math.round((total / list.length) * 10) / 10;
  });

  // دوال التحكم
  setTopLimit(limit: number) { this.topLimit.set(limit); this.topPage.set(1); }
  onTopSearchInput(e: Event) { this.topSearchQuery.set((e.target as HTMLInputElement).value); this.topPage.set(1); }
  clearTopSearch() { this.topSearchQuery.set(''); this.topPage.set(1); }
  onTopProgramChange(e: Event) { this.topSelectedProgram.set((e.target as HTMLSelectElement).value); this.topPage.set(1); }
  onTopCompanyChange(e: Event) { this.topSelectedCompany.set((e.target as HTMLSelectElement).value); this.topPage.set(1); }
  onTopSortChange(e: Event) { this.topSortBy.set((e.target as HTMLSelectElement).value); this.topPage.set(1); }
  resetTopFilters() {
    this.topLimit.set(0);
    this.topSearchQuery.set('');
    this.topSelectedProgram.set('all');
    this.topSelectedCompany.set('all');
    this.topSortBy.set('score_desc');
    this.topPage.set(1);
  }

  // --- متغيرات فلترة صفحة المتعثرين ---
  riskLimit = signal<number>(0); // 0 تعني عرض الكل
  riskSearchQuery = signal<string>('');
  riskSelectedProgram = signal<string>('all');
  riskSelectedCompany = signal<string>('all');
  riskSeverity = signal<string>('all');
  riskSortBy = signal<string>('attendance_asc'); // الأكثر حرجاً أولاً

  // استخراج البرامج والشركات الخاصة بالمتعثرين
  availableRiskPrograms = computed(() => {
    const list = this.allAtRiskTrainees().map(t => t.major).filter(Boolean);
    return Array.from(new Set(list));
  });

  availableRiskCompanies = computed(() => {
    const list = this.allAtRiskTrainees().map(t => t.companyName).filter(Boolean);
    return Array.from(new Set(list));
  });

  // هل توجد فلاتر مفعلة في صفحة المتعثرين؟
  hasRiskActiveFilters = computed(() => {
    return (
      this.riskLimit() !== 0 ||
      this.riskSearchQuery().trim() !== '' ||
      this.riskSelectedProgram() !== 'all' ||
      this.riskSelectedCompany() !== 'all' ||
      this.riskSeverity() !== 'all' ||
      this.riskSortBy() !== 'attendance_asc'
    );
  });

  // المتعثرون بعد تطبيق الفلترة
  filteredAtRiskTrainees = computed(() => {
    let list = [...this.allAtRiskTrainees()];

    // 1. البحث النصي (اسم، تخصص، شركة)
    const q = this.riskSearchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        (t.fullName && t.fullName.toLowerCase().includes(q)) ||
        (t.major && t.major.toLowerCase().includes(q)) ||
        (t.companyName && t.companyName.toLowerCase().includes(q))
      );
    }

    // 2. فلتر شدة الخطورة (حضور < 60% أو 60-70% أو 70-79%)
    if (this.riskSeverity() !== 'all') {
      if (this.riskSeverity() === 'critical') {
        list = list.filter(t => (t.attendancePercent || 0) < 60);
      } else if (this.riskSeverity() === 'moderate') {
        list = list.filter(t => (t.attendancePercent || 0) >= 60 && (t.attendancePercent || 0) < 70);
      } else if (this.riskSeverity() === 'warning') {
        list = list.filter(t => (t.attendancePercent || 0) >= 70 && (t.attendancePercent || 0) < 80);
      }
    }

    // 3. فلتر البرنامج
    if (this.riskSelectedProgram() !== 'all') {
      list = list.filter(t => t.major === this.riskSelectedProgram());
    }

    // 4. فلتر الشركة
    if (this.riskSelectedCompany() !== 'all') {
      list = list.filter(t => t.companyName === this.riskSelectedCompany());
    }

    // 5. الترتيب
    const sort = this.riskSortBy();
    list.sort((a, b) => {
      if (sort === 'attendance_asc') return (a.attendancePercent || 0) - (b.attendancePercent || 0);
      if (sort === 'attendance_desc') return (b.attendancePercent || 0) - (a.attendancePercent || 0);
      if (sort === 'name_asc') return (a.fullName || '').localeCompare(b.fullName || '', 'ar');
      return 0;
    });

    // 6. تطبيق تحديد العدد (أول 3 أو 5 أو 10 أو الكل)
    const limit = this.riskLimit();
    if (limit > 0) {
      list = list.slice(0, limit);
    }

    return list;
  });

  // حساب متوسط حضور المتعثرين المفلترين
  currentFilteredRiskAvgAttendance = computed(() => {
    const list = this.filteredAtRiskTrainees();
    if (list.length === 0) return 0;
    const total = list.reduce((sum, item) => sum + (item.attendancePercent || 0), 0);
    return Math.round((total / list.length) * 10) / 10;
  });

  // دوال التحكم بالمتعثرين
  setRiskLimit(limit: number) { this.riskLimit.set(limit); this.riskPage.set(1); }
  onRiskSearchInput(e: Event) { this.riskSearchQuery.set((e.target as HTMLInputElement).value); this.riskPage.set(1); }
  clearRiskSearch() { this.riskSearchQuery.set(''); this.riskPage.set(1); }
  onRiskSeverityChange(e: Event) { this.riskSeverity.set((e.target as HTMLSelectElement).value); this.riskPage.set(1); }
  onRiskProgramChange(e: Event) { this.riskSelectedProgram.set((e.target as HTMLSelectElement).value); this.riskPage.set(1); }
  onRiskCompanyChange(e: Event) { this.riskSelectedCompany.set((e.target as HTMLSelectElement).value); this.riskPage.set(1); }
  onRiskSortChange(e: Event) { this.riskSortBy.set((e.target as HTMLSelectElement).value); this.riskPage.set(1); }
  resetRiskFilters() {
    this.riskLimit.set(0);
    this.riskSearchQuery.set('');
    this.riskSeverity.set('all');
    this.riskSelectedProgram.set('all');
    this.riskSelectedCompany.set('all');
    this.riskSortBy.set('attendance_asc');
    this.riskPage.set(1);
  }

  // حالة عرض صفحة المتدرب التفصيلية الكاملة


  selectedTraineeProfile = signal<SelectedTraineeDetailView | null>(null);
  selectedWarningDetail = signal<SelectedWarningDetailView | null>(null);

  allTopPerformers = signal<any[]>([]);
  showAllTopPerformersPage = signal<boolean>(false);
  allAtRiskTrainees = signal<any[]>([]);
  showAllAtRiskPage = signal<boolean>(false);
  isProfileLoading = signal<boolean>(false);

  recentActivity = signal<AuditLogDto[]>([]);
  allActivity = signal<AuditLogDto[]>([]);
  showAllActivity = signal<boolean>(false);
  activityPage = signal<number>(1);
  readonly activityPageSize = 10;

  totalActivityPages = computed(() => {
    const total = this.allActivity().length;
    return Math.max(1, Math.ceil(total / this.activityPageSize));
  });

  // Pagination - Top Performers
  topPage = signal<number>(1);
  readonly topPageSize = 10;

  totalTopPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredTopPerformers().length / this.topPageSize))
  );

  paginatedTopPerformers = computed(() => {
    const start = (this.topPage() - 1) * this.topPageSize;
    return this.filteredTopPerformers().slice(start, start + this.topPageSize);
  });

  visibleTopPages = computed(() => {
    const total = this.totalTopPages();
    const current = this.topPage();
    const start = Math.max(1, Math.min(current - 2, total - 4));

    return Array.from(
      { length: Math.min(5, total) },
      (_, i) => start + i
    );
  });

  goToTopPage(page: number): void {
    if (page < 1 || page > this.totalTopPages()) return;
    this.topPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Pagination - At Risk
  riskPage = signal<number>(1);
  readonly riskPageSize = 10;

  totalRiskPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredAtRiskTrainees().length / this.riskPageSize))
  );

  paginatedAtRiskTrainees = computed(() => {
    const start = (this.riskPage() - 1) * this.riskPageSize;
    return this.filteredAtRiskTrainees().slice(start, start + this.riskPageSize);
  });

  visibleRiskPages = computed(() => {
    const total = this.totalRiskPages();
    const current = this.riskPage();
    const start = Math.max(1, Math.min(current - 2, total - 4));

    return Array.from(
      { length: Math.min(5, total) },
      (_, i) => start + i
    );
  });

  goToRiskPage(page: number): void {
    if (page < 1 || page > this.totalRiskPages()) return;
    this.riskPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  visibleActivityPages = computed(() => {
    const total = this.totalActivityPages();
    const current = this.activityPage();
    const pages: number[] = [];
    const start = Math.max(1, Math.min(current - 2, total - 4));
    const end = Math.min(total, start + 4);
    for (let i = Math.max(1, start); i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  charts = signal<DashboardChartsDto | null>(null);
  traineeCount = signal<number | null>(null);
  companyCount = signal<number | null>(null);
  batchCount = signal<number | null>(null);

  allBatches = signal<BatchDto[]>([]);
  allTraineesCache = signal<any[]>([]);
  allCompaniesCache = signal<any[]>([]);
  allWarningsCache = signal<any[]>([]);
  availableYears = signal<string[]>([]);
  selectedYear = signal<string>(new Date().getFullYear().toString());

  capacityPercent = computed(() => {
    const cap = this.summary()?.capacity;
    if (!cap || !cap.total || cap.total <= 0) return 0;
    return Math.min(100, Math.round((cap.used / cap.total) * 100));
  });

  maxDistributionValue = computed(() => {
    const list = this.summary()?.programDistribution || [];
    if (!list.length) return 1;
    return Math.max(...list.map(x => x.value), 1);
  });

  private barChartInstance: Chart | null = null;
  private donutChartInstance: Chart | null = null;

  constructor(
    private api: AdminApi,
    private router: Router
  ) { }

  ngOnInit() {
    this.constants.ensure('NFD_WRN_SCOPE', 'NFD_WRN_LVL');
    this.warningTypes.refresh();
    this.loadAllDashboardData();
  }

  loadAllDashboardData(isManualRefresh: boolean = false) {
    this.isLoading.set(true);
    const cacheBuster = Date.now();

    this.api.getAnnouncements().pipe(catchError(() => of([]))).subscribe((items: AnnouncementDto[]) => {
      this.announcements.set((items || []).slice(0, 5));
    });

    this.api.getRecentAudit().pipe(catchError(() => of([]))).subscribe((data: any) => {
      const sorted = (data || []).sort((a: any, b: any) => {
        const timeA = new Date(a.timestamp ?? a.createdAt ?? 0).getTime();
        const timeB = new Date(b.timestamp ?? b.createdAt ?? 0).getTime();
        return timeB - timeA;
      });
      this.allActivity.set(sorted);
      this.updateDisplayedActivity();
    });

    // Load dashboard charts from backend and update both chart types.
    this.api.getDashboardCharts().pipe(
      catchError(() => of(null))
    ).subscribe((c: any) => {
      this.charts.set(c);

      if (c) {
        this.updateBarChartData(c);
        this.updateDonutChartData();
      }
    });

    forkJoin({
      traineesRes: this.api.getTrainees({ page: 1, pageSize: 2000, _t: cacheBuster }).pipe(catchError(() => of({ items: [], totalCount: 0 }))),
      companies: this.api.getCompanies().pipe(catchError(() => of([]))),
      batches: this.api.getBatches().pipe(catchError(() => of([]))),
      warnings: this.api.getWarnings({ _t: cacheBuster }).pipe(catchError(() => of([]))),
      // ملخص Dashboard مطلوب من Backend؛ لا نستخدم بيانات بديلة عند غياب الدالة أو فشل الطلب.
      adminSummary: this.api.getAdminDashboardSummary().pipe(catchError(() => of(null)))
    }).subscribe(({ traineesRes, companies, batches, warnings, adminSummary }: any) => {
      const traineesList: any[] = traineesRes?.items || (Array.isArray(traineesRes) ? traineesRes : []);
      const totalTrainees = traineesRes?.totalCount || traineesList.length || 0;
      const companiesList: any[] = companies || [];
      const batchesList: any[] = batches || [];
      const warningsList: any[] = Array.isArray(warnings) ? warnings : (warnings?.items || []);

      this.allTraineesCache.set(traineesList);
      this.allCompaniesCache.set(companiesList);
      this.allWarningsCache.set(warningsList);
      this.traineeCount.set(totalTrainees);
      this.companyCount.set(companiesList.length);
      this.batchCount.set(batchesList.length);
      this.allBatches.set(batchesList);

      const years: string[] = Array.from(
        new Set(
          batchesList
            .map((batch: any) => batch.startDate ? new Date(batch.startDate).getFullYear().toString() : null)
            .filter((y: any): y is string => y !== null)
        )
      ).sort((a: string, b: string) => b.localeCompare(a));

      if (years.length > 0) {
        this.availableYears.set(years);
        if (!years.includes(this.selectedYear())) {
          this.selectedYear.set(years[0]);
        }
      }

      // مصدر أرقام ومؤشرات لوحة الإدارة هو ملخص Backend فقط؛ لا نستبدل القيم بحسابات محلية.
            const summaryData = adminSummary as AdminDashboardSummary | null;
      if (summaryData) {
        this.summary.set(summaryData);
        this.allTopPerformers.set(summaryData.topPerformers || []);
        this.allAtRiskTrainees.set(summaryData.atRiskTrainees || []);
      } else {
        // عند فشل الملخص نعرض حالة بلا بيانات بدل إنشاء أرقام تقديرية.
        this.summary.set(null);
        this.allTopPerformers.set([]);
        this.allAtRiskTrainees.set([]);
      }

      // تحميل مؤشرات المتميزين والمتعثرين حسب الفترة المحددة فقط
      if (summaryData) {
        if (
          this.performancePeriod() !== 'custom' ||
          (this.performanceStartDate() && this.performanceEndDate())
        ) {
          this.loadPerformancePeriod();
        }
      }

      this.finishLoading(isManualRefresh);
    });
  }

  private finishLoading(isManualRefresh: boolean) {
    this.lastUpdated.set(new Date());
    this.isLoading.set(false);
    if (isManualRefresh) {
      this.showRefreshToast.set(true);
      setTimeout(() => this.showRefreshToast.set(false), 2500);
    }
  }

  // لا تُنشأ مؤشرات Dashboard محلياً؛ مصدرها الوحيد هو Report/dashboard-summary.

  onWarningItemPreview(w: any, index: number = 0) {
    const target = String(w?.targetName || '');
    const isCompanyWarning =
      w?.scope === 'Company' ||
      (!!w?.companyId && !w?.traineeId) ||
      target.includes('شركة') ||
      target.includes('مجموعة') ||
      target.includes('مؤسسة');

    if (isCompanyWarning) {
      this.openWarningPreview(w);
    } else {
      this.openTraineePreview(w, index);
    }
  }

  // Load the selected warning details directly from the backend.
  openWarningPreview(w: any): void {
    const warningId = Number(w?.warningId ?? w?.id);

    if (!warningId) {
      return;
    }

    this.selectedTraineeProfile.set(null);
    this.showAllTopPerformersPage.set(false);
    this.showAllAtRiskPage.set(false);

    this.isProfileLoading.set(true);

    this.api.getWarningById(warningId).pipe(
      catchError(() => of(null))
    ).subscribe((warning: any) => {
      this.isProfileLoading.set(false);

      if (!warning) {
        this.selectedWarningDetail.set(null);
        return;
      }

      const typeRaw = String(warning.type ?? '');
      const levelRaw = String(warning.level ?? '');
      const statusRaw = String(warning.status ?? '');

      const typeArabic = this.warningTypes.label(typeRaw);

      const statusArabic =
        statusRaw.toLowerCase().includes('resolved') ? 'تمت المعالجة' :
          statusRaw.toLowerCase().includes('underreview') ? 'قيد المراجعة' :
            statusRaw.toLowerCase().includes('escalated') ? 'تم التصعيد' :
              statusRaw.toLowerCase().includes('open') ? 'مفتوح' :
                statusRaw || '—';

      const targetName = warning.targetName || '—';

      this.selectedWarningDetail.set({
        warningId: warning.warningId,
        scope: String(warning.scope ?? ''),
        targetName,
        companyId: warning.companyId ?? undefined,
        type: typeRaw || '—',
        typeArabic,
        level: levelRaw || '—',
        status: statusRaw || '—',
        statusArabic,
        issuedDate: warning.issuedDate
          ? String(warning.issuedDate).slice(0, 10)
          : '—',
        evidence: warning.evidence || 'لا توجد تفاصيل مسجلة',
        resolution: warning.resolution || 'لم يتم تسجيل إجراء المعالجة',
        companyCapacity: 0,
        companyContact: '—',
        companyEmail: '—',
        companyLocation: '—',
        totalWarningsForTarget: 0
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  closeWarningPreview() {
    this.selectedWarningDetail.set(null);
  }

  openTraineePreview(traineeItem: any, index: number = 0) {
    this.selectedWarningDetail.set(null);

    const candidateName = traineeItem?.fullName || traineeItem?.targetName || '';
    const cachedTrainee = this.allTraineesCache().find((t: any) =>
      (traineeItem?.traineeId && (t.traineeId ?? t.id) === traineeItem.traineeId) ||
      (candidateName && t.fullName === candidateName)
    ) || {};

    const traineeId = traineeItem?.traineeId || cachedTrainee?.traineeId || cachedTrainee?.id || 0;
    const fullName = candidateName || cachedTrainee?.fullName || 'متدرب المنظومة';
    // Use only performance and attendance values received from the backend.
    const perf = traineeItem?.performancePercent != null
      ? Number(traineeItem.performancePercent)
      : undefined;

    const att = traineeItem?.attendancePercent != null
      ? Number(traineeItem.attendancePercent)
      : undefined;
    const clickedWarningList: {
      warningId: number;
      type: string;
      level: string;
      status: string;
      date: string;
      reason: string;
    }[] = [];

    // Add warning details only when they exist in backend data.
    if (traineeItem?.warningId) {
      const rawWarn = this.allWarningsCache().find(
        (w: any) => Number(w.warningId ?? w.id) === Number(traineeItem.warningId)
      );

      if (rawWarn) {
        clickedWarningList.push({
          warningId: Number(rawWarn.warningId ?? rawWarn.id),
          type: rawWarn.type ?? '—',
          level: rawWarn.level ?? '—',
          status: rawWarn.status ?? '—',
          date: rawWarn.issuedDate
            ? String(rawWarn.issuedDate).slice(0, 10)
            : '—',
          reason: rawWarn.evidence ?? rawWarn.resolution ?? '—'
        });
      }
    }

    // Build trainee profile using only available real data; avoid fabricated defaults.
    const initialView: SelectedTraineeDetailView = {
      traineeId,
      enrollmentId: traineeItem?.enrollmentId ?? cachedTrainee?.enrollmentId,
      fullName,
      initials: this.getInitials(fullName),
      avatarColor: this.getAvatarColor(index),
      nationalId: cachedTrainee?.nationalId ?? '',
      university: cachedTrainee?.university ?? '—',
      major: traineeItem?.major ?? cachedTrainee?.major ?? '—',
      academicLevel: cachedTrainee?.academicLevel ?? '—',
      email: cachedTrainee?.email ?? '—',
      phone: cachedTrainee?.phone ?? '—',
      trackName: cachedTrainee?.trackName ?? '—',
      programName: cachedTrainee?.programName ?? '—',
      batchName: cachedTrainee?.batchName ?? '—',
      companyName: traineeItem?.companyName ?? cachedTrainee?.companyName ?? '—',
      performancePercent: perf,
      attendancePercent: att,
      gitHubUrl: this.getSafeGitHubUrl(
        traineeItem?.gitHubUrl || cachedTrainee?.gitHubUrl,
      ),
      linkedInUrl: this.getSafeLinkedInUrl(
        traineeItem?.linkedInUrl || cachedTrainee?.linkedInUrl,
      ),
      resumeUrl: cachedTrainee?.resumeUrl,
      warnings: clickedWarningList
    };

    this.selectedTraineeProfile.set(initialView);
    this.isProfileLoading.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (!traineeId) {
      this.isProfileLoading.set(false);
      return;
    }

    forkJoin({
      profile: this.api.getTrainee(traineeId).pipe(catchError(() => of(null))),
      enrollments: this.api.getEnrollmentsByTrainee(traineeId).pipe(catchError(() => of([]))),
      progress: this.api.getTraineeProgressPercentage(traineeId).pipe(catchError(() => of(null)))
    }).subscribe(({ profile, enrollments, progress }: any) => {
      const enrList: any[] = Array.isArray(enrollments) ? enrollments : [];
      const firstEnr = enrList[0] || {};
      const enrollmentId = firstEnr.enrollmentId || initialView.enrollmentId;

      // Read trainee skills without creating fallback sample data.
      const skillsArr = profile?.skills
        ? String(profile.skills)
          .split(/[,،|]/)
          .map((s: string) => s.trim())
          .filter(Boolean)
        : (initialView.skills ?? []);

      const matchedBatch = this.allBatches().find((b: any) => (b.batchId ?? b.id) === firstEnr.batchId);

      forkJoin({
        dailyAtt: enrollmentId ? this.api.getDailyAttendanceByEnrollment(enrollmentId).pipe(catchError(() => of([]))) : of([]),
        evals: enrollmentId ? this.api.getEvaluationsByEnrollment(enrollmentId).pipe(catchError(() => of([]))) : of([])
      }).subscribe(({ dailyAtt, evals }: any) => {
        const attList: any[] = Array.isArray(dailyAtt) ? dailyAtt : [];
        const evalList: any[] = Array.isArray(evals) ? evals : [];

        const statuses = attList.map(a => traineeAttendanceKey(a.status));
        const presentCount = statuses.filter(s => s === 'Present').length;
        const absentCount = statuses.filter(s => s === 'Absent').length;
        const lateCount = statuses.filter(s => s === 'Late').length;
        const excusedCount = statuses.filter(s => s === 'Excused').length;

        const latestEval = evalList[0];
        const evalNotes = latestEval?.feedback || latestEval?.notes || latestEval?.comment || initialView.trainerNotes;
        const evalTrainer = latestEval?.trainerName || firstEnr?.trainerName || initialView.trainerName;

        const traineeWarnings = this.allWarningsCache()
          .filter((w: any) =>
            w.traineeId === traineeId ||
            (enrollmentId && w.enrollmentId === enrollmentId) ||
            (w.targetName && w.targetName === fullName) ||
            (w.traineeName && w.traineeName === fullName)
          )
          .map((w: any) => ({
            warningId: w.warningId ?? w.id ?? 0,
            type: w.type ?? '—',
            level: w.level ?? '—',
            status: w.status ?? '—',
            date: w.issuedDate || w.createdAt
              ? String(w.issuedDate || w.createdAt).slice(0, 10)
              : '—',
            reason: w.evidence ?? w.resolution ?? '—'
          }));

        const finalWarnings = [...traineeWarnings];
        clickedWarningList.forEach(cw => {
          if (!finalWarnings.some(fw => fw.warningId === cw.warningId)) {
            finalWarnings.unshift(cw);
          }
        });

        this.selectedTraineeProfile.set({
          ...initialView,
          enrollmentId,
          fullName: profile?.fullName || initialView.fullName,
          nationalId: String(profile?.nationalId || initialView.nationalId),
          university: profile?.university || initialView.university,
          major: profile?.major || initialView.major,
          academicLevel: profile?.academicLevel || initialView.academicLevel,
          email: profile?.email || initialView.email,
          phone: profile?.phone || initialView.phone,
          companyName: profile?.companyName || firstEnr?.companyName || initialView.companyName,
          batchName: firstEnr?.batchName || matchedBatch?.batchName || (matchedBatch as any)?.name || initialView.batchName,
          programName: firstEnr?.programName || matchedBatch?.programName || initialView.programName,
          trackName: firstEnr?.trackName || matchedBatch?.trackName || initialView.trackName,
          supervisorName: firstEnr?.supervisorName || initialView.supervisorName,
          trainerName: evalTrainer,
          moduleProgressPercent: progress?.percentage != null ? Math.round(Number(progress.percentage)) : initialView.moduleProgressPercent,
          presentDays: attList.length > 0 ? presentCount : initialView.presentDays,
          absentDays: attList.length > 0 ? absentCount : initialView.absentDays,
          lateDays: attList.length > 0 ? lateCount : initialView.lateDays,
          excusedDays: attList.length > 0 ? excusedCount : initialView.excusedDays,
          trainerNotes: evalNotes,
          skills: skillsArr,
          gitHubUrl: this.getSafeGitHubUrl(
            profile?.gitHubUrl || initialView.gitHubUrl
          ),
          linkedInUrl: this.getSafeLinkedInUrl(
            profile?.linkedInUrl || initialView.linkedInUrl
          ),
          warnings: finalWarnings
        });

        this.isProfileLoading.set(false);
      });
    });
  }

  closeTraineePreview() {
    this.selectedTraineeProfile.set(null);
  }

  openTopPerformersPage(): void {
    this.selectedTraineeProfile.set(null);
    this.selectedWarningDetail.set(null);
    this.showAllAtRiskPage.set(false);
    this.showAllTopPerformersPage.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeTopPerformersPage(): void {
    this.showAllTopPerformersPage.set(false);
  }

  openAtRiskPage(): void {
    this.selectedTraineeProfile.set(null);
    this.selectedWarningDetail.set(null);
    this.showAllTopPerformersPage.set(false);
    this.showAllAtRiskPage.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeAtRiskPage(): void {
    this.showAllAtRiskPage.set(false);
  }

  // Return social links only when valid URLs exist in backend data.
  getSafeGitHubUrl(url?: string): string {
    return url && url.startsWith('https://') ? url : '';
  }

  getSafeLinkedInUrl(url?: string): string {
    return url && url.startsWith('https://') ? url : '';
  }

  ngAfterViewInit() {
    this.initBarChart();
    this.initDonutChart();

    // Apply backend chart data after chart instances are initialized.
    this.updateBarChartData(this.charts());
    this.updateDonutChartData();
  }

  ngOnDestroy() {
    if (this.barChartInstance) this.barChartInstance.destroy();
    if (this.donutChartInstance) this.donutChartInstance.destroy();
  }

  refreshData() {
    if (this.isLoading()) return;

    if (this.barChartInstance) {
      this.barChartInstance.reset();
    }
    if (this.donutChartInstance) {
      this.donutChartInstance.reset();
    }

    this.loadAllDashboardData(true);
  }

  toggleAnnouncements() {
    this.showAnnouncements.update(v => !v);
  }

  toggleShowAllActivity() {
    this.showAllActivity.update(val => !val);
    this.activityPage.set(1);
    this.updateDisplayedActivity();
  }

  goToActivityPage(page: number) {
    const max = this.totalActivityPages();
    if (page < 1 || page > max) return;
    this.activityPage.set(page);
    this.updateDisplayedActivity();
  }

  private updateDisplayedActivity() {
    const all = this.allActivity();
    if (this.showAllActivity()) {
      const start = (this.activityPage() - 1) * this.activityPageSize;
      this.recentActivity.set(all.slice(start, start + this.activityPageSize));
    } else {
      this.recentActivity.set(all.slice(0, 8));
    }
  }

  onYearChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedYear.set(val);
    this.updateDonutChartData();
  }

  getInitials(name?: string): string {
    if (!name) return 'م';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name.slice(0, 2);
  }

  getAvatarColor(index: number): string {
    const colors = ['#0d9488', '#0284c7', '#4f46e5', '#0A1172', '#7c3aed'];
    return colors[index % colors.length];
  }

  getBarWidth(value: number): number {
    const max = this.maxDistributionValue();
    return Math.max(15, Math.min(100, Math.round((value / max) * 100)));
  }

  goToTraineesList() {
    this.router.navigate(['/admin/trainees']);
  }

  goToCompaniesList() {
    this.router.navigate(['/admin/companies']);
  }

  goToProgramsList() {
    this.router.navigate(['/admin/programs']);
  }

  goToCertificatesList() {
    this.router.navigate(['/admin/certificates']);
  }

  goToWarningsList() {
    this.router.navigate(['/admin/warnings']);
  }

  private initBarChart() {
    const ctx = document.getElementById('batchesBarChart') as HTMLCanvasElement;
    if (!ctx) return;

    const hoverBlockPlugin = {
      id: 'hoverBlockPlugin',
      beforeDraw: (chart: any) => {
        if (chart.tooltip?._active && chart.tooltip._active.length) {
          const activePoint = chart.tooltip._active[0];
          const c = chart.ctx;
          const x = activePoint.element.x;
          const topY = chart.scales.y.top;
          const bottomY = chart.scales.y.bottom;
          const width = activePoint.element.width * 2.2;

          c.save();
          c.fillStyle = '#cccccc';
          c.fillRect(x - width / 2, topY, width, bottomY - topY);
          c.restore();
        }
      }
    };


    this.barChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        // لا توجد قيم افتراضية؛ تُملأ البيانات من DashboardCharts API.
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: '#0A1172',
          hoverBackgroundColor: '#0A1172',
          borderRadius: 6,
          barThickness: 32
        }]
      },
      plugins: [hoverBlockPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: '#ffffff',
            titleColor: '#1e293b',
            titleFont: { size: 13, weight: 'normal' },
            titleAlign: 'center',
            bodyColor: '#0A1172',
            bodyFont: { size: 13, weight: 'normal' },
            bodyAlign: 'center',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            padding: { top: 10, bottom: 10, left: 16, right: 16 },
            cornerRadius: 10,
            displayColors: false,
            callbacks: {
              title: (tooltipItems: any) => tooltipItems[0].label,
              label: (context: any) => `عدد الدفعات : ${context.raw || 0}`
            }
          }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#64748b' } },
          x: { grid: { display: false }, ticks: { color: '#64748b' } }
        }
      }
    });
  }

  private initDonutChart() {
    const ctx = document.getElementById('tracksDonutChart') as HTMLCanvasElement;
    if (!ctx) return;

    let hoveredSlice: { label: string; value: number | string; color: string } | null = null;

    // =========================================================================
    // Plugin متطور لضبط الاسم من عدة كلمات على سطرين بخط أنيق (10px) والرقم تحته
    // =========================================================================
    const insideDonutCenterAndLabelsPlugin = {
      id: 'insideDonutCenterAndLabelsPlugin',
      beforeEvent: (chart: any, args: any) => {
        const event = args.event;
        if (event.type === 'mousemove') {
          const elements = chart.getElementsAtEventForMode(
            event.native,
            'nearest',
            { intersect: true },
            false
          );
          if (elements.length > 0) {
            const index = elements[0].index;
            const label = chart.data.labels[index] || '';
            const value = chart.data.datasets[0].data[index] || 0;
            const colors = chart.data.datasets[0].backgroundColor as string[];
            const color = colors[index % colors.length] || '#0A1172';
            hoveredSlice = { label, value, color };
          } else {
            hoveredSlice = null;
          }
          chart.draw();
        } else if (event.type === 'mouseout') {
          hoveredSlice = null;
          chart.draw();
        }
      },
      afterDatasetsDraw: (chart: any) => {
        const { ctx, chartArea } = chart;
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data || !meta.data.length) return;

        const dataset = chart.data.datasets[0];
        if (!dataset || !dataset.data) return;

        // 1. رسم الأرقام باللون الأبيض داخل كل جزء ملون
        meta.data.forEach((element: any, index: number) => {
          const val = dataset.data[index];
          if (val === undefined || val === null || Number(val) <= 0) return;

          const { startAngle, endAngle, innerRadius, outerRadius, x, y } = element;
          const angle = startAngle + (endAngle - startAngle) / 2;
          const radius = innerRadius + (outerRadius - innerRadius) / 2;

          const posX = x + Math.cos(angle) * radius;
          const posY = y + Math.sin(angle) * radius;

          if (endAngle - startAngle > 0.16) {
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Cairo, Tajawal, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 1;
            ctx.fillText(String(val), posX, posY);
            ctx.restore();
          }
        });

        // 2. رسم (الكلام مع الرقم) في منتصف الدائرة بشكل مرتب وصغير ليتسع تماماً
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (hoveredSlice && hoveredSlice.label) {
          const raw = hoveredSlice.label.trim();
          const words = raw.split(/\s+/);

          // إعداد لون وخط النص (10px أنيق وصغير ليناسب الدائرة)
          ctx.font = 'bold 10px Cairo, Tajawal, system-ui, sans-serif';
          ctx.fillStyle = hoveredSlice.color || '#0A1172';

          if (words.length >= 3) {
            // للمسارات الطويلة مثل: "Project Management Track"
            // السطر الأول: Project Management
            // السطر الثاني: Track
            const line1 = words.slice(0, words.length - 1).join(' ');
            const line2 = words[words.length - 1];

            ctx.fillText(line1, centerX, centerY - 17);
            ctx.fillText(line2, centerX, centerY - 5);

            // الرقم في الأسفل
            ctx.font = 'bold 20px Cairo, Tajawal, system-ui, sans-serif';
            ctx.fillStyle = '#0f172a';
            ctx.fillText(String(hoveredSlice.value), centerX, centerY + 15);
          } else if (words.length === 2 && raw.length > 15) {
            // مسار من كلمتين طويل
            ctx.fillText(words[0], centerX, centerY - 17);
            ctx.fillText(words[1], centerX, centerY - 5);

            ctx.font = 'bold 20px Cairo, Tajawal, system-ui, sans-serif';
            ctx.fillStyle = '#0f172a';
            ctx.fillText(String(hoveredSlice.value), centerX, centerY + 15);
          } else {
            // المسارات القصيرة التي تتسع في سطر واحد براحة
            ctx.fillText(raw, centerX, centerY - 12);

            ctx.font = 'bold 22px Cairo, Tajawal, system-ui, sans-serif';
            ctx.fillStyle = '#0f172a';
            ctx.fillText(String(hoveredSlice.value), centerX, centerY + 12);
          }
        } else {
          // الحالة العادية: إجمالي عدد المسارات
          const total = (dataset.data as number[]).reduce((sum, n) => sum + (Number(n) || 0), 0);
          ctx.font = '600 11px Cairo, Tajawal, system-ui, sans-serif';
          ctx.fillStyle = '#64748b';
          ctx.fillText('المسارات التدريبية', centerX, centerY - 10);

          ctx.font = 'bold 20px Cairo, Tajawal, system-ui, sans-serif';
          ctx.fillStyle = '#0A1172';
          ctx.fillText(String(total), centerX, centerY + 12);
        }

        ctx.restore();
      }
    };

    this.donutChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: ['#ef4444', '#3b82f6', '#eab308', '#10b981', '#1e293b', '#8b5cf6', '#ec4899'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      plugins: [insideDonutCenterAndLabelsPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 16,
              font: {
                family: 'Cairo, Tajawal, sans-serif',
                size: 12
              }
            }
          },
          tooltip: {
            enabled: false
          }
        },
        // سماكة 66% تعطي اتساعاً داخلياً كافياً لراحة العين وعدم ملامسة الأطراف
        cutout: '66%'
      }
    });
  }

  private updateBarChartData(data: DashboardChartsDto | null) {
    if (!this.barChartInstance || !data?.batchesByYear) return;
    this.barChartInstance.data.labels = data.batchesByYear.map(p => p.label);
    this.barChartInstance.data.datasets[0].data = data.batchesByYear.map(p => p.value);
    this.barChartInstance.update();
  }

  // Update tracks donut chart using backend distribution only.
  private updateDonutChartData(): void {
    if (!this.donutChartInstance) return;

    const tracks = this.charts()?.tracksDistribution ?? [];

    const validTracks = tracks.filter(
      item => item.label && item.value > 0
    );

    this.donutChartInstance.data.labels = validTracks.map(
      item => item.label
    );

    this.donutChartInstance.data.datasets[0].data = validTracks.map(
      item => item.value
    );

    this.donutChartInstance.update();
  }

  getActivityClass(action?: string, entityName?: string): string {
    const act = (action || '').toLowerCase();
    const entity = (entityName || '').toLowerCase();

    if (act.includes('إنذار') || act.includes('انذار') || entity.includes('warning')) {
      return 'warning';
    }
    if (act.includes('حضور') || act.includes('غياب') || entity.includes('attendance')) {
      return 'attendance';
    }
    if (act.includes('شهادة') || entity.includes('certificate')) {
      return 'certificate';
    }
    if (act.includes('شركة') || entity.includes('company')) {
      return 'company';
    }
    return 'account';
  }
}
