import { CommonModule } from '@angular/common';

import { Component, ElementRef, HostListener, OnInit, QueryList, ViewChildren, computed, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { forkJoin } from 'rxjs';
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

  date: string;

  status: TrainerAttendanceStatus;

  reason?: string | null;

  checkInTime?: string | null;

  checkOutTime?: string | null;

  isConfirmed?: boolean;

  excuseProofUrl?: string | null;

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

export class CompanyDailyAttendance implements OnInit {

  private readonly api = inject(CompanyApi);

  private readonly auth = inject(AuthService);



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
    return this.trainers().filter(trainer =>
      !query || (trainer.fullName ?? '').toLocaleLowerCase().includes(query)
    );
  });

  trainers = signal<CompanyTrainerDto[]>([]);

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

  view = signal<ViewMode>('day');


  // Export menus are independent of the selected display tab.
  exportMenu = signal<'week' | 'month' | null>(null);

  toggleExportMenu(mode: 'week' | 'month'): void {
    this.exportMenu.update(current => current === mode ? null : mode);
  }

  private exportWeeks(mode: 'week' | 'month') {
    return mode === 'week' ? [this.currentWeek()] : this.monthWeeks();
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
        status: this.statusText(d.record?.status), reason: d.record?.reason || 'لا يوجد سبب',
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
        ...week.rows.map(r => [r.name, r.specialty, ...r.days.map(d => this.statusText(d.record?.status)), r.rate === null ? '—' : `${r.rate}%`]),
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
    XLSX.writeFile(book, `TrainerAttendance_${mode}_${this.todayKey}.xlsx`);
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
      <tbody>${week.rows.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.specialty)}</td>${r.days.map(d => `<td class="${d.record?.status === 'Absent' ? 'absent' : ''}">${esc(this.statusText(d.record?.status))}</td>`).join('')}<td>${r.rate === null ? '—' : r.rate + '%'}</td></tr>`).join('')}</tbody></table></section>`).join('');
    const excuseTable = `<section class="excuses"><h2>جدول الأعذار والملاحظات</h2>
      <table><thead><tr><th>الأسبوع</th><th>المدرب</th><th>التاريخ</th><th>الحالة</th><th>السبب / الملاحظة</th><th>إثبات العذر</th></tr></thead><tbody>
      ${excuses.length ? excuses.map(e => `<tr><td>${esc(e.week)}</td><td>${esc(e.name)}</td><td>${esc(e.date)}</td><td>${esc(e.status)}</td><td>${esc(e.reason)}</td><td>${e.proof ? `<a href="${esc(e.proof)}" target="_blank" rel="noopener">عرض الإثبات</a>` : 'غير مرفق'}</td></tr>`).join('') : '<tr><td colspan="6">لا توجد أعذار مسجلة</td></tr>'}
      </tbody></table></section>`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { this.errorMessage.set('المتصفح منع فتح نافذة التقرير. اسمحي بالنوافذ المنبثقة ثم أعيدي المحاولة.'); return; }
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${title}</title><style>
      @page { size: A4 landscape; margin: 12mm; }
      *{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;color:#14213d;margin:0;direction:rtl;font-size:11px}
      header{border-bottom:3px solid #172b85;padding-bottom:12px;margin-bottom:18px}h1{margin:0 0 8px;font-size:21px;color:#101d78}h2{font-size:15px;color:#101d78;margin:18px 0 10px}small{font-size:10px;color:#64748b;font-weight:normal}
      .stats{background:#eef3ff;padding:10px;border-radius:6px;margin-bottom:10px;font-weight:bold}table{width:100%;border-collapse:collapse;table-layout:auto;direction:rtl}th,td{border:1px solid #d7e0ef;padding:7px 6px;text-align:right;vertical-align:top;overflow-wrap:anywhere}th{background:#edf2fb;color:#12277b}tbody tr:nth-child(even){background:#f8faff}.absent{color:#c62828;font-weight:bold}a{color:#1453c8}.week{break-inside:avoid-page;margin-bottom:20px}.excuses{break-before:page}thead{display:table-header-group}tr{break-inside:avoid}footer{margin-top:20px;color:#64748b;font-size:10px}
      @media screen{body{max-width:1200px;margin:75px auto 24px;padding:20px}.report-actions{position:fixed;left:20px;top:15px;display:flex;gap:9px;z-index:10}.report-actions button{color:white;border:0;border-radius:7px;padding:10px 16px;cursor:pointer;font-family:inherit;font-weight:bold}.print-btn{background:#172b85}.save-btn{background:#087c63}}
      @media print{.report-actions{display:none!important}}
      #attendance-report{background:#fff;padding:10px} .report-actions button:disabled{opacity:.55;cursor:wait}
      </style></head><body><div class="report-actions"><button class="print-btn" onclick="window.print()">🖨 طباعة</button><button class="save-btn" onclick="saveAsPdf()">↓ حفظ PDF</button></div><main id="attendance-report"><header><h1>${title}</h1><div>تاريخ إعداد التقرير: ${esc(this.todayKey)} | ${esc(this.rangeLabel())}</div></header>${sections}${excuseTable}<footer>البيانات من سجلات حضور المدربين المحملة في النظام. روابط الإثبات تتطلب صلاحية الوصول للملفات.</footer></main><script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script><script>
      async function saveAsPdf(){
        const button=document.querySelector(".save-btn");
        if(!window.html2pdf){alert("تعذر تحميل أداة حفظ PDF. تأكدي من الاتصال بالإنترنت ثم أعيدي فتح التقرير.");return;}
        button.disabled=true;button.textContent="جاري تجهيز PDF...";
        try{
          await window.html2pdf().set({
            margin:8, filename:"TrainerAttendance_${mode}_${this.todayKey}.pdf",
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

  /** Company attendance rate for recorded entries in the current month. */
  monthlyAttendanceRate = computed<number | null>(() => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-`;
    const trainerIds = new Set(this.trainers().map(t => t.trainerId));
    const monthRecords = this.records().filter(record => {
      const date = this.dateOf(record.date);
      return date.startsWith(monthPrefix) && date <= this.todayKey && trainerIds.has(record.trainerId);
    });
    if (!monthRecords.length) return null;
    return Math.round(monthRecords.reduce((sum, record) => sum + this.commitmentPoints(record.status), 0) / monthRecords.length);
  });




  savingIds = signal<number[]>([]);

  confirming = signal(false);



  noteEditingId = signal<number | null>(null);

  noteDraft = '';

  weeklyExcuse = signal<TrainerAttendanceDto | null>(null);
  weeklyReason = '';
  weeklyExcuseSaving = signal(false);
  weeklyExcuseEditing = signal(false);

  /** Attendance contribution per recorded day. */
  private commitmentPoints(status: TrainerAttendanceStatus): number {
    return status === 'Present' ? 100 : status === 'Absent' ? 0 : 75;
  }

  /** Deadline: Friday 00:00, Asia/Muscat, for the Sunday–Thursday workweek. */
  canEditWeeklyExcuse(record: TrainerAttendanceDto | null): boolean {
    if (!record || !this.canManageAttendance()) return false;
    if (!['Late', 'Absent', 'EarlyLeave'].includes(record.status)) return false;
    const key = this.dateOf(record.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
    const [year, month, day] = key.split('-').map(Number);
    const recordDate = new Date(Date.UTC(year, month - 1, day));
    if (recordDate.getUTCFullYear() !== year || recordDate.getUTCMonth() !== month - 1 || recordDate.getUTCDate() !== day) return false;
    const weekday = recordDate.getUTCDay();
    if (weekday === 5 || weekday === 6) return false;
    const thursday = new Date(recordDate);
    thursday.setUTCDate(thursday.getUTCDate() + (4 - weekday));
    const endKey = thursday.toISOString().slice(0, 10);
    const omanToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Muscat', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    return key <= omanToday && omanToday <= endKey;
  }

  weeklyStatusLabel(status: TrainerAttendanceStatus): string {
    return this.statusText(status);
  }

  hasExcuse(record: TrainerAttendanceDto | null): boolean {
    return !!(record?.reason?.trim() || record?.excuseProofUrl);
  }

  openWeeklyExcuse(record: TrainerAttendanceDto): void {
    if (!['week', 'month'].includes(this.view()) || !['Absent', 'Late', 'EarlyLeave'].includes(record.status)) return;
    if (this.view() === 'month' && !this.hasExcuse(record)) return;
    this.weeklyExcuse.set(record);
    this.weeklyReason = record.reason ?? '';
    this.weeklyExcuseEditing.set(this.view() === 'week' && !this.hasExcuse(record) && this.canEditWeeklyExcuse(record));
  }

  closeWeeklyExcuse(): void {
    if (!this.weeklyExcuseSaving()) {
      this.weeklyExcuse.set(null);
      this.weeklyExcuseEditing.set(false);
    }
  }

  startWeeklyExcuseEdit(): void {
    const record = this.weeklyExcuse();
    if (this.view() === 'week' && record && this.canEditWeeklyExcuse(record) && !this.weeklyExcuseSaving()) {
      this.weeklyReason = record.reason ?? '';
      this.weeklyExcuseEditing.set(true);
    }
  }

  cancelWeeklyExcuseEdit(): void {
    this.weeklyReason = this.weeklyExcuse()?.reason ?? '';
    this.weeklyExcuseEditing.set(false);
  }

  saveWeeklyReason(): void {
    if (!this.canManageAttendance()) return;
    const record = this.weeklyExcuse();
    if (this.view() !== 'week' || !record || !this.canEditWeeklyExcuse(record) || !this.weeklyExcuseEditing() || this.weeklyExcuseSaving()) return;
    this.weeklyExcuseSaving.set(true);
    this.api.saveTrainerAttendance({
      companyId: this.companyId,
      trainerId: record.trainerId,
      date: this.dateOf(record.date),
      status: record.status,
      reason: this.weeklyReason.trim() || null,
      checkInTime: record.checkInTime ?? null,
      checkOutTime: record.checkOutTime ?? null,
    }).subscribe({
      next: saved => {
        this.upsertRecord(saved);
        this.weeklyExcuse.set(saved);
        this.weeklyReason = saved.reason ?? '';
        this.weeklyExcuseEditing.set(false);
        this.weeklyExcuseSaving.set(false);
      },
      error: err => {
        this.showError(err, 'تعذر حفظ السبب أو الملاحظة.');
        this.weeklyExcuseSaving.set(false);
      }
    });
  }

  uploadWeeklyProof(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const record = this.weeklyExcuse();
    if (!file || !record || this.view() !== 'week' || !this.canEditWeeklyExcuse(record) || !this.weeklyExcuseEditing() || this.weeklyExcuseSaving()) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const extensionAllowed = /\.(jpe?g|png|webp|pdf)$/i.test(file.name);
    if (!allowedTypes.includes(file.type) && !extensionAllowed) {
      this.errorMessage.set('نوع الملف غير مدعوم. اختاري JPG أو PNG أو WEBP أو PDF.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage.set('حجم الإثبات كبير جدًا. الحد الأقصى المسموح 5 ميجابايت.');
      return;
    }

    this.weeklyExcuseSaving.set(true);
    this.errorMessage.set(null);
    this.api.uploadTrainerAttendanceProof(record.trainerAttendanceId, file).subscribe({
      next: response => {
        // Some API versions return the proof path only when the attendance list is fetched again.
        const returnedPath = response?.excuseProofUrl;
        if (returnedPath) {
          this.patchRecord(record.trainerAttendanceId, { excuseProofUrl: returnedPath });
          this.weeklyExcuse.set({ ...record, excuseProofUrl: returnedPath });
        }
        this.api.getTrainerAttendance(this.companyId, this.loadFromKey(), this.todayKey).subscribe({
          next: records => {
            const fresh = (records ?? []).find(item => item.trainerAttendanceId === record.trainerAttendanceId);
            if (fresh?.excuseProofUrl) {
              this.records.set(records ?? []);
              this.weeklyExcuse.set(fresh);
            } else if (!returnedPath) {
              this.errorMessage.set('تم إرسال الملف، لكن الخادم لم يرجع رابط الإثبات. تحققي من حفظه في الـ Backend.');
            }
            this.weeklyExcuseSaving.set(false);
          },
          error: () => {
            if (!returnedPath) this.errorMessage.set('تم إرسال الملف لكن تعذر تحديث رابط الإثبات من الخادم.');
            this.weeklyExcuseSaving.set(false);
          }
        });
      },
      error: err => {
        this.showError(err, 'تعذر رفع الإثبات. حاولي مرة أخرى.');
        this.weeklyExcuseSaving.set(false);
      }
    });
  }

  removeWeeklyProof(): void {
    if (!this.canManageAttendance()) return;
    const record = this.weeklyExcuse();
    if (this.view() !== 'week' || !record || !this.canEditWeeklyExcuse(record) || !this.weeklyExcuseEditing() || this.weeklyExcuseSaving()) return;
    this.weeklyExcuseSaving.set(true);
    this.api.removeTrainerAttendanceProof(record.trainerAttendanceId).subscribe({
      next: () => {
        this.patchRecord(record.trainerAttendanceId, { excuseProofUrl: null });
        this.weeklyExcuse.set({ ...record, excuseProofUrl: null });
        this.weeklyExcuseSaving.set(false);
      },
      error: err => {
        this.showError(err, 'تعذر حذف الإثبات.');
        this.weeklyExcuseSaving.set(false);
      }
    });
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
    this.selectedDayTrainerId() === null || row.trainer.trainerId === this.selectedDayTrainerId()
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

    const now = new Date();

    const first = new Date(now.getFullYear(), now.getMonth(), 1);

    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);

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

        date.setDate(date.getDate() + offset);

        return { key: this.dayKey(date), label };

      }).filter(day => day.key >= this.dayKey(first) && day.key <= this.dayKey(last));

      if (days.length) {

        const format = (d: Date) => d.toLocaleDateString('ar-OM', { day: 'numeric', month: 'long' });

        weeks.push({ index: weeks.length, start, end, days,

          label: `${format(start < first ? first : start)} – ${format(end > last ? last : end)}` });

      }

      cursor.setDate(cursor.getDate() + 7);

    }

    return weeks;

  });



  currentWeek = computed(() => {

    const now = new Date();

    const start = new Date(now);

    start.setDate(now.getDate() - now.getDay());

    const end = new Date(start);

    end.setDate(start.getDate() + 6);

    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'].map((label, i) => {

      const date = new Date(start);

      date.setDate(start.getDate() + i);

      return { key: this.dayKey(date), label };

    });

    const format = (d: Date) => d.toLocaleDateString('ar-OM', { day: 'numeric', month: 'long' });

    return { index: 0, start, end, days, label: `${format(start)} – ${format(end)}` };

  });



  rangeLabel = computed(() => this.view() === 'week'

    ? this.currentWeek().label

    : new Date().toLocaleDateString('ar-OM', { month: 'long', year: 'numeric' }));



  /** Returns a status grid for a given week, based only on recorded attendance. */

  weekRows(week: { days: { key: string; label: string }[] }, applyTrainerFilter = false) {

    const map = this.recordMap();

    return this.trainers().filter(trainer =>
      !applyTrainerFilter || this.selectedTrainerId() === null || trainer.trainerId === this.selectedTrainerId()
    ).map((trainer, index) => {

      const days = week.days.map(day => ({

        ...day, record: map.get(this.recordKey(trainer.trainerId, day.key)) ?? null,

      }));

      const recorded = days.filter(day => day.record);

      const rate = recorded.length ? Math.round(recorded.reduce((sum, day) => sum + this.commitmentPoints(day.record!.status), 0) / recorded.length) : null;

      return { trainer, days, rate, color: AVATAR_COLORS[index % AVATAR_COLORS.length] };

    });

  }



  statusSymbol(status?: TrainerAttendanceStatus): string {

    return ({ Present: 'ح', Late: 'ت', Absent: 'غ', EarlyLeave: 'م' } as Record<TrainerAttendanceStatus, string>)[status!] ?? '—';

  }



  statusClass(status?: TrainerAttendanceStatus): string {

    return status ? `badge-${status}` : 'badge-empty';

  }



  weekStats(week: { days: { key: string; label: string }[] }) {

    const keys = new Set(week.days.map(d => d.key));

    const trainerIds = new Set(this.trainers().map(t => t.trainerId));

    const counts = { Present: 0, Late: 0, Absent: 0, EarlyLeave: 0 };

    for (const record of this.records()) {

      if (keys.has(this.dateOf(record.date)) && trainerIds.has(record.trainerId)) counts[record.status]++;

    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return { ...counts, rate: total ? Math.round((counts.Present * 100 + (counts.Late + counts.EarlyLeave) * 75) / total) : null };

  }



ngOnInit(): void {

  this.companyId = this.auth.companyId ?? 0;



  console.log('Company ID:', this.companyId);



  this.load();

}



  load(): void {

    this.loading.set(true);

    this.loadError.set(false);



    forkJoin({

      trainers: this.api.getCompanyTrainers(this.companyId),

      records: this.api.getTrainerAttendance(this.companyId, this.loadFromKey(), this.todayKey),

    }).subscribe({

      next: ({ trainers, records }) => {

        this.failedTrainerImages.set([]);
        this.trainers.set((trainers ?? []).map(trainer => ({
          ...trainer,
          profileImageUrl: trainer.profileImageUrl ??
            (trainer as CompanyTrainerDto & { ProfileImageUrl?: string | null }).ProfileImageUrl ?? null,
        })));

        this.records.set(records ?? []);

        this.loading.set(false);

      },

      error: (err) => {

        console.error('Failed to load trainer attendance.', err);

        this.loadError.set(true);

        this.loading.set(false);

      },

    });

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



  // ----------------------------------------------------------------- notes



  startNote(row: AttendanceRow): void {
    if (!this.canManageAttendance()) return;

    if (!row.record || row.record.status === 'Present' || this.isConfirmed()) return;

    this.noteEditingId.set(row.trainer.trainerId);

    this.noteDraft = row.record.reason ?? '';

  }



  saveNote(row: AttendanceRow): void {
    if (!this.canManageAttendance()) return;

    if (!row.record || row.record.status === 'Present' || this.isConfirmed()) return;



    this.save(row.trainer.trainerId, {

      status: row.record.status,

      reason: this.noteDraft.trim() || null,

      checkInTime: row.record.checkInTime ?? null,

      checkOutTime: row.record.checkOutTime ?? null,

    });

    this.noteEditingId.set(null);

  }



  cancelNote(): void {

    this.noteEditingId.set(null);

  }



  // ----------------------------------------------------------------- proof



  onProofSelected(row: AttendanceRow, event: Event): void {
    if (!this.canManageAttendance()) return;

    const input = event.target as HTMLInputElement;

    const file = input.files?.[0];

    input.value = '';

    if (!file || !row.record || row.record.status === 'Present' || this.isConfirmed()) return;



    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type) && !/\.(jpe?g|png|webp|pdf)$/i.test(file.name)) {
      this.errorMessage.set('نوع الملف غير مدعوم. اختاري صورة JPG أو PNG أو WEBP أو ملف PDF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage.set('حجم الإثبات كبير جدًا. الحد الأقصى المسموح 5 ميجابايت.');
      return;
    }

    const attendanceId = row.record.trainerAttendanceId;

    this.setSaving(row.trainer.trainerId, true);



    this.api.uploadTrainerAttendanceProof(attendanceId, file).subscribe({

      next: (response) => {

        this.patchRecord(attendanceId, { excuseProofUrl: response.excuseProofUrl });

        this.errorMessage.set(null);

        this.setSaving(row.trainer.trainerId, false);

      },

      error: (err) => {

        this.showError(err, 'تعذر رفع إثبات العذر.');

        this.setSaving(row.trainer.trainerId, false);

      },

    });

  }



  removeProof(row: AttendanceRow): void {
    if (!this.canManageAttendance()) return;

    if (!row.record || row.record.status === 'Present' || this.isConfirmed()) return;



    const attendanceId = row.record.trainerAttendanceId;

    this.setSaving(row.trainer.trainerId, true);



    this.api.removeTrainerAttendanceProof(attendanceId).subscribe({

      next: () => {

        this.patchRecord(attendanceId, { excuseProofUrl: null });

        this.setSaving(row.trainer.trainerId, false);

      },

      error: (err) => {

        this.showError(err, 'تعذر حذف إثبات العذر.');

        this.setSaving(row.trainer.trainerId, false);

      },

    });

  }



  // --------------------------------------------------------------- confirm



  showConfirmPopover = signal(false);

  confirmDay(): void {
    if (!this.canManageAttendance()) return;
    if (!this.canConfirm()) return;
    if (!this.showConfirmPopover()) return;
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

        this.api.getTrainerAttendance(this.companyId, this.loadFromKey(), this.todayKey).subscribe({

          next: (records) => {

            this.records.set(records ?? []);

            this.errorMessage.set(null);

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

    this.errorMessage.set(null);

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

          this.errorMessage.set(null);

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
    } else if (raw.includes('5 mb') || raw.includes('5mb') || raw.includes('exceed') || error?.status === 413) {
      message = 'حجم الإثبات كبير جدًا. الحد الأقصى المسموح 5 ميجابايت.';
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
    this.errorMessage.set(message);
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



  /** Earliest day needed by any view: the first of the month or 6 days ago, whichever is earlier. */

  private loadFromKey(): string {

    const monthStart = new Date();

    monthStart.setDate(1);

    const weekStart = new Date();

    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    return this.dayKey(monthStart < weekStart ? monthStart : weekStart);

  }

}