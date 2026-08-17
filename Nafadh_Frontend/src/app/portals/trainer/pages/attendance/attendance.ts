import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrainerApi } from '../../services/trainer-api';
import { DailyAttendanceDto, ExcuseDto } from '../../../../core/models/dtos';

/* ══════════════════════════════════════════════════════════════
   ترميز الحالات كما هو مخزَّن فعلياً في NFD_DailyAttendances.Status
   (عمود int وليس نصاً — مستخرج من ملف السيد):
     0 حاضر  → CheckInTime موجود، IsLate = 0           (10009 صف)
     1 غائب  → لا وقت دخول، Note = 'بانتظار المراجعة'  (1039 صف)
     2 متأخر → CheckInTime موجود، IsLate = 1            (1150 صف)
     3 بعذر  → لا وقت دخول، بلا ملاحظة                  (612 صف)
   ══════════════════════════════════════════════════════════════ */
export const ATTENDANCE_STATUSES = [
  { code: 0, name: 'Present', key: 'present', label: 'حاضر' },
  { code: 1, name: 'Absent',  key: 'absent',  label: 'غائب' },
  { code: 2, name: 'Late',    key: 'late',    label: 'متأخر' },
  { code: 3, name: 'Excused', key: 'excused', label: 'بعذر' },
] as const;
export type StatusDef = (typeof ATTENDANCE_STATUSES)[number];

/** NFD_Excuses.Status — 0 معلّق (ReviewedByUserId = NULL)، 1 مقبول، 2 مرفوض */
const EXCUSE_STATUS = { pending: 0, approved: 1, rejected: 2 };

/** NFD_Warnings — Scope = 1 يعني متدرب (EnrollmentId يُملأ و CompanyId فارغ).
 *  ⚠ راجعي enum الـ backend لتأكيد ترميز Type و Level قبل الاعتماد عليهما. */
const WARNING = { scopeTrainee: 1, typeAttendance: 0, levelMedium: 1 };

type Row = DailyAttendanceDto & {
  batchName?: string; traineeCode?: string;
  isLate?: boolean; checkInTime?: string | null; checkOutTime?: string | null;
};
type Excuse = ExcuseDto & { traineeName?: string; proofUrl?: string; dailyAttendanceId?: number };

type FilterKey = 'all' | 'unmarked' | 'absent';
type Toast = { text: string; kind: 'ok' | 'err' };
type Pending = { title: string; text: string; confirmLabel: string; tone: 'primary' | 'danger'; run: () => void };
type Shape = 'number' | 'numeric-text' | 'name';

@Component({
  selector: 'app-trainer-attendance',
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.html',
  styleUrl: './attendance.scss',
})
export class TrainerAttendance implements OnInit {
  companyId = 1;

  // ── الحالة ──────────────────────────────────────────────
  rows = signal<Row[]>([]);
  excuses = signal<Excuse[]>([]);
  loading = signal(true);
  loadError = signal<string | null>(null);
  savingId = signal<number | null>(null);
  reviewingId = signal<number | null>(null);
  reportedIds = signal<Set<number>>(new Set<number>());
  query = signal('');
  filter = signal<FilterKey>('all');
  excuseLimit = signal(8);
  toast = signal<Toast | null>(null);
  pending = signal<Pending | null>(null);

  statuses = ATTENDANCE_STATUSES;
  filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'unmarked', label: 'لم يُسجَّل' },
    { key: 'absent', label: 'الغائبون' },
  ];
  skeleton = [1, 2, 3, 4];

  todayLabel = new Intl.DateTimeFormat('ar', {
    calendar: 'gregory', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  } as Intl.DateTimeFormatOptions).format(new Date());

  /** الشكل الذي يعيده الـ API للحالة، حتى نُعيده بنفس الشكل عند الحفظ */
  private attShape: Shape = 'number';
  private excuseShape: Shape = 'number';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private api: TrainerApi) {}

  ngOnInit() { this.reload(); }

  // ── التحميل ─────────────────────────────────────────────
  reload() {
    this.loading.set(true);
    this.loadError.set(null);

    this.api.getTodayAttendanceForCompany(this.companyId).subscribe({
      next: (d) => {
        const list = (d ?? []) as Row[];
        this.attShape = this.detectShape(list.map((r) => r.status));
        this.rows.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.loading.set(false);
        this.loadError.set('تعذّر الوصول إلى الخادم. تحقق من الاتصال ثم أعد المحاولة.');
      },
    });

    this.api.getPendingExcuses().subscribe({
      next: (d) => {
        const list = (d ?? []) as Excuse[];
        this.excuseShape = this.detectShape(list.map((e) => (e as any).status));
        this.excuses.set(list);
      },
      error: () => this.excuses.set([]),
    });
  }

  private detectShape(values: unknown[]): Shape {
    const v = values.find((x) => x !== null && x !== undefined && x !== '');
    if (typeof v === 'number') return 'number';
    if (typeof v === 'string') return Number.isNaN(Number(v)) ? 'name' : 'numeric-text';
    return 'number';
  }

  // ── ترجمة الحالة ────────────────────────────────────────
  /** يقبل 0 أو '0' أو 'Present' أو 'حاضر' ويعيد التعريف الموحّد */
  statusOf(v: unknown): StatusDef | undefined {
    if (v === null || v === undefined || v === '') return undefined;
    if (typeof v === 'number') return this.statuses.find((s) => s.code === v);
    const raw = String(v).trim();
    const n = Number(raw);
    if (!Number.isNaN(n)) return this.statuses.find((s) => s.code === n);
    const lower = raw.toLowerCase();
    return this.statuses.find((s) => s.name.toLowerCase() === lower || s.label === raw);
  }

  statusKey(v: unknown): string { return this.statusOf(v)?.key ?? 'unmarked'; }
  isActive(row: Row, def: StatusDef): boolean { return this.statusOf(row.status)?.code === def.code; }

  private toApi(def: StatusDef, shape: Shape): number | string {
    if (shape === 'name') return def.name;
    if (shape === 'numeric-text') return String(def.code);
    return def.code;
  }

  // ── الإحصاءات وشريط النداء ──────────────────────────────
  total = computed(() => this.rows().length);
  marked = computed(() => this.rows().filter((r) => !!this.statusOf(r.status)).length);
  unmarked = computed(() => this.total() - this.marked());

  segments = computed(() => {
    const total = this.total() || 1;
    const segs = this.statuses.map((s) => {
      const count = this.rows().filter((r) => this.statusOf(r.status)?.code === s.code).length;
      return { key: s.key as string, label: s.label as string, count, pct: (count / total) * 100 };
    });
    segs.push({ key: 'unmarked', label: 'لم يُسجَّل', count: this.unmarked(), pct: (this.unmarked() / total) * 100 });
    return segs;
  });

  railAria = computed(() =>
    this.segments().filter((s) => s.count > 0).map((s) => `${s.label}: ${s.count}`).join('، ') || 'لا توجد بيانات'
  );

  // ── التصفية والبحث ──────────────────────────────────────
  visibleRows = computed(() => {
    const q = this.normalize(this.query());
    const f = this.filter();
    return this.rows().filter((r) => {
      const key = this.statusKey(r.status);
      if (f === 'unmarked' && key !== 'unmarked') return false;
      if (f === 'absent' && key !== 'absent') return false;
      if (q && !this.normalize(String(r.traineeName ?? '')).includes(q)) return false;
      return true;
    });
  });

  filterCount(key: FilterKey): number {
    if (key === 'unmarked') return this.unmarked();
    if (key === 'absent') return this.rows().filter((r) => this.statusKey(r.status) === 'absent').length;
    return this.total();
  }

  onSearch(e: Event) { this.query.set((e.target as HTMLInputElement).value ?? ''); }
  clearFilters() { this.query.set(''); this.filter.set('all'); }

  /** يوحّد الهمزات والتاء المربوطة والتشكيل حتى يعمل البحث العربي كما يتوقعه المستخدم */
  private normalize(v: string): string {
    return (v ?? '')
      .replace(/[\u064B-\u0652\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
      .trim().toLowerCase();
  }

  // ── تسجيل الحالة ────────────────────────────────────────
  setStatus(row: Row, def: StatusDef) {
    if (this.isActive(row, def) || this.savingId() !== null) return;

    const before = row;
    const after = this.withDerivedFields(row, def);
    this.replaceRow(after);
    this.savingId.set(row.dailyAttendanceId);

    this.api.updateAttendance(row.dailyAttendanceId, after as any).subscribe({
      next: () => this.savingId.set(null),
      error: () => {
        this.replaceRow(before);
        this.savingId.set(null);
        this.notify('لم تُحفظ الحالة. أُعيدت كما كانت — حاول مرة أخرى.', 'err');
      },
    });
  }

  /** يحافظ على ثوابت الجدول: حاضر/متأخر لهما وقت دخول، وغائب/بعذر بلا وقت، و IsLate مرتبط بالتأخر */
  private withDerivedFields(row: Row, def: StatusDef): Row {
    const next: any = { ...row, status: this.toApi(def, this.attShape) };
    const away = def.code === 1 || def.code === 3;

    if ('isLate' in row) next.isLate = def.code === 2;
    if ('checkInTime' in row) next.checkInTime = away ? null : (row.checkInTime || this.nowHHmm());
    if ('checkOutTime' in row && away) next.checkOutTime = null;

    return next as Row;
  }

  private nowHHmm(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  private replaceRow(row: Row) {
    this.rows.update((list) => list.map((r) => (r.dailyAttendanceId === row.dailyAttendanceId ? row : r)));
  }

  presentStatus(): StatusDef { return this.statuses[0]; }

  askMarkAllPresent() {
    const target = this.rows().filter((r) => !this.statusOf(r.status));
    if (!target.length) return;
    this.pending.set({
      title: 'تعيين الباقين حاضرين',
      text: `سيُسجَّل ${target.length} متدرباً لم تُحدَّد حالتهم كحاضرين. يمكنك تعديل أي حالة بعدها.`,
      confirmLabel: 'تعيينهم حاضرين',
      tone: 'primary',
      run: () => this.markAllPresent(target),
    });
  }

  private markAllPresent(target: Row[]) {
    const def = this.presentStatus();
    let done = 0, failed = 0;
    const finish = () => {
      if (done + failed < target.length) return;
      if (failed) this.notify(`تعذّر حفظ ${failed} من ${target.length}. أعد المحاولة لمن بقي.`, 'err');
      else this.notify(`سُجِّل ${done} متدرباً كحاضرين.`, 'ok');
    };

    for (const row of target) {
      const after = this.withDerivedFields(row, def);
      this.replaceRow(after);
      this.api.updateAttendance(row.dailyAttendanceId, after as any).subscribe({
        next: () => { done++; finish(); },
        error: () => { failed++; this.replaceRow(row); finish(); },
      });
    }
  }

  // ── الأعذار ─────────────────────────────────────────────
  /** العذر المرتبط بصف الحضور — الربط عبر NFD_Excuses.DailyAttendanceId */
  excuseFor(row: Row): Excuse | undefined {
    return this.excuses().find((e) => e.dailyAttendanceId === row.dailyAttendanceId);
  }

  /** أعذار لا تخص كشف اليوم (أيام سابقة) — تبقى في القسم السفلي */
  otherExcuses = computed(() => {
    const todayIds = new Set(this.rows().map((r) => r.dailyAttendanceId));
    return this.excuses().filter((e) => !todayIds.has(e.dailyAttendanceId as number));
  });

  visibleExcuses = computed(() => this.otherExcuses().slice(0, this.excuseLimit()));
  hiddenExcuses = computed(() => Math.max(0, this.otherExcuses().length - this.excuseLimit()));
  showAllExcuses() { this.excuseLimit.set(this.otherExcuses().length); }

  reviewExcuse(ex: Excuse, approve: boolean) {
    if (this.reviewingId() !== null) return;
    this.reviewingId.set(ex.excuseId);
    const snapshot = this.excuses();

    const code = approve ? EXCUSE_STATUS.approved : EXCUSE_STATUS.rejected;
    const value = this.excuseShape === 'name' ? (approve ? 'Approved' : 'Rejected')
                : this.excuseShape === 'numeric-text' ? String(code) : code;

    this.api.reviewExcuse(ex.excuseId, { status: value } as any).subscribe({
      next: () => {
        this.excuses.update((list) => list.filter((e) => e.excuseId !== ex.excuseId));
        this.reviewingId.set(null);
        this.notify(approve ? 'قُبل العذر.' : 'رُفض العذر.', 'ok');
      },
      error: () => {
        this.excuses.set(snapshot);
        this.reviewingId.set(null);
        this.notify('لم تُسجَّل المراجعة. حاول مرة أخرى.', 'err');
      },
    });
  }

  // ── الإبلاغ عن الغياب ───────────────────────────────────
  askReportAbsence(row: Row) {
    this.pending.set({
      title: 'إبلاغ الهيئة بغياب متكرر',
      text: `سيُرفع إنذار عن ${row.traineeName || 'المتدرب'} بسبب غياب متكرر بدون عذر. لا يمكن التراجع عنه من هنا.`,
      confirmLabel: 'رفع الإنذار',
      tone: 'danger',
      run: () => this.reportAbsence(row),
    });
  }

  private reportAbsence(row: Row) {
    this.api.reportRepeatedAbsence({
      scope: WARNING.scopeTrainee,
      enrollmentId: row.enrollmentId,
      companyId: null,
      type: WARNING.typeAttendance,
      level: WARNING.levelMedium,
      evidence: 'غياب متكرر دون عذر رسمي.',
      raisedByUserId: 3,
    } as any).subscribe({
      next: () => {
        this.reportedIds.update((set) => new Set(set).add(row.dailyAttendanceId));
        this.notify('رُفع الإنذار إلى الهيئة.', 'ok');
      },
      error: () => this.notify('لم يُرفع الإنذار. حاول مرة أخرى.', 'err'),
    });
  }

  // ── التأكيد والتنبيهات ──────────────────────────────────
  runPending() { const p = this.pending(); this.pending.set(null); p?.run(); }

  private notify(text: string, kind: 'ok' | 'err') {
    this.toast.set({ text, kind });
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
  }

  // ── أدوات العرض ─────────────────────────────────────────
  initials(name?: string | null): string {
    const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '؟';
    return (parts[0][0] + (parts[1]?.[0] ?? '')).trim();
  }

  rowMeta(r: Row): string {
    const parts: string[] = [];
    if (r.batchName) parts.push(r.batchName);
    if (r.traineeCode) parts.push(r.traineeCode);
    else if (r.enrollmentId != null) parts.push(`رقم التسجيل ${r.enrollmentId}`);
    if (r.checkInTime) parts.push(`دخول ${r.checkInTime}`);
    return parts.join(' · ');
  }
}