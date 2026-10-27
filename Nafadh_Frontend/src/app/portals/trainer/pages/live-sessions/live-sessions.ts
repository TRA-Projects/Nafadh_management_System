
import {
  Component,
  computed,
  inject,
  OnInit,
  OnDestroy,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, switchMap, finalize } from 'rxjs';

import {
  TrainerApi,
  TrainerLiveSessionDto,
  TrainerLiveSessionFormDto,
  TrainerSessionAttendanceDto,
  TrainerAttendanceStatus
} from '../../services/trainer-api';

type SessionStatus =
  | 'Scheduled'
  | 'Completed'
  | 'Cancelled'
  | 'Postponed'
  | 'InProgress';

type SessionTab = 'upcoming' | 'ongoing' | 'past';

const STATUS = {
  Scheduled: 0,
  Completed: 1,
  Cancelled: 2,
  Postponed: 3,
  InProgress: 4
} as const;

interface LiveSession {
  id: number;
  batchId: number;
  title: string;
  description: string;
  startTime: string;
  durationMinutes: number;
  meetingUrl: string;
  status: SessionStatus;
  isLive: boolean;
}

@Component({
  selector: 'app-trainer-live-sessions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './live-sessions.html',
  styleUrl: './live-sessions.scss'
})
export class TrainerLiveSessions implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(TrainerApi);

  batchId = Number(
    this.route.snapshot.queryParamMap.get('batchId') ?? 0
  );

  sessions = signal<LiveSession[]>([]);
  // activeTab = signal<SessionTab>('upcoming');
  activeTab = signal<SessionTab>(
  this.route.snapshot.queryParamMap.get('tab') === 'ongoing'
    ? 'ongoing'
    : 'upcoming'
);
  searchTerm = signal('');
  showForm = signal(false);
  showCancelModal = signal(false);
  sessionToCancel = signal<LiveSession | null>(null);
  showAttendanceModal = signal(false);
  attendanceSession = signal<LiveSession | null>(null);
  attendanceRows = signal<TrainerSessionAttendanceDto[]>([]);
  attendanceLoading = signal(false);
  attendanceSavingId = signal<number | null>(null);
  attendanceError = signal('');
  attendanceSuccess = signal('');
  currentTime = signal(Date.now());

  private timeInterval?: ReturnType<typeof setInterval>;

  attendanceOptions: {
    value: TrainerAttendanceStatus;
    label: string;
  }[] = [
    { value: 0, label: 'حاضر' },
    { value: 1, label: 'غائب' },
    { value: 2, label: 'متأخر' },
    { value: 3, label: 'بعذر' }
  ];

  cancelling = signal(false);
  editingId = signal<number | null>(null);
  readonly reschedulingId = signal<number | null>(null);
  errorMessage = signal('');
  successMessage = signal('');
  loading = signal(false);
  joiningSessionId = signal<number | null>(null);
  saving = signal(false);

  form = {
    title: '',
    description: '',
    date: '',
    time: '',
    durationMinutes: 60,
    meetingUrl: ''
  };

  private getSessionTab(
    session: LiveSession,
    now = Date.now()
  ): SessionTab {
    if (
      session.status === 'Completed' ||
      session.status === 'Cancelled' ||
      session.status === 'Postponed'

    ) {
      return 'past';
    }

    if (session.isLive) {
      return 'ongoing';
    }

    const start = new Date(session.startTime).getTime();

    if (!Number.isFinite(start)) {
      return 'upcoming';
    }

    const end =
      start + session.durationMinutes * 60_000;

    if (now < start) return 'upcoming';
    if (now >= end) return 'past';

    return 'ongoing';
  }

  
  // هل انتهى موعد الجلسة دون تغيير حالتها إلى منتهية؟
  // isMissedSession(session: LiveSession): boolean {
  //   const start = new Date(session.startTime).getTime();

  //   if (!Number.isFinite(start)) return false;

  //   const end = start + session.durationMinutes * 60_000;

  //   return (
  //     session.status === 'Scheduled' &&
  //     !session.isLive &&
  //     this.currentTime() >= end
  //   );
  // }
  isMissedSession(session: LiveSession): boolean {
  // الجلسات المكتملة أو الملغية أو المؤجلة لا تُعتبر فائتة
  if (
    session.status === 'Completed' ||
    session.status === 'Cancelled' ||
    session.status === 'Postponed'
  ) {
    return false;
  }

  const start = new Date(session.startTime).getTime();
  const duration = Number(session.durationMinutes) || 0;
  const end = start + duration * 60_000;

  if (!Number.isFinite(start)) {
    return false;
  }

  // أي جلسة انتهى وقتها ولم تُسجل مكتملة تُعتبر فائتة
  return this.currentTime() >= end;
}

  // وصف الحالة الذي يظهر أسفل عنوان الجلسة
  // getSessionDescription(session: LiveSession): string {
  //   if (session.status === 'Completed') {
  //     return 'تم إنهاء هذه المحاضرة.';
  //   }

  //   if (session.status === 'Cancelled') {
  //     return 'تم إلغاء هذه المحاضرة.';
  //   }

  //   if (session.status === 'Postponed') {
  //     return 'تم تأجيل هذه المحاضرة.';
  //   }

  //   if (this.isMissedSession(session)) {
  //     return 'انتهى موعد المحاضرة ولم يتم تسجيل اكتمالها. يمكنك إعادة جدولتها.';
  //   }

  //   if (session.isLive) {
  //     return 'المحاضرة المباشرة نشطة الآن.';
  //   }

  //   if (this.getSessionTab(session, this.currentTime()) === 'ongoing') {
  //     return 'حان موعد المحاضرة، ويمكنك الدخول إليها.';
  //   }

  //   return 'المحاضرة مجدولة في الموعد الموضح أدناه.';
  // }
  getSessionDescription(session: LiveSession): string {
  if (session.status === 'Completed') {
    return 'تم إنهاء هذه المحاضرة.';
  }

  if (session.status === 'Cancelled') {
    return 'تم إلغاء هذه المحاضرة.';
  }

  if (session.status === 'Postponed') {
    return 'تم تأجيل هذه المحاضرة.';
  }

  if (this.isMissedSession(session)) {
    return 'انتهى موعد المحاضرة ولم يتم تسجيل اكتمالها. يمكنك إعادة جدولتها.';
  }

  if (session.isLive) {
    return 'المحاضرة المباشرة نشطة الآن.';
  }

  const tab = this.getSessionTab(session, this.currentTime());

  if (tab === 'past') {
    return 'انتهى الوقت المحدد لهذه المحاضرة.';
  }

  if (tab === 'ongoing') {
    return 'حان موعد المحاضرة، ويمكنك الدخول إليها.';
  }

  return 'المحاضرة مجدولة في الموعد الموضح أدناه.';
}

  // getSessionStatusLabel(session: LiveSession): string {
  //   if (session.status === 'Completed') return 'منتهية';
  //   if (session.status === 'Cancelled') return 'ملغية';
  //   if (session.status === 'Postponed') return 'مؤجلة';
  //   if (this.isMissedSession(session)) return 'فات موعدها';
  //   if (session.isLive) return 'جارية';

  //   return this.getSessionTab(session, this.currentTime()) === 'ongoing'
  //     ? 'حان موعدها'
  //     : 'قادمة';
  // }

  getSessionStatusLabel(session: LiveSession): string {
  if (session.status === 'Completed') {
    return 'منتهية';
  }

  if (session.status === 'Cancelled') {
    return 'ملغية';
  }

  if (session.status === 'Postponed') {
    return 'مؤجلة';
  }

  if (this.isMissedSession(session)) {
    return 'فات موعدها';
  }

  if (session.isLive) {
    return 'جارية';
  }

  const tab = this.getSessionTab(session, this.currentTime());

  if (tab === 'ongoing') {
    return 'حان موعدها';
  }

  return 'قادمة';
}

  // // إعادة استخدام نموذج تعديل الجلسة الحالي
  // rescheduleSession(session: LiveSession): void {
  //   if (!this.isMissedSession(session)) return;

  //   this.editSession(session);

  //   // نمسح الموعد القديم حتى تختار المدربة موعدًا جديدًا.
  //   this.form.date = '';
  //   this.form.time = '';
  // }

  rescheduleSession(session: LiveSession): void {
  if (!this.isMissedSession(session)) return;

  this.editSession(session);

  this.reschedulingId.set(session.id);

  // نطلب تحديد موعد جديد بدل الموعد الفائت.
  this.form.date = '';
  this.form.time = '';

  this.errorMessage.set('');
  this.successMessage.set('');
}

  upcomingCount = computed(() => {
    const now = this.currentTime();

    return this.sessions().filter(s =>
      s.batchId === this.batchId &&
      this.getSessionTab(s, now) === 'upcoming'
    ).length;
  });

  ongoingCount = computed(() => {
    const now = this.currentTime();

    return this.sessions().filter(s =>
      s.batchId === this.batchId &&
      this.getSessionTab(s, now) === 'ongoing'
    ).length;
  });

  pastCount = computed(() => {
    const now = this.currentTime();

    return this.sessions().filter(s =>
      s.batchId === this.batchId &&
      this.getSessionTab(s, now) === 'past'
    ).length;
  });

  filteredSessions = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const tab = this.activeTab();
    const now = this.currentTime();

    return this.sessions().filter(s =>
      s.batchId === this.batchId &&
      s.title.toLowerCase().includes(term) &&
      this.getSessionTab(s, now) === tab
    );
  });

  ngOnInit(): void {
    if (this.batchId <= 0) {
      this.errorMessage.set('لم يتم تحديد الدفعة.');
      return;
    }

    this.loadSessions();

    this.timeInterval = setInterval(() => {
      this.currentTime.set(Date.now());
    }, 30_000);
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  loadSessions(): void {
    this.loading.set(true);

    this.api.getLiveSessionsByBatch(this.batchId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => {
          this.sessions.set(
            response.items.map(s => this.mapSession(s))
          );
        },
        error: () => {
          this.errorMessage.set(
            'تعذر تحميل الجلسات من الخادم.'
          );
        }
      });
  }

  private mapSession(
    dto: TrainerLiveSessionDto
  ): LiveSession {
    const date = dto.sessionDate.substring(0, 10);

    const start = (dto.startTime ?? '00:00')
      .substring(0, 5);

    const end = (dto.endTime ?? '00:00')
      .substring(0, 5);

    return {
      id: dto.sessionId,
      batchId: dto.batchId,
      title: dto.topic ?? '',
      description: dto.learningObjectives ?? '',
      startTime: `${date}T${start}`,
      durationMinutes: this.getDuration(start, end),
      meetingUrl: dto.meetingLink ?? '',
      status: this.mapStatus(dto.status),
      isLive: dto.isLive === true
    };
  }

  private mapStatus(
    status: number | string
  ): SessionStatus {
    switch (String(status)) {
      case '0':
      case 'Scheduled':
        return 'Scheduled';

      case '1':
      case 'Completed':
        return 'Completed';

      case '2':
      case 'Cancelled':
        return 'Cancelled';

      case '3':
      case 'Postponed':
        return 'Postponed';

      case '4':
      case 'InProgress':
        return 'InProgress';

      default:
        throw new Error(
          `Unknown session status: ${status}`
        );
    }
  }

  private getDuration(
    start: string,
    end: string
  ): number {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);

    const duration =
      (eh * 60 + em) - (sh * 60 + sm);

    return duration > 0 ? duration : 60;
  }

  private getEndTime(
    time: string,
    duration: number
  ): string {
    const [hours, minutes] =
      time.split(':').map(Number);

    const total =
      hours * 60 + minutes + duration;

    return (
      String(Math.floor(total / 60)).padStart(2, '0') +
      ':' +
      String(total % 60).padStart(2, '0')
    );
  }

  setTab(tab: SessionTab): void {
    this.activeTab.set(tab);
  }

  openCreateForm(): void {
    this.editingId.set(null);
    this.resetForm();
    this.errorMessage.set('');
    this.successMessage.set('');
    this.showForm.set(true);
  }

  editSession(session: LiveSession): void {
    this.reschedulingId.set(null);
    this.editingId.set(session.id);

    const [date, time = ''] =
      session.startTime.split('T');

    this.form = {
      title: session.title,
      description: session.description,
      date,
      time: time.substring(0, 5),
      durationMinutes: session.durationMinutes,
      meetingUrl: session.meetingUrl
    };

    this.errorMessage.set('');
    this.successMessage.set('');
    this.showForm.set(true);
  }

  closeForm(): void {
    if (this.saving()) return;

    this.showForm.set(false);
    this.errorMessage.set('');
  }

  saveSession(): void {
    if (this.saving()) return;

    this.errorMessage.set('');
    this.successMessage.set('');

    const title = this.form.title.trim();
    const duration = Number(this.form.durationMinutes);

    if (
      !title ||
      !this.form.date ||
      !this.form.time
    ) {
      this.errorMessage.set(
        'يرجى تعبئة جميع الحقول المطلوبة.'
      );
      return;
    }

    if (this.batchId <= 0) {
      this.errorMessage.set('لم يتم تحديد الدفعة.');
      return;
    }

    if (
      !Number.isInteger(duration) ||
      duration <= 0
    ) {
      this.errorMessage.set(
        'مدة الجلسة يجب أن تكون عدد دقائق أكبر من صفر.'
      );
      return;
    }

    const start = new Date(
      `${this.form.date}T${this.form.time}:00`
    );

    if (Number.isNaN(start.getTime())) {
      this.errorMessage.set(
        'تاريخ أو وقت الجلسة غير صحيح.'
      );
      return;
    }

    if (start.getTime() <= Date.now()) {
      this.errorMessage.set(
        'اختر موعدًا مستقبليًا للجلسة.'
      );
      return;
    }

    const [hours, minutes] =
      this.form.time.split(':').map(Number);

    const endMinutes =
      hours * 60 + minutes + duration;

    if (endMinutes >= 24 * 60) {
      this.errorMessage.set(
        'يجب أن تنتهي الجلسة في نفس اليوم.'
      );
      return;
    }

    const dto: TrainerLiveSessionFormDto = {
      topic: title,
      learningObjectives: this.form.description.trim(),
      sessionDate: `${this.form.date}T00:00:00`,
      startTime: this.form.time,
      endTime: this.getEndTime(
        this.form.time,
        duration
      ),
      meetingLink: null
    };

    const editingId = this.editingId();
const reschedulingId = this.reschedulingId();

this.saving.set(true);

const request = reschedulingId !== null
  ? this.api.postponeTrainerLiveSession(
      reschedulingId,
      {
        newSessionDate: `${this.form.date}T00:00:00`,
        newStartTime: this.form.time,
        newEndTime: this.getEndTime(
          this.form.time,
          duration
        ),
        reason: 'إعادة جدولة جلسة فائتة'
      }
    )
  : editingId === null
    ? this.api.createTrainerLiveSession({
        batchId: this.batchId,
        ...dto
      })
    : this.api.updateTrainerLiveSession(
        editingId,
        dto
      );

    request
      .pipe(
        finalize(() => this.saving.set(false))
      )
      .subscribe({
next: () => {
  this.showForm.set(false);
  this.editingId.set(null);
  this.reschedulingId.set(null);
  this.activeTab.set('upcoming');

  this.successMessage.set(
    reschedulingId !== null
      ? 'تمت إعادة جدولة الجلسة بنجاح.'
      : editingId === null
        ? 'تم إنشاء الجلسة وحفظها بنجاح.'
        : 'تم تعديل الجلسة وحفظها بنجاح.'
  );

  this.loadSessions();
},
        error: err => {
          this.errorMessage.set(
            this.getApiError(
              err,
              'تعذر حفظ الجلسة.'
            )
          );
        }
      });
  }

  startSession(session: LiveSession): void {
    if (this.joiningSessionId() !== null) return;

    if (
      this.getSessionTab(session, Date.now()) !== 'ongoing'
    ) {
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.joiningSessionId.set(session.id);

    this.api.getTrainerLiveRoom(session.id)
      .pipe(
        switchMap(room =>
          room.isLive
            ? of(null)
            : this.api.startTrainerLiveRoom(session.id)
        ),
        finalize(() => this.joiningSessionId.set(null))
      )
      .subscribe({
        next: () => {
          void this.router.navigate(
            ['/trainer/live-session-room', session.id],
            {
              queryParams: {
                batchId: session.batchId
              }
            }
          );
        },
        error: err => {
          this.errorMessage.set(
            this.getApiError(
              err,
              'تعذر الدخول إلى المحاضرة المباشرة.'
            )
          );
        }
      });
  }

  completeSession(session: LiveSession): void {
    this.changeStatus(
      session,
      STATUS.Completed,
      'past',
      'تم إنهاء الجلسة.'
    );
  }

  cancelSession(session: LiveSession): void {
    this.sessionToCancel.set(session);
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    if (this.cancelling()) return;

    this.showCancelModal.set(false);
    this.sessionToCancel.set(null);
  }

  confirmCancelSession(): void {
    const session = this.sessionToCancel();

    if (!session || this.cancelling()) return;

    this.cancelling.set(true);
    this.errorMessage.set('');

    this.api.changeTrainerLiveSessionStatus(
      session.id,
      STATUS.Cancelled
    )
      .pipe(
        finalize(() => this.cancelling.set(false))
      )
      .subscribe({
        next: () => {
          this.showCancelModal.set(false);
          this.sessionToCancel.set(null);
          this.activeTab.set('past');
          this.successMessage.set(
            'تم إلغاء الجلسة بنجاح.'
          );
          this.loadSessions();
        },
        error: err => {
          this.errorMessage.set(
            this.getApiError(
              err,
              'تعذر إلغاء الجلسة.'
            )
          );
        }
      });
  }

  private changeStatus(
    session: LiveSession,
    status: number,
    tab: SessionTab,
    message: string
  ): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    this.api.changeTrainerLiveSessionStatus(
      session.id,
      status
    ).subscribe({
      next: () => {
        this.activeTab.set(tab);
        this.successMessage.set(message);
        this.loadSessions();
      },
      error: err => {
        this.errorMessage.set(
          this.getApiError(
            err,
            'تعذر تحديث حالة الجلسة.'
          )
        );
      }
    });
  }

  joinMeeting(session: LiveSession): void {
    this.startSession(session);
  }

  private getApiError(
    error: any,
    fallback: string
  ): string {
    if (error.status === 401) {
      return 'انتهت جلسة الدخول. يرجى تسجيل الدخول مجددًا.';
    }

    if (error.status === 403) {
      return 'ليس لديك صلاحية إدارة هذه الجلسة.';
    }

    if (error.status === 409) {
      return error.error?.message ??
        'يوجد تعارض في موعد الجلسة أو حالتها.';
    }

    return error.error?.message ?? fallback;
  }

  resetForm(): void {
    this.form = {
      title: '',
      description: '',
      date: '',
      time: '',
      durationMinutes: 60,
      meetingUrl: ''
    };
  }

  openAttendance(session: LiveSession): void {
    this.attendanceSession.set(session);
    this.showAttendanceModal.set(true);
    this.attendanceRows.set([]);
    this.attendanceError.set('');
    this.attendanceSuccess.set('');

    this.attendanceLoading.set(true);

    this.api.getTrainerSessionAttendance(session.id)
      .pipe(
        finalize(() => this.attendanceLoading.set(false))
      )
      .subscribe({
        next: rows => {
          this.attendanceRows.set(rows);
        },
        error: err => {
          this.attendanceError.set(
            this.getApiError(
              err,
              'تعذر تحميل حضور المتدربين.'
            )
          );
        }
      });
  }

  closeAttendance(): void {
    if (this.attendanceSavingId() !== null) return;

    this.showAttendanceModal.set(false);
    this.attendanceSession.set(null);
    this.attendanceRows.set([]);
    this.attendanceError.set('');
    this.attendanceSuccess.set('');
  }

  goBack(): void {
    this.router.navigate(['/trainer/content'], {
      queryParams: {
        batchId: this.batchId
      }
    });
  }

  setAttendanceStatus(
    traineeId: number,
    status: TrainerAttendanceStatus
  ): void {
    this.attendanceRows.update(rows =>
      rows.map(row =>
        row.traineeId === traineeId
          ? { ...row, status }
          : row
      )
    );
  }

  setAttendanceNote(
    traineeId: number,
    note: string
  ): void {
    this.attendanceRows.update(rows =>
      rows.map(row =>
        row.traineeId === traineeId
          ? { ...row, note }
          : row
      )
    );
  }

  saveAttendance(row: TrainerSessionAttendanceDto): void {
    const session = this.attendanceSession();

    if (!session || row.status === null) {
      this.attendanceError.set(
        'يرجى تحديد حالة الحضور أولًا.'
      );
      return;
    }

    if (this.attendanceSavingId() !== null) return;

    this.attendanceSavingId.set(row.traineeId);
    this.attendanceError.set('');
    this.attendanceSuccess.set('');

    this.api.updateTrainerSessionAttendance(
      session.id,
      row.traineeId,
      {
        status: row.status,
        note: row.note ?? null
      }
    )
      .pipe(
        finalize(() => this.attendanceSavingId.set(null))
      )
      .subscribe({
        next: saved => {
          this.attendanceRows.update(rows =>
            rows.map(item =>
              item.traineeId === row.traineeId
                ? {
                    ...item,
                    attendanceId: saved.attendanceId
                  }
                : item
            )
          );

          this.attendanceSuccess.set(
            `تم حفظ حضور المتدرب رقم ${row.traineeId} بنجاح.`
          );
        },
        error: err => {
          this.attendanceError.set(
            this.getApiError(
              err,
              'تعذر حفظ الحضور.'
            )
          );
        }
      });
  }
}
