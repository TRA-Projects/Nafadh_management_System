import { CommonModule } from '@angular/common';

import { Component, ElementRef, HostListener, OnDestroy, OnInit, QueryList, ViewChildren, computed, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { forkJoin, of, catchError } from 'rxjs';
import * as XLSX from 'xlsx';

import { CompanyApi } from '../../services/company-api';

import { AuthService } from '../../../../core/auth/auth.service';



interface CompanyTrainerDto {

  trainerId: number;

  fullName?: string | null;

  specialty?: string | null;

  profileImageUrl?: string | null;

  status?: string | null;

}



interface TrainerAttendanceDto {

  trainerAttendanceId: number;

  trainerId: number;

  trainerName?: string | null;

  date: string;

  status: TrainerAttendanceStatus;

  reason?: string | null;

  checkInTime?: string | null;

  checkOutTime?: string | null;

  isConfirmed?: boolean;

  excuseProofUrl?: string | null;
  /** Supplied by the backend, not calculated in the company UI. */
  excuseReviewStatus?: 'Pending' | 'Approved' | 'Rejected' | null;

}



type TrainerAttendanceStatus = 'Present' | 'Late' | 'Absent' | 'EarlyLeave';



interface TrainerAttendanceUpsertDto {

  status: TrainerAttendanceStatus;

  reason: string | null;

  checkInTime: string | null;

  checkOutTime: string | null;

}



type ViewMode = 'day' | 'week' | 'month';



interface StateMeta {

  key: TrainerAttendanceStatus;

  label: string;

  css: string;

}



interface AttendanceRow {

  trainer: CompanyTrainerDto;

  record: TrainerAttendanceDto | null;

  color: string;

}



const STATES: StateMeta[] = [

  { key: 'Present', label: 'حاضر', css: 'present' },

  { key: 'Late', label: 'متأخر', css: 'late' },

  { key: 'Absent', label: 'غائب', css: 'absent' },

  { key: 'EarlyLeave', label: 'انصراف مبكر', css: 'early' },

];



const AVATAR_COLORS = ['#1b56fd', '#0891b2', '#7c3aed', '#16a34a', '#d97706', '#db2777', '#475569', '#0e7490'];



const TRAINER_STATUS_LABELS: Record<string, string> = {

  Active: 'نشط',

  Inactive: 'غير نشط',

  Suspended: 'موقوف',

};



@Component({

  selector: 'app-company-daily-attendance',

  imports: [CommonModule, FormsModule],

  templateUrl: './DailyAttendance.html',

  styleUrl: './DailyAttendance.scss',

})

export class CompanyDailyAttendance implements OnInit, OnDestroy {

  private readonly api = inject(CompanyApi);

  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  // Optional deep link from a stored trainer-excuse notification.
  private linkedAttendanceId: number | null = null;
  private linkedAttendanceDate: string | null = null;



  readonly canManageAttendance = computed(() => this.auth.role() === 'CompanySupervisor');

  readonly states = STATES;

  readonly todayKey = this.dayKey(new Date());

  readonly todayLabel = new Date().toLocaleDateString('ar-OM', {

    weekday: 'long',

    day: 'numeric',

    month: 'long',

    year: 'numeric',

  });



  private companyId = 0;


  @ViewChildren('trainerFilterMenu') trainerFilterMenus!: QueryList<ElementRef<HTMLDetailsElement>>;

  @HostListener('document:click', ['$event'])
  closeTrainerFiltersOnOutsideClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    this.trainerFilterMenus?.forEach(menu => {
      if (target && !menu.nativeElement.contains(target)) {
        menu.nativeElement.open = false;
      }
    });
  }

  trainerFilterTop = signal(0);
  trainerFilterLeft = signal(0);

  positionTrainerFilter(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const panelWidth = 230;
    this.trainerFilterTop.set(Math.min(rect.bottom + 8, window.innerHeight - 80));
    this.trainerFilterLeft.set(Math.max(8, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 8)));
  }

  selectTrainer(trainerId: number | null): void {
    this.selectedTrainerId.set(trainerId);
    this.trainerFilterMenus?.forEach(menu => { menu.nativeElement.open = false; });
  }

  // UI-only trainer filter shared by the weekly and monthly tables.
  selectedTrainerId = signal<number | null>(null);
  selectedDayTrainerId = signal<number | null>(null);
  trainerSearch = signal('');
  filteredTrainerOptions = computed(() => {
    const query = this.trainerSearch().trim().toLocaleLowerCase();
    const roster = this.view() === 'day' ? this.trainers() : this.historicalTrainers();
    return roster.filter(trainer =>
      !query || (trainer.fullName ?? '').toLocaleLowerCase().includes(query)
    );
  });

  selectedDaySpecialty = signal<string | null>(null);
  specialtySearch = signal('');
  filteredSpecialtyOptions = computed(() => {
    const query = this.specialtySearch().trim().toLocaleLowerCase();
    const specialties = [...new Set(this.trainers().map(trainer =>
      trainer.specialty?.trim() || '—'
    ))].sort((a, b) => a.localeCompare(b, 'ar'));
    return specialties.filter(specialty => !query || specialty.toLocaleLowerCase().includes(query));
  });

  trainers = signal<CompanyTrainerDto[]>([]);
  // Staff directory supplies optional metadata; the period attendance records define history.
  private directoryTrainers = signal<CompanyTrainerDto[]>([]);
  historicalTrainers = computed<CompanyTrainerDto[]>(() => {
    const month = `${this.selectedAttendanceMonth()}-`;
    const lookup = new Map<number, CompanyTrainerDto>();
    for (const trainer of [...this.directoryTrainers(), ...this.trainers()]) {
      lookup.set(trainer.trainerId, trainer);
    }
    const historic = new Map<number, CompanyTrainerDto>();
    for (const record of this.records()) {
      const date = this.dateOf(record.date);
      if (!date.startsWith(month) || date > this.todayKey) continue;
      const metadata = lookup.get(record.trainerId);
      historic.set(record.trainerId, {
        trainerId: record.trainerId,
        fullName: record.trainerName || metadata?.fullName || `مدرب #${record.trainerId}`,
        specialty: metadata?.specialty || '—',
        profileImageUrl: metadata?.profileImageUrl ?? null,
        status: metadata?.status || 'Inactive',
      });
    }
    return [...historic.values()].sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? '', 'ar'));
  });

  failedTrainerImages = signal<number[]>([]);

  trainerImageUrl(trainer: CompanyTrainerDto): string {
    const path = trainer.profileImageUrl?.trim();
    return path ? this.api.resolveFileUrl(path) : '';
  }

  markTrainerImageFailed(trainerId: number): void {
    this.failedTrainerImages.update(ids => ids.includes(trainerId) ? ids : [...ids, trainerId]);
  }


  records = signal<TrainerAttendanceDto[]>([]);

  loading = signal(true);

  loadError = signal(false);

  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;

  /** Hide each distinct notification after four seconds. Repeated identical errors
   * do not extend the duration or keep the banner on screen indefinitely. */
  private showNotice(kind: 'error' | 'success', message: string): void {
    const isSameVisibleNotice = kind === 'error'
      ? this.errorMessage() === message && this.successMessage() === null
      : this.successMessage() === message && this.errorMessage() === null;
    if (isSameVisibleNotice && this.noticeTimer !== null) return;

    this.dismissNotice();
    if (kind === 'error') this.errorMessage.set(message);
    else this.successMessage.set(message);
    this.noticeTimer = setTimeout(() => {
      this.noticeTimer = null;
      this.errorMessage.set(null);
      this.successMessage.set(null);
    }, 4000);
  }

  private showSuccess(message: string): void {
    this.showNotice('success', message);
  }

  dismissNotice(): void {
    if (this.noticeTimer !== null) {
      clearTimeout(this.noticeTimer);
      this.noticeTimer = null;
    }
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  ngOnDestroy(): void {
    this.dismissNotice();
  }

  view = signal<ViewMode>('day');


  // Export menus are independent of the selected display tab.
  exportMenu = signal<'week' | 'month' | null>(null);

  /** Historical attendance period. Defaults to the current month. */
  readonly maxAttendanceMonth = this.todayKey.slice(0, 7);
  readonly minAttendanceMonth = (() => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - 11);
    return this.dayKey(date).slice(0, 7);
  })();
  selectedAttendanceMonth = signal(this.maxAttendanceMonth);
  selectedExportWeek = signal(0);

  onAttendanceMonthChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value) ||
        value < this.minAttendanceMonth || value > this.maxAttendanceMonth) {
      (event.target as HTMLInputElement).value = this.selectedAttendanceMonth();
      return;
    }
    if (value === this.selectedAttendanceMonth()) return;
    this.selectedAttendanceMonth.set(value);
    this.selectedTrainerId.set(null); // A trainer selected in another month may have no records here.
    this.selectedWeek.set(null);
    this.selectedExportWeek.set(this.initialWeekIndex());
    this.load();
  }

  onExportWeekChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (Number.isInteger(value) && value >= 0 && value < this.monthWeeks().length) {
      this.selectedExportWeek.set(value);
    }
  }

  private initialWeekIndex(): number {
    if (this.selectedAttendanceMonth() !== this.maxAttendanceMonth) return 0;
    const index = this.monthWeeks().findIndex(w => this.todayKey >= this.dayKey(w.start) && this.todayKey <= this.dayKey(w.end));
    return index < 0 ? 0 : index;
  }


  toggleExportMenu(mode: 'week' | 'month'): void {
    this.exportMenu.update(current => current === mode ? null : mode);
  }

  private exportPeriodLabel(mode: 'week' | 'month'): string {
    if (mode === 'week') return this.currentWeek()?.label ?? '—';
    const [year, month] = this.selectedAttendanceMonth().split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('ar-OM', { month: 'long', year: 'numeric' });
  }

  private exportWeeks(mode: 'week' | 'month') {
    return mode === 'week' ? [this.currentWeek()] : this.monthWeeks();
  }

  /** Display-only effective status: an approved *absence* is "بعذر".
   * Preserve the stored Absent status for audit, existing reports and attendance metrics.
   * Late and EarlyLeave never become "بعذر".
   */
  isExcusedAbsence(record: TrainerAttendanceDto | null | undefined): boolean {
    return record?.status === 'Absent' && record.excuseReviewStatus === 'Approved';
  }

  attendanceDisplayLabel(record: TrainerAttendanceDto | null | undefined): string {
    if (this.isExcusedAbsence(record)) return 'بعذر';
    return this.statusText(record?.status);
  }

  private statusText(status?: TrainerAttendanceStatus): string {
    return status ? (STATES.find(s => s.key === status)?.label ?? status) : 'لم يسجل';
  }

  private exportData(mode: 'week' | 'month') {
    const weeks = this.exportWeeks(mode);
    const summaries = weeks.map((week, index) => {
      const rows = this.weekRows(week);
      return {
        title: mode === 'week' ? 'السجل الأسبوعي' : `الأسبوع ${['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'][index] ?? index + 1}`,
        label: week.label,
        days: week.days,
        stats: this.weekStats(week),
        rows: rows.map(row => ({
          name: row.trainer.fullName || 'مدرب',
          specialty: row.trainer.specialty || '—',
          rate: row.rate,
          days: row.days,
        })),
      };
    });
    const excuses = summaries.flatMap(w => w.rows.flatMap(r => r.days
      .filter(d => d.record && (d.record.status === 'Absent' || !!d.record.reason || !!d.record.excuseProofUrl))
      .map(d => ({ week: w.title, name: r.name, date: d.key,
        status: this.attendanceDisplayLabel(d.record), reason: d.record?.reason || 'لا يوجد سبب',
        proof: d.record?.excuseProofUrl ? this.fileUrl(d.record.excuseProofUrl) : '',
      }))));
    return { summaries, excuses };
  }

  exportExcel(mode: 'week' | 'month'): void {
    this.exportMenu.set(null);
    if (this.loading() || this.loadError()) return;
    const { summaries, excuses } = this.exportData(mode);
    const book = XLSX.utils.book_new();
    for (const [i, week] of summaries.entries()) {
      const table: (string | number)[][] = [
        [week.title, week.label],
        ['المدرب', 'التخصص', ...week.days.map(d => `${d.label} ${d.key}`), 'نسبة الالتزام'],
        ...week.rows.map(r => [r.name, r.specialty, ...r.days.map(d => this.attendanceDisplayLabel(d.record)), r.rate === null ? '—' : `${r.rate}%`]),
        [],
        ['حاضر', week.stats.Present, 'متأخر', week.stats.Late, 'غائب', week.stats.Absent, 'انصراف مبكر', week.stats.EarlyLeave],
        ['نسبة الالتزام', week.stats.rate === null ? '—' : `${week.stats.rate}%`],
      ];
      const sheet = XLSX.utils.aoa_to_sheet(table);
      sheet['!cols'] = [{ wch: 30 }, { wch: 26 }, ...week.days.map(() => ({ wch: 23 })), { wch: 18 }];
      sheet['!views'] = [{ rightToLeft: true }];
      XLSX.utils.book_append_sheet(book, sheet, `الأسبوع ${i + 1}`);
    }
    const excuseRows = [
      ['الأسبوع', 'المدرب', 'التاريخ', 'الحالة', 'سبب / ملاحظة', 'رابط إثبات العذر'],
      ...excuses.map(e => [e.week, e.name, e.date, e.status, e.reason, e.proof || 'غير مرفق']),
    ];
    if (!excuses.length) excuseRows.push(['لا توجد أعذار مسجلة']);
    const excuseSheet = XLSX.utils.aoa_to_sheet(excuseRows);
    excuseSheet['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 16 }, { wch: 20 }, { wch: 55 }, { wch: 65 }];
    excuseSheet['!views'] = [{ rightToLeft: true }];
    XLSX.utils.book_append_sheet(book, excuseSheet, 'الأعذار');
    XLSX.writeFile(book, `TrainerAttendance_${mode}_${this.selectedAttendanceMonth()}${mode === 'week' ? `_week_${this.selectedExportWeek() + 1}` : ''}.xlsx`);
  }

  private escapeReport(value: unknown): string {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  exportPdf(mode: 'week' | 'month'): void {
    this.exportMenu.set(null);
    if (this.loading() || this.loadError()) return;
    const { summaries, excuses } = this.exportData(mode);
    const esc = (v: unknown) => this.escapeReport(v);
    const title = mode === 'week' ? 'تقرير الحضور الأسبوعي' : 'تقرير الحضور الشهري';
    const sections = summaries.map(week => `
      <section class="week"><h2>${esc(week.title)} <small>${esc(week.label)}</small></h2>
      <div class="stats">حاضر: ${week.stats.Present} &nbsp; | &nbsp; متأخر: ${week.stats.Late} &nbsp; | &nbsp; غائب: ${week.stats.Absent} &nbsp; | &nbsp; انصراف مبكر: ${week.stats.EarlyLeave} &nbsp; | &nbsp; نسبة الالتزام: ${week.stats.rate === null ? '—' : week.stats.rate + '%'}</div>
      <table><thead><tr><th>المدرب</th><th>التخصص</th>${week.days.map(d => `<th>${esc(d.label)}<br><small>${esc(d.key)}</small></th>`).join('')}<th>الالتزام</th></tr></thead>
      <tbody>${week.rows.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.specialty)}</td>${r.days.map(d => `<td class="${d.record?.status === 'Absent' ? 'absent' : ''}">${esc(this.attendanceDisplayLabel(d.record))}</td>`).join('')}<td>${r.rate === null ? '—' : r.rate + '%'}</td></tr>`).join('')}</tbody></table></section>`).join('');
    const excuseTable = `<section class="excuses"><h2>جدول الأعذار والملاحظات</h2>
      <table><thead><tr><th>الأسبوع</th><th>المدرب</th><th>التاريخ</th><th>الحالة</th><th>السبب / الملاحظة</th><th>إثبات العذر</th></tr></thead><tbody>
      ${excuses.length ? excuses.map(e => `<tr><td>${esc(e.week)}</td><td>${esc(e.name)}</td><td>${esc(e.date)}</td><td>${esc(e.status)}</td><td>${esc(e.reason)}</td><td>${e.proof ? `<a href="${esc(e.proof)}" target="_blank" rel="noopener">عرض الإثبات</a>` : 'غير مرفق'}</td></tr>`).join('') : '<tr><td colspan="6">لا توجد أعذار مسجلة</td></tr>'}
      </tbody></table></section>`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { this.showNotice('error', 'المتصفح منع فتح نافذة التقرير. اسمحي بالنوافذ المنبثقة ثم أعيدي المحاولة.'); return; }
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${title}</title><style>
      @page { size: A4 landscape; margin: 12mm; }
      *{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;color:#14213d;margin:0;direction:rtl;font-size:11px}
      header{border-bottom:3px solid #172b85;padding-bottom:12px;margin-bottom:18px}h1{margin:0 0 8px;font-size:21px;color:#101d78}h2{font-size:15px;color:#101d78;margin:18px 0 10px}small{font-size:10px;color:#64748b;font-weight:normal}
      .stats{background:#eef3ff;padding:10px;border-radius:6px;margin-bottom:10px;font-weight:bold}table{width:100%;border-collapse:collapse;table-layout:auto;direction:rtl}th,td{border:1px solid #d7e0ef;padding:7px 6px;text-align:right;vertical-align:top;overflow-wrap:anywhere}th{background:#edf2fb;color:#12277b}tbody tr:nth-child(even){background:#f8faff}.absent{color:#c62828;font-weight:bold}a{color:#1453c8}.week{break-inside:avoid-page;margin-bottom:20px}.excuses{break-before:page}thead{display:table-header-group}tr{break-inside:avoid}footer{margin-top:20px;color:#64748b;font-size:10px}
      @media screen{body{max-width:1200px;margin:75px auto 24px;padding:20px}.report-actions{position:fixed;left:20px;top:15px;display:flex;gap:9px;z-index:10}.report-actions button{color:white;border:0;border-radius:7px;padding:10px 16px;cursor:pointer;font-family:inherit;font-weight:bold}.print-btn{background:#172b85}.save-btn{background:#087c63}}
      @media print{.report-actions{display:none!important}}
      #attendance-report{background:#fff;padding:10px} .report-actions button:disabled{opacity:.55;cursor:wait}
      </style></head><body><div class="report-actions"><button class="print-btn" onclick="window.print()">🖨 طباعة</button><button class="save-btn" onclick="saveAsPdf()">↓ حفظ PDF</button></div><main id="attendance-report"><header><h1>${title}</h1><div>تاريخ إعداد التقرير: ${esc(this.todayKey)} | ${esc(this.exportPeriodLabel(mode))}</div></header>${sections}${excuseTable}<footer>البيانات من سجلات حضور المدربين المحملة في النظام. روابط الإثبات تتطلب صلاحية الوصول للملفات.</footer></main><script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script><script>
      async function saveAsPdf(){
        const button=document.querySelector(".save-btn");
        if(!window.html2pdf){alert("تعذر تحميل أداة حفظ PDF. تأكدي من الاتصال بالإنترنت ثم أعيدي فتح التقرير.");return;}
        button.disabled=true;button.textContent="جاري تجهيز PDF...";
        try{
          await window.html2pdf().set({
            margin:8, filename:"TrainerAttendance_${mode}_${this.selectedAttendanceMonth()}${mode === 'week' ? `_week_${this.selectedExportWeek() + 1}` : ''}.pdf",
            image:{type:"jpeg",quality:0.98},
            html2canvas:{scale:2,useCORS:true,backgroundColor:"#ffffff",scrollY:0},
            jsPDF:{unit:"mm",format:"a4",orientation:"landscape"},
            pagebreak:{mode:["css","legacy"],avoid:["tr"]}
          }).from(document.getElementById("attendance-report")).save();
        }catch(error){console.error(error);alert("تعذر حفظ التقرير. حاولي مرة أخرى.");}
        finally{button.disabled=false;button.textContent="↓ حفظ PDF";}
      }
      </script></body></html>`);
    printWindow.document.close();
    printWindow.focus();
  }

  selectedWeek = signal<number | null>(null);

  /** Company attendance rate for recorded entries in the selected month. */
  monthlyAttendanceRate = computed<number | null>(() => {
    const monthPrefix = `${this.selectedAttendanceMonth()}-`;
    const monthRecords = this.records().filter(record => {
      const date = this.dateOf(record.date);
      return date.startsWith(monthPrefix) && date <= this.todayKey;
    });
    if (!monthRecords.length) return null;
    return Math.round(monthRecords.reduce((sum, record) => sum + this.commitmentPoints(record.status), 0) / monthRecords.length);
  });




  savingIds = signal<number[]>([]);

  confirming = signal(false);




  weeklyExcuse = signal<TrainerAttendanceDto | null>(null);

  reviewingExcuseId = signal<number | null>(null);

  isExcuseReviewed(record: TrainerAttendanceDto | null): boolean {
    return record?.excuseReviewStatus === 'Approved' || record?.excuseReviewStatus === 'Rejected';
  }

  reviewLabel(record: TrainerAttendanceDto | null): string {
    if (!record || !this.hasExcuse(record)) return 'لم يُقدّم عذر';
    switch (record.excuseReviewStatus) {
      case 'Approved': return 'العذر مقبول';
      case 'Rejected': return 'العذر مرفوض';
      default: return 'بانتظار المراجعة';
    }
  }

  /** Review must persist on the backend; never mark a decision locally before success. */
  reviewExcuse(record: TrainerAttendanceDto, decision: 'Approved' | 'Rejected'): void {
    if (!this.canManageAttendance() || !this.hasExcuse(record) || this.isExcuseReviewed(record) || this.reviewingExcuseId() !== null) return;
    this.reviewingExcuseId.set(record.trainerAttendanceId);
    this.api.reviewTrainerAttendanceExcuse(record.trainerAttendanceId, decision).subscribe({
      next: () => {
        // Reload authoritative state (including review status) from the backend.
        this.api.getTrainerAttendance(this.companyId, this.loadFromKey(), this.todayKey).subscribe({
          next: records => {
            this.records.set(records ?? []);
            const updated = (records ?? []).find(r => r.trainerAttendanceId === record.trainerAttendanceId);
            if (updated) this.weeklyExcuse.set(updated);
            this.reviewingExcuseId.set(null);
            this.showSuccess(decision === 'Approved' ? 'تم قبول عذر المدرب بنجاح.' : 'تم رفض عذر المدرب بنجاح.');
          },
          error: err => {
            this.showError(err, 'تم إرسال القرار لكن تعذّر تحديث السجل.');
            this.reviewingExcuseId.set(null);
          }
        });
      },
      error: err => {
        this.showError(err, 'تعذّر حفظ قرار مراجعة العذر.');
        this.reviewingExcuseId.set(null);
      }
    });
  }



  /** Attendance contribution per recorded day. */
  private commitmentPoints(status: TrainerAttendanceStatus): number {
    return status === 'Present' ? 100 : status === 'Absent' ? 0 : 75;
  }

  weeklyStatusLabel(record: TrainerAttendanceDto): string {
    return this.attendanceDisplayLabel(record);
  }

  hasExcuse(record: TrainerAttendanceDto | null): boolean {
    return !!(record?.reason?.trim() || record?.excuseProofUrl);
  }

  openWeeklyExcuse(record: TrainerAttendanceDto): void {
    // Company supervisors review trainer-submitted excuses; proof upload belongs to the trainer flow.
    if (!['week', 'month'].includes(this.view()) || !this.hasExcuse(record)) return;
    this.weeklyExcuse.set(record);
  }

  closeWeeklyExcuse(): void {
    this.weeklyExcuse.set(null);
  }

  private upsertRecord(saved: TrainerAttendanceDto): void {
    this.records.update(list => [...list.filter(item =>
      !(item.trainerId === saved.trainerId && this.dateOf(item.date) === this.dateOf(saved.date))
    ), saved]);
  }




  /** Records indexed by `${trainerId}|${yyyy-MM-dd}`. */

  private recordMap = computed(() => {

    const map = new Map<string, TrainerAttendanceDto>();

    for (const record of this.records()) {

      map.set(this.recordKey(record.trainerId, record.date), record);

    }

    return map;

  });



  /** Today's rows. `record` is null until the company records the trainer. */

  rows = computed<AttendanceRow[]>(() =>

    this.trainers().map((trainer, index) => ({

      trainer,

      record: this.recordMap().get(this.recordKey(trainer.trainerId, this.todayKey)) ?? null,

      color: AVATAR_COLORS[index % AVATAR_COLORS.length],

    })),

  );



  dayRows = computed(() => this.rows().filter(row =>
    (this.selectedDayTrainerId() === null || row.trainer.trainerId === this.selectedDayTrainerId()) &&
    (this.selectedDaySpecialty() === null || (row.trainer.specialty?.trim() || '—') === this.selectedDaySpecialty())
  ));

  counts = computed(() => {

    const result: Record<TrainerAttendanceStatus, number> = { Present: 0, Late: 0, Absent: 0, EarlyLeave: 0 };

    for (const row of this.rows()) {

      result[row.record?.status ?? 'Present']++;

    }

    return result;

  });



  recordedCount = computed(() => this.rows().filter((row) => row.record).length);

  missingCount = computed(() => this.rows().length - this.recordedCount());



  /** Share of recorded trainers who were not absent, or null when nothing is recorded yet. */

  attendanceRate = computed<number | null>(() => {

    const total = this.rows().length;
    if (!total) return null;
    const c = this.counts();
    return Math.round((c.Present * 100 + (c.Late + c.EarlyLeave) * 75) / total);

  });



  isConfirmed = computed(() => this.rows().length > 0 && this.rows().every((row) => row.record?.isConfirmed));



  canConfirm = computed(

    () => this.canManageAttendance() && !this.isConfirmed() && this.rows().length > 0 && !this.confirming() && this.savingIds().length === 0,

  );



  /** Sunday–Thursday workweek, including partial weeks at month boundaries. */

  monthWeeks = computed(() => {
    const [year, month] = this.selectedAttendanceMonth().split('-').map(Number);
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    const weeks: { index: number; start: Date; end: Date; days: { key: string; label: string }[]; label: string }[] = [];
    const cursor = new Date(first);
    cursor.setDate(cursor.getDate() - cursor.getDay());
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    while (cursor <= last) {
      const start = new Date(cursor);
      const end = new Date(cursor);
      end.setDate(end.getDate() + 6);
      const days = dayNames.map((label, offset) => {
        const date = new Date(start);
        date.setDate(start.getDate() + offset);
        return { key: this.dayKey(date), label };
      }).filter(day => day.key >= this.dayKey(first) && day.key <= this.dayKey(last));
      if (days.length) {
        const format = (date: Date) => date.toLocaleDateString('ar-OM', { day: 'numeric', month: 'long' });
        weeks.push({ index: weeks.length, start, end, days,
          label: `${format(start < first ? first : start)} – ${format(end > last ? last : end)}` });
      }
      cursor.setDate(cursor.getDate() + 7);
    }
    return weeks;
  });

  currentWeek = computed(() => this.monthWeeks()[this.selectedExportWeek()] ?? this.monthWeeks()[0]);

  rangeLabel = computed(() => this.view() === 'week'
    ? (this.currentWeek()?.label ?? '—')
    : (() => {
        const [year, month] = this.selectedAttendanceMonth().split('-').map(Number);
        return new Date(year, month - 1, 1).toLocaleDateString('ar-OM', { month: 'long', year: 'numeric' });
      })());

  /** Returns a status grid for a given week, based only on recorded attendance. */

  weekRows(week: { days: { key: string; label: string }[] }, applyTrainerFilter = false) {

    const map = this.recordMap();

    const periodKeys = new Set(week.days.map(day => day.key));
    const periodTrainerIds = new Set(this.records()
      .filter(record => periodKeys.has(this.dateOf(record.date)))
      .map(record => record.trainerId));
    return this.historicalTrainers().filter(trainer =>
      periodTrainerIds.has(trainer.trainerId) &&
      (!applyTrainerFilter || this.selectedTrainerId() === null || trainer.trainerId === this.selectedTrainerId())
    ).map((trainer, index) => {

      const days = week.days.map(day => ({

        ...day, record: map.get(this.recordKey(trainer.trainerId, day.key)) ?? null,

      }));

      const recorded = days.filter(day => day.record);

      const rate = recorded.length ? Math.round(recorded.reduce((sum, day) => sum + this.commitmentPoints(day.record!.status), 0) / recorded.length) : null;

      return { trainer, days, rate, color: AVATAR_COLORS[index % AVATAR_COLORS.length] };

    });

  }



  statusSymbol(record: TrainerAttendanceDto | null): string {
    if (this.isExcusedAbsence(record)) return 'ع';
    return ({ Present: 'ح', Late: 'ت', Absent: 'غ', EarlyLeave: 'م' } as Record<TrainerAttendanceStatus, string>)[record?.status!] ?? '—';
  }



  statusClass(record: TrainerAttendanceDto | null): string {
    if (this.isExcusedAbsence(record)) return 'badge-Excused';
    return record?.status ? `badge-${record.status}` : 'badge-empty';
  }



  weekStats(week: { days: { key: string; label: string }[] }) {

    const keys = new Set(week.days.map(d => d.key));

    const counts = { Present: 0, Late: 0, Absent: 0, EarlyLeave: 0 };

    for (const record of this.records()) {

      if (keys.has(this.dateOf(record.date))) counts[record.status]++;

    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return { ...counts, rate: total ? Math.round((counts.Present * 100 + (counts.Late + counts.EarlyLeave) * 75) / total) : null };

  }



ngOnInit(): void {
  this.companyId = this.auth.companyId ?? 0;

  // A notification provides the attendance record ID and its calendar date.
  // Keep the existing attendance page/UI, changing only the initial selection.
  const params = this.route.snapshot.queryParamMap;
  const idParam = params.get('attendanceId');
  const attendanceId = idParam && /^[1-9]\d*$/.test(idParam) ? Number(idParam) : null;
  const dateParam = params.get('date');
  const validDate = dateParam && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(dateParam)
    && this.dayKey(new Date(`${dateParam}T12:00:00`)) === dateParam && dateParam <= this.todayKey;

  if (attendanceId && Number.isSafeInteger(attendanceId) && validDate) {
    this.linkedAttendanceId = attendanceId;
    this.linkedAttendanceDate = dateParam;
    this.selectedAttendanceMonth.set(dateParam.slice(0, 7));
    this.view.set('week');
  }

  this.selectedExportWeek.set(this.initialWeekIndex());
  this.load();
}



  load(): void {

    this.loading.set(true);

    this.loadError.set(false);



    forkJoin({

      trainers: this.api.getCompanyTrainers(this.companyId, this.todayKey),
      directory: this.api.getCompanyTrainerDirectory(this.companyId).pipe(catchError(() => of([]))),
      records: this.api.getTrainerAttendance(this.companyId, this.loadFromKey(), this.loadToKey()),

    }).subscribe({

      next: ({ trainers, directory, records }) => {

        this.failedTrainerImages.set([]);
        this.trainers.set((trainers ?? []).map(trainer => ({
          ...trainer,
          profileImageUrl: trainer.profileImageUrl ??
            (trainer as CompanyTrainerDto & { ProfileImageUrl?: string | null }).ProfileImageUrl ?? null,
        })));

        this.directoryTrainers.set(directory ?? []);
        this.records.set(records ?? []);

        // Open the specific trainer excuse only after the correct date range
        // has been fetched from the server. Never alter the saved attendance.
        this.openLinkedExcuseIfAvailable(records ?? []);
        this.loading.set(false);

      },

      error: (err) => {

        console.error('Failed to load trainer attendance.', err);

        this.loadError.set(true);

        this.loading.set(false);

      },

    });

  }



  private openLinkedExcuseIfAvailable(records: TrainerAttendanceDto[]): void {
    const id = this.linkedAttendanceId;
    const date = this.linkedAttendanceDate;
    if (id === null || date === null) return;

    const record = records.find(item =>
      item.trainerAttendanceId === id && this.dateOf(item.date) === date);
    if (!record) {
      this.showNotice('error', 'تعذر العثور على سجل العذر المرتبط بهذا الإشعار.');
      return;
    }

    const weekIndex = this.monthWeeks().findIndex(week =>
      this.dayKey(week.start) <= date && date <= this.dayKey(week.end));
    if (weekIndex >= 0) {
      this.selectedExportWeek.set(weekIndex);
      this.selectedWeek.set(weekIndex);
    }
    this.selectedTrainerId.set(record.trainerId);
    this.view.set('week');
    if (this.hasExcuse(record)) {
      this.openWeeklyExcuse(record);
    } else {
      this.showNotice('error', 'سجل الحضور موجود، لكن لا يحتوي على عذر مرفق.');
    }
    // Opening the deep link is a one-time navigation action, not a new
    // review/approval. Subsequent refreshes must not re-open the dialog.
    this.linkedAttendanceId = null;
    this.linkedAttendanceDate = null;
  }

  setView(mode: ViewMode): void {

  this.view.set(mode);



  if (mode === 'month') {

    this.selectedWeek.set(null);

  }

}



  toggleWeek(index: number): void {

    this.selectedWeek.update(current =>

    current === index ? null : index);

  }



  // ---------------------------------------------------------------- status



  setStatus(row: AttendanceRow, status: TrainerAttendanceStatus): void {
    if (!this.canManageAttendance()) return;

    if (this.isConfirmed() || this.isSaving(row.trainer.trainerId)) return;

    if (row.record?.status === status) return;



    this.save(row.trainer.trainerId, {

      status,

      reason: row.record?.reason ?? null,

      checkInTime: row.record?.checkInTime ?? null,

      checkOutTime: row.record?.checkOutTime ?? null,

    });

  }



  onTimeChange(row: AttendanceRow, field: 'checkInTime' | 'checkOutTime', value: string): void {
    if (!this.canManageAttendance()) return;

    if (!row.record || row.record.status === 'Present' || this.isConfirmed()) return;



    const values: Pick<TrainerAttendanceUpsertDto, 'status' | 'reason' | 'checkInTime' | 'checkOutTime'> = {

      status: row.record.status,

      reason: row.record.reason ?? null,

      checkInTime: row.record.checkInTime ?? null,

      checkOutTime: row.record.checkOutTime ?? null,

    };

    values[field] = value ? `${value}:00` : null;



    this.save(row.trainer.trainerId, values);

  }



  // --------------------------------------------------------------- confirm



  showConfirmPopover = signal(false);

  confirmDay(): void {
    if (!this.canManageAttendance()) return;
    if (!this.canConfirm()) return;
    if (!this.showConfirmPopover()) return;

    const missingArrival = this.rows().find(row => row.record?.status === 'Late' && !row.record.checkInTime);
    if (missingArrival) {
      this.showConfirmPopover.set(false);
      this.errorMessage.set('يجب تحديد وقت الوصول للمدرب المتأخر قبل تأكيد سجل الحضور.');
      return;
    }
    const missingDeparture = this.rows().find(row => row.record?.status === 'EarlyLeave' && !row.record.checkOutTime);
    if (missingDeparture) {
      this.showConfirmPopover.set(false);
      this.errorMessage.set('يجب تحديد وقت الانصراف المبكر قبل تأكيد سجل الحضور.');
      return;
    }

    this.showConfirmPopover.set(false);
    this.confirming.set(true);
    // Persist the default Present status only for trainers without a record.
    const missing = this.rows().filter(row => !row.record);
    if (missing.length) {
      forkJoin(missing.map(row => this.api.saveTrainerAttendance({
        companyId: this.companyId,
        trainerId: row.trainer.trainerId,
        date: this.todayKey,
        status: 'Present',
        reason: null,
        checkInTime: null,
        checkOutTime: null,
      }))).subscribe({
        next: saved => {
          saved.forEach(record => this.upsertRecord(record));
          this.finishConfirmDay();
        },
        error: err => {
          this.showError(err, 'تعذر حفظ الحضور الافتراضي. لم يتم تأكيد السجل.');
          this.confirming.set(false);
          this.load();
        },
      });
      return;
    }
    this.finishConfirmDay();
  }

  private finishConfirmDay(): void {
    this.api.confirmTrainerAttendanceDay({ companyId: this.companyId, date: this.todayKey }).subscribe({

      next: () => {

        // Reload so every record carries the confirmed flag from the backend.

        this.api.getTrainerAttendance(this.companyId, this.loadFromKey(), this.loadToKey()).subscribe({

          next: (records) => {

            this.records.set(records ?? []);

            this.showSuccess('تم تأكيد سجل اليوم بنجاح.');

            this.confirming.set(false);

          },

          error: () => this.confirming.set(false),

        });

      },

      error: (err) => {

        this.showError(err, 'تعذر تأكيد سجل اليوم.');

        this.confirming.set(false);

      },

    });

  }



  // --------------------------------------------------------------- helpers



  isSaving(trainerId: number): boolean {

    return this.savingIds().includes(trainerId);

  }



  dismissError(): void {
    this.dismissNotice();
  }



  initials(name?: string | null): string {

    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);

    if (!parts.length) return 'م';

    if (parts.length === 1) return parts[0].charAt(0);

    return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);

  }



  trainerStatusLabel(status?: string | null): string {

    return TRAINER_STATUS_LABELS[status ?? ''] ?? '—';

  }



  fileUrl(path?: string | null): string {

    return this.api.resolveFileUrl(path);

  }



  proofName(url?: string | null): string {

    const name = (url ?? '').split('/').pop() ?? '';

    try {

      return decodeURIComponent(name);

    } catch {

      return name;

    }

  }



  timeValue(time?: string | null): string {

    return (time ?? '').slice(0, 5);

  }



  trackByTrainer(_: number, row: AttendanceRow): number {

    return row.trainer.trainerId;

  }



  private save(

    trainerId: number,

    values: Pick<TrainerAttendanceUpsertDto, 'status' | 'reason' | 'checkInTime' | 'checkOutTime'>,

  ): void {
    if (!this.canManageAttendance()) return;

    this.setSaving(trainerId, true);



    this.api

      .saveTrainerAttendance({

        companyId: this.companyId,

        trainerId,

        date: this.todayKey,

        ...values,

      })

      .subscribe({

        next: (saved) => {

          this.records.update((list) => {

            const others = list.filter(

              (item) => !(item.trainerId === saved.trainerId && this.dateOf(item.date) === this.dateOf(saved.date)),

            );

            return [...others, saved];

          });

          this.showSuccess('تم حفظ حالة الحضور بنجاح.');

          this.setSaving(trainerId, false);

        },

        error: (err) => {

          this.showError(err, 'تعذر حفظ الحضور.');

          this.setSaving(trainerId, false);

        },

      });

  }



  private patchRecord(attendanceId: number, patch: Partial<TrainerAttendanceDto>): void {

    this.records.update((list) =>

      list.map((item) => (item.trainerAttendanceId === attendanceId ? { ...item, ...patch } : item)),

    );

  }



  private setSaving(trainerId: number, saving: boolean): void {

    this.savingIds.update((ids) =>

      saving ? [...ids.filter((id) => id !== trainerId), trainerId] : ids.filter((id) => id !== trainerId),

    );

  }



  /** Display friendly Arabic messages instead of raw English API errors. */
  private showError(err: unknown, fallback: string): void {
    console.error(fallback, err);
    const error = err as { status?: number; error?: unknown };
    const payload = error?.error;
    const raw = (typeof payload === 'string' ? payload :
      (payload && typeof payload === 'object' ?
        String((payload as { message?: string; title?: string; detail?: string }).message ??
               (payload as { title?: string }).title ??
               (payload as { detail?: string }).detail ?? '') : '')).toLowerCase();

    let message = fallback;
    if (raw.includes('storage path') || raw.includes('not configured')) {
      message = 'تعذر رفع الإثبات لأن مسار حفظ الملفات غير مُعدّ في الخادم. تواصلي مع مسؤول النظام.';
   } else if (
  raw.includes('exceed') ||
  raw.includes('mb') ||
  error?.status === 413
) {
  message = 'حجم الملف يتجاوز الحد المسموح في إعدادات النظام.';
} else if (raw.includes('file type') || raw.includes('invalid file') || raw.includes('only jpg') || raw.includes('extension')) {
      message = 'نوع الملف غير مدعوم. اختاري صورة JPG أو PNG أو WEBP أو ملف PDF.';
    } else if (raw.includes('proof file is required') || raw.includes('empty file')) {
      message = 'يرجى اختيار صورة أو ملف PDF قبل الرفع.';
    } else if (raw.includes('submission period') || raw.includes('week has ended')) {
      message = 'انتهت فترة إضافة أو تعديل الإثبات لهذا الأسبوع.';
    } else if (raw.includes('only allowed for') || raw.includes('present record')) {
      message = 'يمكن إرفاق إثبات لحالات الغياب أو التأخير أو الانصراف المبكر فقط.';
    } else if (error?.status === 401 || error?.status === 403) {
      message = 'ليست لديك صلاحية رفع الإثبات. يرجى تسجيل الدخول أو مراجعة الصلاحيات.';
    } else if (error?.status === 404) {
      message = 'تعذر العثور على سجل الحضور المطلوب.';
    } else if (error?.status === 0) {
      message = 'تعذر الاتصال بالخادم. تأكدي من تشغيل الـ Backend والاتصال بالشبكة.';
    } else if (error?.status === 500) {
      message = 'حدث خطأ في الخادم أثناء معالجة الطلب. حاولي لاحقًا.';
    }
    this.showNotice('error', message);
  }

  private recordKey(trainerId: number, date: string): string {

    return `${trainerId}|${this.dateOf(date)}`;

  }



  private dateOf(date: string): string {

    return (date ?? '').slice(0, 10);

  }



  private dayKey(date: Date): string {

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;

  }



  private rangeStart(): Date {

    const start = new Date();

    if (this.view() === 'month') {

      start.setDate(1);

    } else {

      start.setDate(start.getDate() - start.getDay());

    }

    start.setHours(0, 0, 0, 0);

    return start;

  }



  /** Fetch both the selected historical period and today's record for the daily tab. */
  private loadFromKey(): string {
    const selectedFirst = `${this.selectedAttendanceMonth()}-01`;
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay());
    const currentMonthFirst = `${this.maxAttendanceMonth}-01`;
    return [selectedFirst, currentMonthFirst, this.dayKey(currentWeekStart)].sort()[0];
  }

  private loadToKey(): string {
    return this.todayKey;
  }

}