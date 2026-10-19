
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

type SessionStatus = 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';
type SessionTab = 'upcoming' | 'ongoing' | 'past';

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
export class TrainerLiveSessions {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

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
      s.status === 'Scheduled'
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
      (s.status === 'Completed' || s.status === 'Cancelled')
    ).length
  );

  filteredSessions = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();

    return this.sessions().filter(s => {
      if (s.batchId !== this.batchId) return false;

      const matchesSearch =
        s.title.toLowerCase().includes(term);

      const tab = this.activeTab();

      const matchesTab =
        tab === 'upcoming' ? s.status === 'Scheduled' :
        tab === 'ongoing' ? s.status === 'InProgress' :
        s.status === 'Completed' || s.status === 'Cancelled';

      return matchesSearch && matchesTab;
    });
  });

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
    const [date, time = ''] = session.startTime.split('T');

    this.form = {
      title: session.title,
      description: session.description,
      date,
      time: time.substring(0, 5),
      durationMinutes: session.durationMinutes,
      meetingUrl: session.meetingUrl
    };

    this.errorMessage.set('');
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.errorMessage.set('');
  }

  saveSession(): void {
    this.errorMessage.set('');

    if (
      !this.form.title.trim() ||
      !this.form.date ||
      !this.form.time ||
      !this.form.meetingUrl.trim()
    ) {
      this.errorMessage.set('يرجى تعبئة جميع الحقول المطلوبة.');
      return;
    }

    if (this.batchId <= 0) {
      this.errorMessage.set('لم يتم تحديد الدفعة.');
      return;
    }

    if (!Number.isFinite(this.form.durationMinutes) ||
        this.form.durationMinutes <= 0) {
      this.errorMessage.set('مدة الجلسة يجب أن تكون أكبر من صفر.');
      return;
    }

    const startTime = `${this.form.date}T${this.form.time}`;

    if (new Date(startTime).getTime() <= Date.now()) {
      this.errorMessage.set('اختاري موعدًا مستقبليًا للجلسة.');
      return;
    }

    try {
      const url = new URL(this.form.meetingUrl.trim());
      if (url.protocol !== 'https:') {
        throw new Error('Invalid URL');
      }
    } catch {
      this.errorMessage.set('أدخلي رابط اجتماع HTTPS صحيحًا.');
      return;
    }

    const existingId = this.editingId();

    const session: LiveSession = {
      id: existingId ?? Date.now(),
      batchId: this.batchId,
      title: this.form.title.trim(),
      description: this.form.description.trim(),
      startTime,
      durationMinutes: Number(this.form.durationMinutes),
      meetingUrl: this.form.meetingUrl.trim(),
      status: 'Scheduled'
    };

    if (existingId !== null) {
      this.sessions.update(items =>
        items.map(s =>
          s.id === existingId ? { ...session, status: s.status } : s
        )
      );
    } else {
      this.sessions.update(items => [...items, session]);
    }

    this.activeTab.set('upcoming');
    this.showForm.set(false);
    this.successMessage.set(
      'تم حفظ الجلسة مؤقتًا داخل الصفحة. لم تُرسل إلى الخادم بعد.'
    );
  }

  startSession(session: LiveSession): void {
    this.sessions.update(items =>
      items.map(s =>
        s.id === session.id
          ? { ...s, status: 'InProgress' as const }
          : s
      )
    );

    this.activeTab.set('ongoing');
    this.joinMeeting(session);
  }

  completeSession(session: LiveSession): void {
    this.sessions.update(items =>
      items.map(s =>
        s.id === session.id
          ? { ...s, status: 'Completed' as const }
          : s
      )
    );
    this.activeTab.set('past');
  }

  cancelSession(session: LiveSession): void {
    if (!confirm('هل أنتِ متأكدة من إلغاء الجلسة؟')) return;

    this.sessions.update(items =>
      items.map(s =>
        s.id === session.id
          ? { ...s, status: 'Cancelled' as const }
          : s
      )
    );
  }

  joinMeeting(session: LiveSession): void {
    window.open(
      session.meetingUrl,
      '_blank',
      'noopener,noreferrer'
    );
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
