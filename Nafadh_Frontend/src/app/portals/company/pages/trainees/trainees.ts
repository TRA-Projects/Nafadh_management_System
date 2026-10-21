import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { catchError, finalize } from 'rxjs/operators';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { EnrollmentDto, CompanyDashboardDto } from '../../../../core/models/dtos';

type Row = { enrollmentId: number; id: number; name: string; cohort: string; program: string; sup: string; att: number | null; perf: number | null; status: string; start: string; end: string; githubUrl?: string; linkedinUrl?: string; profileImageUrl?: string };

@Component({selector:'app-company-trainees', standalone:true, imports:[CommonModule,FormsModule],templateUrl:'./trainees.html',styleUrl:'./trainees.scss'})
export class CompanyTrainees implements OnInit {
  private readonly api = inject(CompanyApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
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
  ngOnInit(): void { this.load(); }
  load(): void {
    const companyId = this.auth.session()?.companyId;
    if (!companyId) {
      this.loading = false;
      this.error = 'تعذر تحديد الشركة من حساب المستخدم.';
      return;
    }

    this.currentPage = 1;
    this.loading = true;
    this.error = '';
    this.trainees = [];

    // Show the actual enrollment list as soon as its request completes.
    this.api.getEnrollmentsByCompany(companyId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => { this.loading = false; })
      )
      .subscribe({
        next: (enrollments: EnrollmentDto[]) => {
          this.trainees = enrollments
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

          // Supplementary reports do not block the list or its loading state.
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

              this.trainees = this.trainees.map(t => {
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
            });
        },
        error: () => {
          this.error = 'تعذر تحميل المتدربين من الخادم. تأكدي من الاتصال وحاولي مجددًا.';
        }
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
    const q=this.search.trim().toLowerCase();
    return this.trainees.filter(t=>(!q||[t.name,t.sup,String(t.id)].some(v=>v.toLowerCase().includes(q)))&&(!this.cohort||t.cohort===this.cohort)&&(!this.program||t.program===this.program)&&(!this.status||t.status===this.status)&&(!this.supervisor||t.sup===this.supervisor)&&(!this.fromDate||!!t.start&&t.start>=this.fromDate)&&(!this.toDate||!!t.end&&t.end<=this.toDate));
  }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filteredTrainees.length / this.pageSize)); }
  get pageStart(): number { return (Math.min(this.currentPage, this.totalPages) - 1) * this.pageSize; }
  get pageEnd(): number { return Math.min(this.pageStart + this.pageSize, this.filteredTrainees.length); }
  get paginatedTrainees(): Row[] { return this.filteredTrainees.slice(this.pageStart, this.pageEnd); }
  resetPage(): void { this.currentPage = 1; }
  changePageSize(value: number): void { this.pageSize = Number(value); this.currentPage = 1; }
  previousPage(): void { if (this.currentPage > 1) this.currentPage--; }
  nextPage(): void { if (this.currentPage < this.totalPages) this.currentPage++; }
  statusLabel(status:string):string {return ({InProgress:'قيد التدريب',Completed:'مكتمل',Dropped:'موقوف',Failed:'متعثر',AtRisk:'يحتاج متابعة'} as Record<string,string>)[status] ?? status ?? 'غير محدد';}
  initials(name:string):string{return name.split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('');}
  clearFilters():void {this.search='';this.cohort='';this.program='';this.status='';this.supervisor='';this.fromDate='';this.toDate='';this.currentPage=1;}
  openTraineeDetails(t:Row):void {this.router.navigate(['/company/trainees',t.enrollmentId,'progress']);}
  openSocialLink(url:string|undefined,platform:'github'|'linkedin'):void {
    if (!url) return;
    try {const parsed=new URL(url);const allowed=platform==='github'?['github.com','www.github.com']:['linkedin.com','www.linkedin.com'];if(parsed.protocol==='https:'&&allowed.includes(parsed.hostname.toLowerCase())) window.open(parsed.href,'_blank','noopener,noreferrer');}
    catch { /* Ignore malformed stored links */ }
  }
  exportExcel():void {
    const headers=['رقم المتدرب','الاسم','الدفعة','البرنامج','المشرف','الحضور','الحالة','تاريخ المباشرة','تاريخ الانتهاء','GitHub','LinkedIn'];
    const data=this.filteredTrainees.map(t=>[t.id,t.name,t.cohort,t.program,t.sup,t.att===null?'':t.att,this.statusLabel(t.status),t.start,t.end,t.githubUrl||'',t.linkedinUrl||'']);
    const safe=(v:unknown)=>{const s=String(v??'');return '"'+(/^[=+@\-\t\r]/.test(s)?"'"+s:s).replace(/"/g,'""')+'"';};
    const csv='\uFEFF'+[headers,...data].map(row=>row.map(safe).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const link=document.createElement('a');link.href=url;link.download='trainees.csv';link.click();URL.revokeObjectURL(url);
  }
}
