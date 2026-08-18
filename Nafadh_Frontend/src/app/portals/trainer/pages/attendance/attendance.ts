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
  rows = signal<DailyAttendanceDto[]>([]);
  excuses = signal<ExcuseDto[]>([]);
  pickable = ATTENDANCE_PICKABLE_STATUSES;
  labels = ATTENDANCE_STATUS_LABELS;

  constructor(private api: TrainerApi) {}
  ngOnInit() {
    this.api.getTodayAttendanceForCompany(this.companyId).subscribe({ next: (d) => this.rows.set(d ?? []), error: () => this.rows.set([]) });
    this.api.getPendingExcuses().subscribe((d) => this.excuses.set(d ?? []));
  }

  // دالة لتغيير التبويب وجلب البيانات المناسبة
  switchTab(tab: 'daily' | 'weekly' | 'monthly') {
    this.activeTab.set(tab);
    this.loadAttendanceData(tab);
  }

  loadAttendanceData(tab: 'daily' | 'weekly' | 'monthly') {
    if (tab === 'daily') {
      this.api.getTodayAttendanceForCompany(this.companyId).subscribe({
        next: (d) => this.rows.set(d ?? []),
        error: () => this.rows.set([])
      });
    } else {
      // يمكنك هنا لاحقاً ربط دوال الأسبوعي أو الشهري الخاصة بالـ API عند توفرها
      this.rows.set([]); 
    }
  }

  setStatus(row: DailyAttendanceDto, status: string) {
    this.api.updateAttendance(row.dailyAttendanceId, { ...row, status }).subscribe(() => {
      this.rows.update((list) => list.map((r) => (r.dailyAttendanceId === row.dailyAttendanceId ? { ...r, status: status as any } : r)));
    });
  }

  reviewExcuse(ex: ExcuseDto, approve: boolean) {
    this.api.reviewExcuse(ex.excuseId, { status: approve ? 'Approved' : 'Rejected' }).subscribe(() => {
      this.excuses.update((list) => list.filter((e) => e.excuseId !== ex.excuseId));
    });
  }

  reportAbsence(row: DailyAttendanceDto) {
    this.api.reportRepeatedAbsence({ scope: 'Trainee', enrollmentId: row.enrollmentId, type: 'Attendance', level: 'Medium', evidence: 'غياب متكرر بدون عذر', raisedByUserId: 3 }).subscribe();
  }
}
