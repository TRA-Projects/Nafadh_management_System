import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { catchError, finalize } from 'rxjs/operators';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { EnrollmentDto, CompanyDashboardDto } from '../../../../core/models/dtos';
import { buildXlsx, downloadBlob } from './xlsx-writer';

type Row = { enrollmentId: number; id: number; name: string; cohort: string; program: string; sup: string; att: number | null; perf: number | null; status: string; start: string; end: string; githubUrl?: string; linkedinUrl?: string; profileImageUrl?: string };

// Last loaded list per company, kept in memory so reopening the page shows data instantly
// while a fresh copy loads in the background.
const LIST_CACHE = new Map<number, Row[]>();

@Component({selector:'app-company-trainees', standalone:true, imports:[CommonModule,FormsModule],templateUrl:'./trainees.html',styleUrl:'./trainees.scss'})
export class CompanyTrainees implements OnInit {
  private readonly api = inject(CompanyApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  trainees: Row[] = [];
  pageSize = 5;
  currentPage = 1;
  loading = false;
  error = '';
  search = ''; cohort = ''; program = ''; status = ''; supervisor = ''; fromDate = ''; toDate = '';
  readonly statuses = [
    {value:'InProgress',label:'قيد التدريب'},
    {value:'Completed',label:'مكتمل'},
    {value:'Dropped',label:'موقوف'},
    {value:'Failed',label:'متعثر'},
    {value:'AtRisk',label:'يحتاج متابعة'}
  ];
  readonly skeletonRows = [1, 2, 3, 4, 5];
  private loadToken = 0;
  private pendingPage: number | null = null;
  private filterCache: { source: Row[]; key: string; result: Row[] } | null = null;
  private readonly dateFormatter = new Intl.DateTimeFormat('ar-OM-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

  ngOnInit(): void { this.restoreFromUrl(); this.load(); }

  /** Filters and page live in the URL so coming back from a trainee keeps the list as it was. */
  private restoreFromUrl(): void {
    const q = this.route.snapshot.queryParamMap;
    this.search = q.get('q') ?? '';
    this.cohort = q.get('cohort') ?? '';
    this.program = q.get('program') ?? '';
    this.status = q.get('status') ?? '';
    this.supervisor = q.get('supervisor') ?? '';
    this.fromDate = q.get('from') ?? '';
    this.toDate = q.get('to') ?? '';
    const size = Number(q.get('size'));
    if ([5, 10, 15, 20].includes(size)) this.pageSize = size;
    const page = Number(q.get('page'));
    this.pendingPage = Number.isInteger(page) && page > 1 ? page : null;
  }
  private syncUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParamsHandling: 'merge',
      queryParams: {
        q: this.search.trim() || null, cohort: this.cohort || null, program: this.program || null,
        status: this.status || null, supervisor: this.supervisor || null,
        from: this.fromDate || null, to: this.toDate || null,
        page: this.currentPage > 1 ? this.currentPage : null,
        size: this.pageSize !== 5 ? this.pageSize : null
      }
    });
  }
  load(): void {
    const companyId = this.auth.session()?.companyId;
    if (!companyId) {
      this.loading = false;
      this.error = 'تعذر تحديد الشركة من حساب المستخدم.';
      return;
    }

    const token = ++this.loadToken;
    const cached = LIST_CACHE.get(companyId);

    this.currentPage = this.pendingPage ?? 1;
    this.pendingPage = null;
    this.error = '';
    // Returning visitors see the last list straight away while fresh data loads behind it.
    this.trainees = cached ?? [];
    this.loading = !cached;

    let base: Row[] | null = null;
    let applyExtras: ((rows: Row[]) => Row[]) | null = null;

    const publish = (): void => {
      if (token !== this.loadToken || !base) return;
      this.trainees = applyExtras ? applyExtras(base) : base;
      this.currentPage = Math.min(this.currentPage, this.totalPages);
      LIST_CACHE.set(companyId, this.trainees);
    };

    // The three requests start together instead of one after another;
    // the list appears as soon as the enrollments arrive and gains attendance/status afterwards.
    this.api.getEnrollmentsByCompany(companyId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => { if (token === this.loadToken) this.loading = false; })
      )
      .subscribe({
        next: (enrollments: EnrollmentDto[]) => {
          base = enrollments
            .filter(e => e.companyId === companyId)
            .map(e => ({
              enrollmentId: e.enrollmentId,
              id: e.traineeId,
              name: e.traineeName || 'غير متوفر',
              cohort: e.batchName || '—',
              program: e.programTitle || '—',
              sup: e.supervisorName || '—',
              att: null,
              perf: null,
              status: e.completionStatus,
              start: this.dateOnly(e.batchStartDate),
              end: this.dateOnly(e.batchEndDate),
              githubUrl: e.traineeGitHubUrl,
              linkedinUrl: e.traineeLinkedInUrl,
              profileImageUrl: e.profileImageUrl
                ? this.api.resolveFileUrl(e.profileImageUrl)
                : undefined
            }));
          publish();
        },
        error: () => {
          if (token === this.loadToken && !cached) {
            this.error = 'تعذر تحميل المتدربين من الخادم. تأكدي من الاتصال وحاولي مجددًا.';
          }
        }
      });

    forkJoin({
      dashboard: this.api.getDashboard(companyId)
        .pipe(catchError(() => of(null as CompanyDashboardDto | null))),
      attendance: this.api.getCompanyAttendanceReport(companyId)
        .pipe(catchError(() => of(null)))
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ dashboard, attendance }) => {
        const performers = new Map(
          (dashboard?.topPerformers ?? []).map(x => [x.enrollmentId, x])
        );
        const risk = new Set(
          (dashboard?.atRiskTrainees ?? []).map(x => x.enrollmentId)
        );
        const attendanceByTrainee = new Map(
          (attendance?.rows ?? []).map(x => [x.traineeId, x.attendanceRate])
        );

        applyExtras = rows => rows.map(t => {
          const performance = performers.get(t.enrollmentId);
          return {
            ...t,
            att: attendanceByTrainee.get(t.id)
              ?? performance?.attendancePercent ?? null,
            perf: performance?.performancePercent ?? null,
            status: risk.has(t.enrollmentId) && t.status === 'InProgress'
              ? 'AtRisk' : t.status
          };
        });
        publish();
      });
  }
  private dateOnly(date?: string | null): string { return date ? date.substring(0,10) : ''; }
  get cohorts(): string[] {return [...new Set(this.trainees.map(x=>x.cohort).filter(x=>x!=='—'))];}
  get programs(): string[] {return [...new Set(this.trainees.map(x=>x.program).filter(x=>x!=='—'))];}
  get supervisors(): string[] {return [...new Set(this.trainees.map(x=>x.sup).filter(x=>x!=='—'))];}
  get activeCount(): number {return this.trainees.filter(x=>x.status==='InProgress').length;}
  get riskCount(): number {return this.trainees.filter(x=>x.status==='AtRisk').length;}
  get averageAttendance(): number | null {const values=this.trainees.map(x=>x.att).filter((x):x is number=>x!==null);return values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null;}
  get filteredTrainees(): Row[] {
    // The template reads this getter many times per change-detection pass, so reuse the last result
    // until the data or one of the filters actually changes.
    const key = JSON.stringify([this.search, this.cohort, this.program, this.status, this.supervisor, this.fromDate, this.toDate]);
    if (this.filterCache && this.filterCache.source === this.trainees && this.filterCache.key === key) {
      return this.filterCache.result;
    }
    const q=this.search.trim().toLowerCase();
    const result = this.trainees.filter(t=>(!q||[t.name,t.sup,String(t.enrollmentId),this.padId(t.enrollmentId)].some(v=>v.toLowerCase().includes(q)))&&(!this.cohort||t.cohort===this.cohort)&&(!this.program||t.program===this.program)&&(!this.status||t.status===this.status)&&(!this.supervisor||t.sup===this.supervisor)&&(!this.fromDate||!!t.start&&t.start>=this.fromDate)&&(!this.toDate||!!t.end&&t.end<=this.toDate));
    this.filterCache = { source: this.trainees, key, result };
    return result;
  }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filteredTrainees.length / this.pageSize)); }
  get pageStart(): number { return (Math.min(this.currentPage, this.totalPages) - 1) * this.pageSize; }
  get pageEnd(): number { return Math.min(this.pageStart + this.pageSize, this.filteredTrainees.length); }
  get paginatedTrainees(): Row[] { return this.filteredTrainees.slice(this.pageStart, this.pageEnd); }
  resetPage(): void { this.currentPage = 1; this.syncUrl(); }
  changePageSize(value: number): void { this.pageSize = Number(value); this.currentPage = 1; this.syncUrl(); }
  previousPage(): void { if (this.currentPage > 1) { this.currentPage--; this.syncUrl(); } }
  nextPage(): void { if (this.currentPage < this.totalPages) { this.currentPage++; this.syncUrl(); } }
  statusLabel(status:string):string {return ({InProgress:'قيد التدريب',Completed:'مكتمل',Dropped:'موقوف',Failed:'متعثر',AtRisk:'يحتاج متابعة'} as Record<string,string>)[status] ?? status ?? 'غير محدد';}
  padId(id: number): string { return String(id).padStart(4, '0'); }
  formatDate(value?: string | null): string {
    if (!value || value === '—') return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : this.dateFormatter.format(d);
  }
  initials(name:string):string{return name.split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('');}
  clearFilters():void {this.search='';this.cohort='';this.program='';this.status='';this.supervisor='';this.fromDate='';this.toDate='';this.currentPage=1;this.syncUrl();}
  openTraineeDetails(t:Row):void {this.router.navigate(['/company/trainees',t.enrollmentId,'progress']);}
  openSocialLink(url:string|undefined,platform:'github'|'linkedin'):void {
    if (!url) return;
    try {const parsed=new URL(url);const allowed=platform==='github'?['github.com','www.github.com']:['linkedin.com','www.linkedin.com'];if(parsed.protocol==='https:'&&allowed.includes(parsed.hostname.toLowerCase())) window.open(parsed.href,'_blank','noopener,noreferrer');}
    catch { /* Ignore malformed stored links */ }
  }
  exportExcel():void {
    const blank=(v:string)=>v==='—'?'':v;
    const headers=['رقم التسجيل','الاسم','الدفعة','البرنامج','المشرف','الحضور (%)','الحالة','تاريخ المباشرة','تاريخ الانتهاء','GitHub','LinkedIn'];
    const rows=this.filteredTrainees.map(t=>[this.padId(t.enrollmentId),t.name,blank(t.cohort),blank(t.program),blank(t.sup),t.att,this.statusLabel(t.status),t.start,t.end,t.githubUrl||'',t.linkedinUrl||'']);
    downloadBlob(buildXlsx(headers,rows,{sheetName:'المتدربون'}),`trainees-${new Date().toISOString().slice(0,10)}.xlsx`);
  }
}
