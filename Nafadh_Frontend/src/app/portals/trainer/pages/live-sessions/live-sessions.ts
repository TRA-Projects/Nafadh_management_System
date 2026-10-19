
import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import {
  TrainerApi,
  TrainerLiveSessionDto,
  TrainerLiveSessionFormDto
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
}

@Component({
  selector: 'app-trainer-live-sessions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './live-sessions.html',
  styleUrl: './live-sessions.scss'
})
export class TrainerLiveSessions implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(TrainerApi);

  batchId = Number(
    this.route.snapshot.queryParamMap.get('batchId') ?? 0
  );

  sessions = signal<LiveSession[]>([]);
  activeTab = signal<SessionTab>('upcoming');
  searchTerm = signal('');
  showForm = signal(false);
  editingId = signal<number | null>(null);
  errorMessage = signal('');
  successMessage = signal('');
  loading = signal(false);
  saving = signal(false);

  form = {
    title: '',
    description: '',
    date: '',
    time: '',
    durationMinutes: 60,
    meetingUrl: ''
  };

  upcomingCount = computed(() =>
    this.sessions().filter(s =>
      s.batchId === this.batchId &&
      (s.status === 'Scheduled' ||
       s.status === 'Postponed')
    ).length
  );

  ongoingCount = computed(() =>
    this.sessions().filter(s =>
      s.batchId === this.batchId &&
      s.status === 'InProgress'
    ).length
  );

  pastCount = computed(() =>
    this.sessions().filter(s =>
      s.batchId === this.batchId &&
      (s.status === 'Completed' ||
       s.status === 'Cancelled')
    ).length
  );

  filteredSessions = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const tab = this.activeTab();

    return this.sessions().filter(s => {
      if (s.batchId !== this.batchId) return false;

      const matchesSearch =
        s.title.toLowerCase().includes(term);

      const matchesTab =
        tab === 'upcoming'
          ? s.status === 'Scheduled' ||
            s.status === 'Postponed'
          : tab === 'ongoing'
            ? s.status === 'InProgress'
            : s.status === 'Completed' ||
              s.status === 'Cancelled';

      return matchesSearch && matchesTab;
    });
  });

  ngOnInit(): void {
    if (this.batchId <= 0) {
      this.errorMessage.set('لم يتم تحديد الدفعة.');
      return;
    }

    this.loadSessions();
  }

  // ==========================================
  // GET SESSIONS
  // ==========================================

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
      status: this.mapStatus(dto.status)
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
    const [hours, minutes] = time.split(':').map(Number);
    const total = hours * 60 + minutes + duration;

    return (
      String(Math.floor(total / 60)).padStart(2, '0') +
      ':' +
      String(total % 60).padStart(2, '0')
    );
  }

  // ==========================================
  // FORM
  // ==========================================

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

  // ==========================================
  // CREATE / UPDATE
  // ==========================================

  saveSession(): void {
    if (this.saving()) return;

    this.errorMessage.set('');
    this.successMessage.set('');

    const title = this.form.title.trim();
    const meetingLink = this.form.meetingUrl.trim();
    const duration = Number(this.form.durationMinutes);

    if (
      !title ||
      !this.form.date ||
      !this.form.time ||
      !meetingLink
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

    if (
      Number.isNaN(start.getTime()) ||
      start.getTime() <= Date.now()
    ) {
      this.errorMessage.set(
        'اختاري موعدًا مستقبليًا للجلسة.'
      );
      return;
    }

    const endMinutes =
      Number(this.form.time.split(':')[0]) * 60 +
      Number(this.form.time.split(':')[1]) +
      duration;

    if (endMinutes >= 24 * 60) {
      this.errorMessage.set(
        'يجب أن تنتهي الجلسة في نفس اليوم.'
      );
      return;
    }

    try {
      const url = new URL(meetingLink);

      const isWebex =
        url.hostname.toLowerCase() === 'webex.com' ||
        url.hostname.toLowerCase().endsWith('.webex.com');

      if (url.protocol !== 'https:' || !isWebex) {
        throw new Error('Invalid Webex link');
      }
    } catch {
      this.errorMessage.set(
        'أدخلي رابط Webex صحيحًا يبدأ بـ HTTPS.'
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
      meetingLink
    };

    const editingId = this.editingId();
    this.saving.set(true);

    const request = editingId === null
      ? this.api.createTrainerLiveSession({
          batchId: this.batchId,
          ...dto
        })
      : this.api.updateTrainerLiveSession(
          editingId,
          dto
        );

    request
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.showForm.set(false);
          this.editingId.set(null);
          this.activeTab.set('upcoming');

          this.successMessage.set(
            editingId === null
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

  // ==========================================
  // STATUS
  // ==========================================

  startSession(session: LiveSession): void {
    this.changeStatus(
      session,
      STATUS.InProgress,
      'ongoing',
      'تم بدء الجلسة.',
      true
    );
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
    if (!confirm('هل أنتِ متأكدة من إلغاء الجلسة؟')) {
      return;
    }

    this.changeStatus(
      session,
      STATUS.Cancelled,
      'past',
      'تم إلغاء الجلسة.'
    );
  }

  private changeStatus(
    session: LiveSession,
    status: number,
    tab: SessionTab,
    message: string,
    openMeeting = false
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

        if (openMeeting) {
          this.joinMeeting(session);
        }
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

  // ==========================================
  // WEBEX
  // ==========================================

  joinMeeting(session: LiveSession): void {
    if (!session.meetingUrl) {
      this.errorMessage.set(
        'لا يوجد رابط اجتماع لهذه الجلسة.'
      );
      return;
    }

    window.open(
      session.meetingUrl,
      '_blank',
      'noopener,noreferrer'
    );
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

  goBack(): void {
    this.router.navigate(['/trainer/content'], {
      queryParams: { batchId: this.batchId }
    });
  }
}
