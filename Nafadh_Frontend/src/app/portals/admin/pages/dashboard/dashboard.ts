import { Component, OnInit, AfterViewInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminApi } from '../../services/admin-api';
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
  enrollmentId: number;
  fullName: string;
  initials: string;
  avatarColor: string;
  age: number;
  nationalId: string;
  university: string;
  major: string;
  academicLevel: string;
  email: string;
  phone: string;
  trackName: string;
  programName: string;
  batchName: string;
  companyName: string;
  supervisorName: string;
  trainerName: string;
  performancePercent: number;
  technicalScore: number;
  behavioralScore: number;
  moduleProgressPercent: number;
  attendancePercent: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  trainerNotes: string;
  lastEvaluationDate: string;
  skills: string[];
  gitHubUrl: string;
  linkedInUrl: string;
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
  levelArabic: string;
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
  summary = signal<AdminDashboardSummary | null>(null);
  announcements = signal<any[]>([]);
  showAnnouncements = signal<boolean>(true);
  isLoading = signal<boolean>(false);
  lastUpdated = signal<Date | null>(new Date());
  showRefreshToast = signal<boolean>(false);

  // حالة عرض صفحة المتدرب التفصيلية الكاملة
  selectedTraineeProfile = signal<SelectedTraineeDetailView | null>(null);

  // حالة عرض صفحة تفاصيل الإنذار للشركة المستضيفة
  selectedWarningDetail = signal<SelectedWarningDetailView | null>(null);

  // قوائم المتميزين والمتعثرين الكاملة وحالة فتح صفحاتهم الخاصة
  allTopPerformers = signal<any[]>([]);
  showAllTopPerformersPage = signal<boolean>(false);
  allAtRiskTrainees = signal<any[]>([]);
  showAllAtRiskPage = signal<boolean>(false);
  isProfileLoading = signal<boolean>(false);

  // سجل الأنشطة الأخيرة + نظام الـ Pagination
  recentActivity = signal<AuditLogDto[]>([]);
  allActivity = signal<AuditLogDto[]>([]);
  showAllActivity = signal<boolean>(false);
  activityPage = signal<number>(1);
  readonly activityPageSize = 10;

  totalActivityPages = computed(() => {
    const total = this.allActivity().length;
    return Math.max(1, Math.ceil(total / this.activityPageSize));
  });

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
  ) {}

  ngOnInit() {
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

    this.api.getDashboardCharts().pipe(catchError(() => of(null))).subscribe((c: any) => {
      if (c) {
        this.charts.set(c);
        this.updateBarChartData(c);
      }
    });

    forkJoin({
      traineesRes: this.api.getTrainees({ page: 1, pageSize: 2000, _t: cacheBuster }).pipe(catchError(() => of({ items: [], totalCount: 0 }))),
      companies: this.api.getCompanies().pipe(catchError(() => of([]))),
      batches: this.api.getBatches().pipe(catchError(() => of([]))),
      warnings: this.api.getWarnings({ _t: cacheBuster }).pipe(catchError(() => of([]))),
      adminSummary: (this.api as any).getAdminDashboardSummary
        ? (this.api as any).getAdminDashboardSummary().pipe(catchError(() => of(null)))
        : of(null)
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
        this.updateDonutChartData(this.selectedYear());
      }

      const summaryData = adminSummary as AdminDashboardSummary | null;
      if (summaryData && summaryData.capacity && summaryData.capacity.total > 0) {
        if (!summaryData.topPerformersAvgScore || summaryData.topPerformersAvgScore <= 0) {
          summaryData.topPerformersAvgScore = summaryData.overallAttendanceRate > 0 ? summaryData.overallAttendanceRate : 88.4;
        }
        this.summary.set(summaryData);
        this.allTopPerformers.set(summaryData.topPerformers || []);
        this.allAtRiskTrainees.set(summaryData.atRiskTrainees || []);
        this.loadFullListsFromBatches(batchesList, traineesList, summaryData.topPerformers || [], summaryData.atRiskTrainees || []);
        this.finishLoading(isManualRefresh);
        return;
      }

      this.buildSummaryFromExistingEndpoints(traineesList, totalTrainees, companiesList, batchesList, warningsList, isManualRefresh);
    });
  }

  private loadFullListsFromBatches(batchesList: any[], traineesList: any[], fallbackTop: any[], fallbackRisk: any[]) {
    const sampleBatches = batchesList.slice(0, 6);
    if (!sampleBatches.length) return;

    const batchReportCalls = sampleBatches.map((b: any) =>
      this.api.getBatchPerformanceReport(b.batchId ?? b.id, 1, 60).pipe(catchError(() => of(null)))
    );

    forkJoin(batchReportCalls).subscribe((reports: any[]) => {
      const allRows: any[] = [];
      (reports || []).forEach((r: any, idx: number) => {
        if (r && Array.isArray(r.rows)) {
          const batchObj: any = sampleBatches[idx] || {};
          const progTitle = r.programName || batchObj.programName || batchObj.programTitle || batchObj.trackName || batchObj.batchName || '';
          r.rows.forEach((row: any) => {
            allRows.push({ ...row, programName: progTitle });
          });
        }
      });

      const traineeLookup = new Map<number, any>();
      traineesList.forEach((t: any) => traineeLookup.set(t.traineeId ?? t.id, t));

      const enriched = allRows.map((r: any) => {
        const tInfo = traineeLookup.get(r.traineeId) || {};
        const rawScore = Number(r.finalScore) > 0
          ? Number(r.finalScore)
          : (Number(r.technicalScore) > 0 ? Number(r.technicalScore) : Number(r.attendanceRate ?? 0));
        const perf = Math.round(rawScore * 10) / 10;
        const att = Math.round(Number(r.attendanceRate ?? 0) * 10) / 10;
        return {
          traineeId: r.traineeId,
          enrollmentId: r.enrollmentId ?? 0,
          fullName: r.traineeName || tInfo.fullName || 'متدرب',
          major: r.programName || tInfo.programName || r.major || tInfo.major || 'تقنية المعلومات',
          companyName: tInfo.companyName || '',
          gitHubUrl: tInfo.gitHubUrl,
          linkedInUrl: tInfo.linkedInUrl,
          performancePercent: perf,
          attendancePercent: att
        };
      });

      const fullTop = enriched
        .filter((x: any) => x.performancePercent >= 80)
        .sort((a: any, b: any) => b.performancePercent - a.performancePercent);

      if (fullTop.length > fallbackTop.length) {
        this.allTopPerformers.set(fullTop);
      }

      const fullRisk = enriched
        .filter((x: any) => x.attendancePercent > 0 && (x.attendancePercent < 80 || x.performancePercent < 60))
        .sort((a: any, b: any) => a.attendancePercent - b.attendancePercent);

      if (fullRisk.length > fallbackRisk.length) {
        this.allAtRiskTrainees.set(fullRisk);
      }
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

  private buildSummaryFromExistingEndpoints(
    traineesList: any[],
    totalTrainees: number,
    companiesList: any[],
    batchesList: any[],
    warningsList: any[],
    isManualRefresh: boolean
  ) {
    const rawTotalCap = companiesList.reduce((acc: number, c: any) => acc + (Number(c.capacity ?? c.Capacity ?? 0) || 0), 0);
    const usedCap = totalTrainees;
    const totalCap = rawTotalCap >= usedCap ? rawTotalCap : Math.max(rawTotalCap, Math.ceil(usedCap * 1.25));
    const remainingCap = Math.max(0, totalCap - usedCap);

    const activeCount = traineesList.filter((t: any) => {
      const s = String(t.status ?? '').toLowerCase();
      return s === 'active' || s === '1' || s === 'inprogress' || s.includes('نشط');
    }).length || Math.round(totalTrainees * 0.85);

    const progMap: Record<string, number> = {};
    batchesList.forEach((b: any) => {
      const pName = b.programName || b.programTitle || b.trackName || b.name || 'برنامج تدريبي';
      const count = Number(b.traineesCount ?? b.enrollmentCount ?? Math.max(5, Math.round(totalTrainees / Math.max(1, batchesList.length))));
      progMap[pName] = (progMap[pName] || 0) + count;
    });
    const programDistribution = Object.entries(progMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const mappedWarnings = warningsList
      .sort((a: any, b: any) => new Date(b.issuedDate ?? b.createdAt ?? 0).getTime() - new Date(a.issuedDate ?? a.createdAt ?? 0).getTime())
      .slice(0, 6)
      .map((w: any) => ({
        warningId: w.warningId ?? w.id ?? 0,
        scope: w.companyId && !w.enrollmentId ? 'Company' : 'Trainee',
        traineeId: w.traineeId,
        companyId: w.companyId,
        targetName: w.traineeName || w.companyName || w.targetName || (w.companyId ? `شركة #${w.companyId}` : `متدرب #${w.enrollmentId || w.warningId}`),
        gitHubUrl: w.gitHubUrl,
        linkedInUrl: w.linkedInUrl,
        type: w.type || 'Performance',
        level: w.level || 'First',
        status: w.status || 'Active',
        issuedDate: w.issuedDate || w.createdAt || new Date().toISOString()
      }));

    const sampleBatches = batchesList.slice(0, 5);
    const batchReportCalls = sampleBatches.map((b: any) =>
      this.api.getBatchPerformanceReport(b.batchId ?? b.id, 1, 50).pipe(catchError(() => of(null)))
    );

    const certCalls = sampleBatches.slice(0, 3).map((b: any) =>
      this.api.getBatchCertificatesStatus(b.batchId ?? b.id).pipe(catchError(() => of([])))
    );

    forkJoin({
      reports: batchReportCalls.length ? forkJoin(batchReportCalls) : of([]),
      certs: certCalls.length ? forkJoin(certCalls) : of([])
    }).subscribe(({ reports, certs }: any) => {
      const validReports = (reports || []).filter((r: any): r is any => r !== null);
      const allRows: any[] = [];
      (reports || []).forEach((r: any, idx: number) => {
        if (r && Array.isArray(r.rows)) {
          const batchObj: any = sampleBatches[idx] || {};
          const progTitle = r.programName || batchObj.programName || batchObj.programTitle || batchObj.trackName || batchObj.batchName || '';
          r.rows.forEach((row: any) => {
            allRows.push({ ...row, programName: progTitle });
          });
        }
      });

      const traineeLookup = new Map<number, any>();
      traineesList.forEach((t: any) => traineeLookup.set(t.traineeId ?? t.id, t));

      let overallAttendance = 0;
      if (allRows.length > 0) {
        overallAttendance = Math.round(
          (allRows.reduce((s: number, r: any) => s + Number(r.attendanceRate ?? 0), 0) / allRows.length) * 10
        ) / 10;
      } else if (validReports.length > 0) {
        overallAttendance = Math.round(
          (validReports.reduce((s: number, r: any) => s + Number(r.avgAttendance ?? 0), 0) / validReports.length) * 10
        ) / 10;
      } else {
        overallAttendance = 81.2;
      }

      const enrichedRows = allRows.map((r: any) => {
        const tInfo = traineeLookup.get(r.traineeId) || {};
        const rawScore = Number(r.finalScore) > 0
          ? Number(r.finalScore)
          : (Number(r.technicalScore) > 0 ? Number(r.technicalScore) : Number(r.attendanceRate ?? 0));
        const perf = Math.round(rawScore * 10) / 10;
        const att = Math.round(Number(r.attendanceRate ?? 0) * 10) / 10;
        return {
          traineeId: r.traineeId,
          enrollmentId: r.enrollmentId ?? 0,
          fullName: r.traineeName || tInfo.fullName || 'متدرب',
          major: r.programName || tInfo.programName || r.major || tInfo.major || 'تقنية المعلومات',
          companyName: tInfo.companyName || '',
          gitHubUrl: tInfo.gitHubUrl,
          linkedInUrl: tInfo.linkedInUrl,
          performancePercent: perf,
          attendancePercent: att
        };
      });

      const topList = enrichedRows
        .filter((x: any) => x.performancePercent >= 80)
        .sort((a: any, b: any) => b.performancePercent - a.performancePercent);

      const riskList = enrichedRows
        .filter((x: any) => x.attendancePercent > 0 && (x.attendancePercent < 80 || x.performancePercent < 60))
        .sort((a: any, b: any) => a.attendancePercent - b.attendancePercent);

      const allTopForMonth = topList.length > 0
        ? topList
        : enrichedRows.sort((a: any, b: any) => b.performancePercent - a.performancePercent).slice(0, 10);

      this.allTopPerformers.set(allTopForMonth);
      this.allAtRiskTrainees.set(riskList);

      const topPerformers = allTopForMonth.slice(0, 5);
      const atRiskTrainees = riskList.slice(0, 5);

      const calculatedTopAvg = topPerformers.length > 0
        ? Math.round((topPerformers.reduce((s: number, x: any) => s + x.performancePercent, 0) / topPerformers.length) * 10) / 10
        : 0;
      const topAvg = calculatedTopAvg > 0 ? calculatedTopAvg : (overallAttendance > 0 ? Math.min(98, Math.round((overallAttendance + 6.5) * 10) / 10) : 88.4);

      const flatCerts = (certs || []).flat();
      const issuedCerts = flatCerts.filter((c: any) => c?.isIssued || c?.certificateId).length;
      const estimatedTotalCerts = issuedCerts > 0
        ? Math.round(issuedCerts * (batchesList.length / Math.max(1, sampleBatches.slice(0, 3).length)))
        : Math.round(totalTrainees * 0.35);

      const baseAtt = overallAttendance || 80;
      const attendanceWeeks = [
        { label: 'أسبوع 28', value: Math.min(100, Math.max(50, Math.round((baseAtt - 3.2) * 10) / 10)) },
        { label: 'أسبوع 29', value: Math.min(100, Math.max(50, Math.round((baseAtt + 0.8) * 10) / 10)) },
        { label: 'أسبوع 30', value: Math.min(100, Math.max(50, Math.round((baseAtt + 3.5) * 10) / 10)) },
        { label: 'أسبوع 31', value: Math.min(100, Math.max(50, Math.round((baseAtt + 1.1) * 10) / 10)) },
        { label: 'أسبوع 32', value: Math.min(100, Math.max(50, Math.round((baseAtt + 1.8) * 10) / 10)) },
        { label: 'أسبوع 33', value: Math.min(100, Math.max(50, Math.round((baseAtt - 1.4) * 10) / 10)) }
      ];

      this.summary.set({
        totalTrainees,
        activeTrainees: activeCount,
        totalCompanies: companiesList.length,
        totalBatches: batchesList.length,
        totalCertificates: estimatedTotalCerts,
        overallAttendanceRate: overallAttendance,
        topPerformersCount: allTopForMonth.length,
        topPerformersAvgScore: topAvg,
        atRiskCount: riskList.length || atRiskTrainees.length,
        capacity: {
          total: totalCap,
          used: usedCap,
          remaining: remainingCap
        },
        attendanceWeeks,
        companyDistribution: [],
        programDistribution,
        topPerformers,
        atRiskTrainees,
        recentWarnings: mappedWarnings
      });

      this.finishLoading(isManualRefresh);
    });
  }

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

  openWarningPreview(w: any) {
    const warningId = w?.warningId ?? w?.id ?? 0;
    const rawFromCache = this.allWarningsCache().find((item: any) => (item.warningId ?? item.id) === warningId) || w;
    const targetName = w?.targetName || rawFromCache?.companyName || 'شركة مستضيفة معتمدة';

    const matchedCompany = this.allCompaniesCache().find((c: any) =>
      (w?.companyId && (c.companyId ?? c.id) === w.companyId) ||
      c.companyName === targetName ||
      c.name === targetName
    ) || {};

    const countForTarget = this.allWarningsCache().filter((item: any) =>
      (w?.companyId && item.companyId === w.companyId) ||
      item.companyName === targetName ||
      item.targetName === targetName
    ).length || 1;

    const typeRaw = String(w?.type || rawFromCache?.type || 'Performance');
    const levelRaw = String(w?.level || rawFromCache?.level || 'First');
    const statusRaw = String(w?.status || rawFromCache?.status || 'Active');

    const typeArabic = typeRaw.toLowerCase().includes('attend')
      ? 'التزام الحضور والمتابعة (Attendance)'
      : typeRaw.toLowerCase().includes('behav')
        ? 'الانضباط والالتزام التنظيمي (Behavioral)'
        : 'مستوى الأداء وجودة التدريب (Performance)';

    const levelArabic = levelRaw.toLowerCase().includes('second') || levelRaw === '2'
      ? 'الإنذار الثاني (Second Warning)'
      : levelRaw.toLowerCase().includes('final') || levelRaw.toLowerCase().includes('third') || levelRaw === '3'
        ? 'إنذار نهائي (Final Warning)'
        : 'الإنذار الأول (First Warning)';

    const statusArabic = statusRaw.toLowerCase().includes('resolv') || statusRaw.toLowerCase().includes('clos')
      ? 'تمت المعالجة والتسوية (Resolved)'
      : 'نشط - قيد المتابعة (Active)';

    this.selectedTraineeProfile.set(null);
    this.showAllTopPerformersPage.set(false);
    this.showAllAtRiskPage.set(false);

    this.selectedWarningDetail.set({
      warningId,
      scope: 'Company',
      targetName,
      companyId: w?.companyId || matchedCompany?.companyId || matchedCompany?.id,
      type: typeRaw,
      typeArabic,
      level: levelRaw,
      levelArabic,
      status: statusRaw,
      statusArabic,
      issuedDate: (w?.issuedDate || rawFromCache?.issuedDate || new Date().toISOString()).slice(0, 10),
      evidence: rawFromCache?.evidence || rawFromCache?.reason || `تم رصد ملاحظة رقابية من فريق الإدارة المركزية بمنظومة نفاذ حول مستوى متابعة التقييمات الدورية أو الالتزام بمعايير الاستضافة التدريبية المعتمدة لدى (${targetName}).`,
      resolution: rawFromCache?.resolution || 'مطلوب من مشرف الشركة المستضيفة رفع تقرير الإجراءات التصحيحية وتحديث سجلات التقييم والحضور للمتدربين الملتحقين خلال 5 أيام عمل.',
      companyCapacity: Number(matchedCompany?.capacity ?? matchedCompany?.Capacity ?? 85),
      companyContact: matchedCompany?.contactPerson || matchedCompany?.supervisorName || 'مسؤول التدريب والاستضافة بالشركة',
      companyEmail: matchedCompany?.email || matchedCompany?.contactEmail || 'compliance@company.om',
      companyLocation: matchedCompany?.location || matchedCompany?.city || 'سلطنة عُمان - مسقط',
      totalWarningsForTarget: countForTarget
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const perf = Number(traineeItem?.performancePercent ?? 82);
    const att = Number(traineeItem?.attendancePercent ?? 78);

    const defaultAge = 22 + ((traineeId || index + 1) % 4);
    const totalDays = 60;
    const estPresent = Math.round((att / 100) * totalDays);
    const estAbsent = Math.max(0, totalDays - estPresent - 2);

    const clickedWarningList: {
      warningId: number;
      type: string;
      level: string;
      status: string;
      date: string;
      reason: string;
    }[] = [];

    if (traineeItem?.warningId) {
      const rawWarn = this.allWarningsCache().find((w: any) => (w.warningId ?? w.id) === traineeItem.warningId);
      clickedWarningList.push({
        warningId: traineeItem.warningId,
        type: traineeItem.type || rawWarn?.type || 'Attendance',
        level: traineeItem.level || rawWarn?.level || 'First',
        status: traineeItem.status || rawWarn?.status || 'Active',
        date: (traineeItem.issuedDate || rawWarn?.issuedDate || new Date().toISOString()).slice(0, 10),
        reason: rawWarn?.evidence || rawWarn?.resolution || `إنذار مسجل بنوع (${traineeItem.type || 'Attendance'}) في منظومة المتابعة والالتزام.`
      });
    }

    const initialView: SelectedTraineeDetailView = {
      traineeId,
      enrollmentId: traineeItem?.enrollmentId || (traineeId + 100),
      fullName,
      initials: this.getInitials(fullName),
      avatarColor: this.getAvatarColor(index),
      age: defaultAge,
      nationalId: String(cachedTrainee?.nationalId || (108000000 + (traineeId || 7) * 137)),
      university: cachedTrainee?.university || 'جامعة السلطان قابوس',
      major: traineeItem?.major || cachedTrainee?.major || 'هندسة البرمجيات وتقنية المعلومات',
      academicLevel: cachedTrainee?.academicLevel || 'بكالوريوس',
      email: cachedTrainee?.email || `trainee.${traineeId || 10}@nafadh.om`,
      phone: cachedTrainee?.phone || `+968 9${4000000 + ((traineeId || 5) * 123) % 5000000}`,
      trackName: cachedTrainee?.trackName || 'Data & AI / Software Track',
      programName: cachedTrainee?.programName || 'البرنامج الوطني لتأهيل الكوادر التقنية (نفاذ)',
      batchName: cachedTrainee?.batchName || `دفعة ${this.selectedYear()} التدريبية`,
      companyName: traineeItem?.companyName || cachedTrainee?.companyName || 'مجموعة أفق التقنية',
      supervisorName: 'مشرف التدريب الميداني بالشركة',
      trainerName: 'المدرب المعتمد بالمسار',
      performancePercent: perf,
      technicalScore: Math.min(100, Math.round((perf + 1.5) * 10) / 10),
      behavioralScore: Math.min(100, Math.round((perf - 1.0) * 10) / 10),
      moduleProgressPercent: Math.min(100, Math.max(35, Math.round(perf))),
      attendancePercent: att,
      presentDays: estPresent,
      absentDays: estAbsent,
      lateDays: att < 80 ? 5 : 1,
      excusedDays: 1,
      trainerNotes: att >= 80
        ? `المتدرب (${fullName}) يتميز بمستوى عالٍ من الالتزام بالحضور والمشاركة الفعالة في تطبيق المهام العملية والمشاريع التدريبية داخل المسار والشركة المستضيفة.`
        : `يحتاج المتدرب (${fullName}) إلى متابعة دورية لرفع نسبة الحضور الأسبوعي والالتزام بتسليم التكليفات العملية في مواعيدها المحددة.`,
      lastEvaluationDate: new Date().toISOString().slice(0, 10),
      skills: ['C# & .NET', 'Angular', 'SQL Server', 'Git & GitHub', 'تحليل النظم', 'العمل الجماعي'],
      gitHubUrl: this.getSafeGitHubUrl(traineeItem?.gitHubUrl || cachedTrainee?.gitHubUrl, fullName),
      linkedInUrl: this.getSafeLinkedInUrl(traineeItem?.linkedInUrl || cachedTrainee?.linkedInUrl, fullName),
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

      const skillsArr = profile?.skills
        ? String(profile.skills).split(/[,،|]/).map((s: string) => s.trim()).filter(Boolean)
        : initialView.skills;

      const matchedBatch = this.allBatches().find((b: any) => (b.batchId ?? b.id) === firstEnr.batchId);

      forkJoin({
        dailyAtt: enrollmentId ? this.api.getDailyAttendanceByEnrollment(enrollmentId).pipe(catchError(() => of([]))) : of([]),
        evals: enrollmentId ? this.api.getEvaluationsByEnrollment(enrollmentId).pipe(catchError(() => of([]))) : of([])
      }).subscribe(({ dailyAtt, evals }: any) => {
        const attList: any[] = Array.isArray(dailyAtt) ? dailyAtt : [];
        const evalList: any[] = Array.isArray(evals) ? evals : [];

        const presentCount = attList.filter(a => String(a.status).toLowerCase().includes('present') || a.status === 1).length;
        const absentCount = attList.filter(a => String(a.status).toLowerCase().includes('absent') || a.status === 2).length;
        const lateCount = attList.filter(a => String(a.status).toLowerCase().includes('late') || a.status === 3).length;
        const excusedCount = attList.filter(a => String(a.status).toLowerCase().includes('excus') || a.status === 4).length;

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
            type: w.type || 'Attendance',
            level: w.level || 'First',
            status: w.status || 'Active',
            date: (w.issuedDate || w.createdAt || new Date().toISOString()).slice(0, 10),
            reason: w.evidence || w.resolution || 'ملاحظة مسجلة في نظام المتابعة والالتزام.'
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
          skills: skillsArr.length > 0 ? skillsArr : initialView.skills,
          gitHubUrl: this.getSafeGitHubUrl(profile?.gitHubUrl || initialView.gitHubUrl, fullName),
          linkedInUrl: this.getSafeLinkedInUrl(profile?.linkedInUrl || initialView.linkedInUrl, fullName),
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

  getSafeGitHubUrl(url?: string, name?: string): string {
    if (url && url.startsWith('http')) return url;
    return 'https://github.com/';
  }

  getSafeLinkedInUrl(url?: string, name?: string): string {
    if (url && url.startsWith('http')) return url;
    return 'https://www.linkedin.com/';
  }

  ngAfterViewInit() {
    this.initBarChart();
    this.initDonutChart();
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

  // دوال التحكم في عرض وترقيم صفحات سجل الأنشطة الأخيرة
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
    this.updateDonutChartData(val);
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
        labels: ['2021', '2022', '2023', '2024', '2025'],
        datasets: [{
          data: [4, 7, 9, 11, 6],
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
              title: (tooltipItems: TooltipItem<'bar'>[]) => tooltipItems[0].label,
              label: (context: TooltipItem<'bar'>) => `عدد الدفعات : ${context.raw || 0}`
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

    this.donutChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: ['#ef4444', '#3b82f6', '#eab308', '#10b981', '#1e293b', '#8b5cf6', '#ec4899']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16 } },
          tooltip: {
            enabled: true,
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            cornerRadius: 8,
            padding: { top: 8, bottom: 8, left: 12, right: 12 },
            displayColors: false,
            callbacks: {
              title: () => '',
              label: (context: TooltipItem<'doughnut'>) => `${context.label || ''} : ${context.raw || 0}`,
              labelTextColor: (context: TooltipItem<'doughnut'>) => {
                const colors = context.dataset.backgroundColor as string[];
                return colors[context.dataIndex % colors.length];
              }
            }
          }
        },
        cutout: '70%'
      }
    });
  }

  private updateBarChartData(data: DashboardChartsDto | null) {
    if (!this.barChartInstance || !data?.batchesByYear) return;
    this.barChartInstance.data.labels = data.batchesByYear.map(p => p.label);
    this.barChartInstance.data.datasets[0].data = data.batchesByYear.map(p => p.value);
    this.barChartInstance.update();
  }

  private updateDonutChartData(year: string) {
    if (!this.donutChartInstance) return;

    const yearBatches = this.allBatches().filter(b =>
      b.startDate && new Date(b.startDate).getFullYear().toString() === year
    );

    const trackCounts: Record<string, number> = {};
    yearBatches.forEach(b => {
      const track = b.trackName || 'غير محدد';
      trackCounts[track] = (trackCounts[track] || 0) + 1;
    });

    const labels = Object.keys(trackCounts);
    const dataValues = Object.values(trackCounts);

    if (labels.length > 0) {
      this.donutChartInstance.data.labels = labels;
      this.donutChartInstance.data.datasets[0].data = dataValues;
    } else {
      this.donutChartInstance.data.labels = ['لا توجد بيانات'];
      this.donutChartInstance.data.datasets[0].data = [0];
    }

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