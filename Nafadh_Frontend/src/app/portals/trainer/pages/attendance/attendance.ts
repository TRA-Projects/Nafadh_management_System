import { Component, OnInit, computed, signal } from '@angular/core';
// v9 SYNCED: contains excuseTypeFilter, rowExcuseType, setRowExcuseType.
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrainerApi } from '../../services/trainer-api';
import { DailyAttendanceDto, EnrollmentDto, ExcuseDto } from '../../../../core/models/dtos';

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

type Row = {
  dailyAttendanceId: number | null;
  enrollmentId: number;
  traineeName?: string;
  batchName?: string;
  traineeCode?: string;
  date?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  status?: unknown;
  isLate: boolean;
  note?: string | null;
};
type Excuse = ExcuseDto & { traineeName?: string; proofUrl?: string; dailyAttendanceId?: number };

type FilterKey = 'all' | 'unmarked' | 'absent';
type RegisterView = 'today' | 'weekly' | 'monthly';
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
  excuseTypeFilter = signal('all');
  private selectedRowExcuseTypes = signal<Record<number, string>>({});
  toast = signal<Toast | null>(null);
  pending = signal<Pending | null>(null);
  registerView = signal<RegisterView>('today');

  statuses = ATTENDANCE_STATUSES;
  filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'unmarked', label: 'غير محفوظ' },
    { key: 'absent', label: 'الغائبون' },
  ];
  skeleton = [1, 2, 3, 4];
  readonly excuseTypes = [
    'عذر طبي',
    'موعد / مراجعة مستشفى',
    'ظرف عائلي طارئ',
    'وفاة قريب',
    'مهمة رسمية',
    'تعطل المواصلات',
    'أخرى',
  ];

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

    // مهم: API حضور اليوم يرجع فقط من لديهم سجل حضور موجود بالفعل.
    // لذلك نبدأ من Enrollment لعرض جميع المتدربين، ثم ندمج سجل اليوم إن وُجد.
    forkJoin({
      enrollments: this.api.getEnrollments(this.companyId),
      attendance: this.api.getTodayAttendanceForCompany(this.companyId),
    }).subscribe({
      next: ({ enrollments, attendance }) => {
        const attendanceList = (attendance ?? []) as DailyAttendanceDto[];
        this.attShape = this.detectShape(attendanceList.map((r) => r.status));

        const byEnrollment = new Map<number, DailyAttendanceDto>(
          attendanceList.map((a) => [a.enrollmentId, a])
        );

        const merged: Row[] = (enrollments ?? []).map((e: EnrollmentDto) => {
          const a = byEnrollment.get(e.enrollmentId);
          return {
            dailyAttendanceId: a?.dailyAttendanceId ?? null,
            enrollmentId: e.enrollmentId,
            traineeName: e.traineeName || a?.traineeName || `متدرب #${e.traineeId}`,
            batchName: e.batchName || '—',
            date: a?.date,
            checkInTime: a?.checkInTime ?? null,
            checkOutTime: a?.checkOutTime ?? null,
            // افتراض الواجهة: كل متدرب حاضر ما لم يغيّره المدرب إلى غائب/بعذر/متأخر.
            // لا ننشئ السجل في الباك هنا؛ يتم الحفظ عند تغيير الحالة أو عند تأكيد سجل اليوم.
            status: a ? a.status : this.toApi(this.presentStatus(), this.attShape),
            isLate: a?.isLate ?? false,
            note: a?.note ?? null,
          };
        });

        // احتياط: لا نفقد أي سجل حضور رجعه الخادم حتى لو لم يظهر في Enrollment.
        const enrollmentIds = new Set(merged.map((r) => r.enrollmentId));
        for (const a of attendanceList) {
          if (!enrollmentIds.has(a.enrollmentId)) {
            merged.push({
              dailyAttendanceId: a.dailyAttendanceId,
              enrollmentId: a.enrollmentId,
              traineeName: a.traineeName || `متدرب #${a.enrollmentId}`,
              batchName: '—',
              date: a.date,
              checkInTime: a.checkInTime ?? null,
              checkOutTime: a.checkOutTime ?? null,
              status: a.status,
              isLate: a.isLate,
              note: a.note ?? null,
            });
          }
        }

        this.rows.set(merged);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.loading.set(false);
        this.loadError.set('تعذّر تحميل تسجيلات المتدربين. تحقق من طلب Enrollment ثم أعد المحاولة.');
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
  // غير المحفوظين = من يظهرون حاضرين افتراضياً لكن لم يُنشأ لهم سجل في الباك بعد.
  unmarked = computed(() => this.rows().filter((r) => r.dailyAttendanceId == null).length);

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
      if (f === 'unmarked' && r.dailyAttendanceId != null) return false;
      if (f === 'absent' && key !== 'absent') return false;
      if (q && !this.normalize(String(r.traineeName ?? '')).includes(q)) return false;
      const excuseType = this.excuseTypeFilter();
      if (excuseType !== 'all' && this.rowExcuseType(r) !== excuseType) return false;
      return true;
    });
  });

  statusCount(key: string): number {
    return this.rows().filter((r) => this.statusKey(r.status) === key).length;
  }

  absentRows = computed(() => this.rows().filter((r) => this.statusKey(r.status) === 'absent'));

  commitmentRate = computed(() => {
    const total = this.total();
    if (!total) return 0;
    const committed = this.statusCount('present') + this.statusCount('late') + this.statusCount('excused');
    return Math.round((committed / total) * 100);
  });

  showRegister(view: RegisterView) {
    this.registerView.set(view);
    if (view !== 'today') {
      this.notify(view === 'weekly' ? 'تم اختيار السجل الأسبوعي.' : 'تم اختيار السجل الشهري.', 'ok');
    }
  }

  confirmToday() {
    const unsavedPresent = this.rows().filter(
      (r) => r.dailyAttendanceId == null && this.statusKey(r.status) === 'present'
    );

    if (unsavedPresent.length > 0) {
      this.pending.set({
        title: 'تأكيد سجل اليوم',
        text: `سيتم حفظ ${unsavedPresent.length} متدرباً كحاضرين. الحالات التي عدّلتها إلى غائب أو بعذر تم حفظها عند التعديل.`,
        confirmLabel: 'تأكيد وحفظ الحضور',
        tone: 'primary',
        run: () => this.markAllPresent(unsavedPresent),
      });
      return;
    }
    this.notify('تم تأكيد سجل اليوم بنجاح.', 'ok');
  }

  askReportAllRepeatedAbsence() {
    const absent = this.absentRows().filter((r) => r.dailyAttendanceId != null && !this.reportedIds().has(r.dailyAttendanceId));
    if (!absent.length) {
      this.notify('لا توجد حالات غياب جديدة لإرسالها.', 'ok');
      return;
    }
    this.pending.set({
      title: 'إرسال الغياب المتكرر للهيئة',
      text: `سيتم رفع إنذار للحالات الغائبة غير المبلّغ عنها وعددها ${absent.length}.`,
      confirmLabel: 'إرسال البلاغات',
      tone: 'danger',
      run: () => absent.forEach((row) => this.reportAbsence(row)),
    });
  }

  statusButtonClass(key: string): string { return `status-${key}`; }

  avatarClass(r: Row): string {
    const classes = ['av-blue', 'av-purple', 'av-sky', 'av-teal', 'av-slate', 'av-amber'];
    return classes[Math.abs(Number(r.dailyAttendanceId ?? r.enrollmentId ?? 0)) % classes.length];
  }

  traineeSubtitle(r: Row): string {
    if (r.traineeCode) return r.traineeCode;
    if (r.enrollmentId != null) return `رقم التسجيل ${r.enrollmentId}`;
    return 'متدرب';
  }

  filterCount(key: FilterKey): number {
    if (key === 'unmarked') return this.unmarked();
    if (key === 'absent') return this.rows().filter((r) => this.statusKey(r.status) === 'absent').length;
    return this.total();
  }

  onSearch(e: Event) { this.query.set((e.target as HTMLInputElement).value ?? ''); }
  clearFilters() { this.query.set(''); this.filter.set('all'); this.excuseTypeFilter.set('all'); }

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

    const before = { ...row };
    const after = this.withDerivedFields(row, def);
    this.replaceRow(after);
    this.savingId.set(row.enrollmentId);

    // لا يوجد DailyAttendance بعد: ننشئه لأول مرة باستخدام checkIn الموجود في TrainerApi.
    if (row.dailyAttendanceId == null) {
      const createDto = {
        enrollmentId: row.enrollmentId,
        date: new Date().toISOString(),
        checkInTime: after.checkInTime ?? null,
        checkOutTime: after.checkOutTime ?? null,
        status: after.status,
        isLate: after.isLate,
        note: after.note ?? null,
      };

      this.api.checkIn(createDto).subscribe({
        next: (created: any) => {
          const saved: Row = {
            ...after,
            ...created,
            dailyAttendanceId: created?.dailyAttendanceId ?? after.dailyAttendanceId,
            traineeName: after.traineeName,
            batchName: after.batchName,
          };
          this.replaceRow(saved);
          this.savingId.set(null);
          if (saved.dailyAttendanceId == null) this.reload();
        },
        error: () => {
          this.replaceRow(before);
          this.savingId.set(null);
          this.notify('لم يُنشأ سجل الحضور. أُعيدت الحالة كما كانت.', 'err');
        },
      });
      return;
    }

    const updateDto = {
      checkInTime: after.checkInTime ?? null,
      checkOutTime: after.checkOutTime ?? null,
      status: after.status,
      isLate: after.isLate,
      note: after.note ?? null,
    };

    this.api.updateAttendance(row.dailyAttendanceId, updateDto).subscribe({
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
    this.rows.update((list) => list.map((r) => (r.enrollmentId === row.enrollmentId ? row : r)));
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
      this.savingId.set(null);
      if (failed) this.notify(`تعذّر حفظ ${failed} من ${target.length}. أعد المحاولة لمن بقي.`, 'err');
      else this.notify(`سُجِّل ${done} متدرباً كحاضرين.`, 'ok');
      this.reload();
    };

    this.savingId.set(-1);
    for (const row of target) {
      const after = this.withDerivedFields(row, def);
      const ok = () => { done++; finish(); };
      const bad = () => { failed++; finish(); };

      if (row.dailyAttendanceId == null) {
        this.api.checkIn({
          enrollmentId: row.enrollmentId,
          date: new Date().toISOString(),
          checkInTime: after.checkInTime ?? this.nowHHmm(),
          checkOutTime: null,
          status: after.status,
          isLate: false,
          note: after.note ?? null,
        }).subscribe({ next: ok, error: bad });
      } else {
        this.api.updateAttendance(row.dailyAttendanceId, {
          checkInTime: after.checkInTime ?? this.nowHHmm(),
          checkOutTime: after.checkOutTime ?? null,
          status: after.status,
          isLate: false,
          note: after.note ?? null,
        }).subscribe({ next: ok, error: bad });
      }
    }
  }

  // نوع العذر المختار في واجهة الكشف فقط؛ لا نضيف أي حقل إلى DTO المشترك.
  rowExcuseType(row: Row): string {
    const selected = this.selectedRowExcuseTypes()[row.enrollmentId];
    if (selected) return selected;
    const reason = this.excuseFor(row)?.reason ?? '';
    return this.excuseTypes.includes(reason) ? reason : '';
  }

  setRowExcuseType(row: Row, value: string) {
    this.selectedRowExcuseTypes.update((current) => ({ ...current, [row.enrollmentId]: value }));
  }

  excuseReasonFor(row: Row): string {
    const ex = this.excuseFor(row);
    if (ex?.reason && !this.excuseTypes.includes(ex.reason)) return ex.reason;
    return row.note?.trim() || 'لا توجد ملاحظة إضافية';
  }

  isExcusePending(ex: Excuse): boolean {
    const v: any = (ex as any).status;
    if (typeof v === 'number') return v === EXCUSE_STATUS.pending;
    const raw = String(v ?? '').trim().toLowerCase();
    return raw === '0' || raw === 'pending' || raw === 'معلق' || raw === 'معلّق';
  }

  // ── الأعذار ─────────────────────────────────────────────
  /** العذر المرتبط بصف الحضور — الربط عبر NFD_Excuses.DailyAttendanceId */
  excuseFor(row: Row): Excuse | undefined {
    return this.excuses().find((e) => e.dailyAttendanceId === row.dailyAttendanceId);
  }

  /** أعذار لا تخص كشف اليوم (أيام سابقة) — تبقى في القسم السفلي */
  otherExcuses = computed(() => {
    const todayIds = new Set(this.rows().map((r) => r.dailyAttendanceId).filter((id): id is number => id != null));
    return this.excuses().filter((e) => !todayIds.has(e.dailyAttendanceId as number));
  });

  visibleExcuses = computed(() => {
    const selected = this.excuseTypeFilter();
    const list = selected === 'all'
      ? this.otherExcuses()
      : this.otherExcuses().filter((e) => e.reason === selected);
    return list.slice(0, this.excuseLimit());
  });
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
        const attendanceId = row.dailyAttendanceId;
        if (attendanceId !== null) {
          this.reportedIds.update((set) => {
            const next = new Set(set);
            next.add(attendanceId);
            return next;
          });
        }
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