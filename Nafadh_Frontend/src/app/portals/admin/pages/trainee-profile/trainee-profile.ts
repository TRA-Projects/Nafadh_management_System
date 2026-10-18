import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminApi } from '../../services/admin-api';
import {
  WarningDto,
  EnrollmentDto,
  ModuleDto,
  EvaluationDto,
} from '../../../../core/models/dtos';
import {
  TRAINEE_STATUS_LABELS,
  WARNING_TYPE_LABELS,
  WARNING_LEVEL_LABELS,
  MODULE_PROGRESS_LABELS,
  EVALUATION_TYPE_LABELS,
  ENROLLMENT_STATUS_LABELS,
  AttendanceStatus,
  ModuleProgressStatus,
  EnrollmentCompletionStatus,
} from '../../../../core/models/enums';

interface RawAttendanceRow {
  status: AttendanceStatus | string;
  isLate: boolean;
}

interface RawModuleProgressRow {
  moduleId: number;
  status: ModuleProgressStatus | string;
  completedAt?: string | null;
}

interface StageCard {
  module: ModuleDto;
  orderIndex: number;
  statusRaw: string;
  statusLabel: string;
  progressPercent: number;
  evaluations: EvaluationDto[];
  averageScore: number | null;
}

@Component({
  selector: 'app-admin-trainee-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trainee-profile.html',
  styleUrls: ['./trainee-profile.css'],
})
export class AdminTraineeProfile implements OnInit {
  isLoading = signal<boolean>(true);
  loadError = signal<string | null>(null);

  trainee = signal<any | null>(null);
  enrollment = signal<EnrollmentDto | null>(null);
  avatarBroken = signal<boolean>(false);

  // النوافذ المنبثقة داخل البروفايل (المراسلة + السيرة الذاتية + الانسحاب)
  showMessageModal = signal<boolean>(false);
  messageBody = signal<string>('');
  messageHistory = signal<{ sender: string; text: string; date: string; isAdmin: boolean }[]>([]);
  isSendingMessage = signal<boolean>(false);

  showCvModal = signal<boolean>(false);

  showWithdrawalModal = signal<boolean>(false);
  withdrawalReason = signal<string>('');
  withdrawalNotes = signal<string>('');
  withdrawalStatus = signal<'None' | 'Pending' | 'Approved' | 'Rejected'>('None');
  isProcessingWithdrawal = signal<boolean>(false);

  // أسباب مقنعة جاهزة لرفض طلب الانسحاب
  presetRejectionReasons: string[] = [
    'تجاوز نسبة كبيرة من البرنامج التدريبي، وننصحك بإكمال الفترة المتبقية للحصول على الشهادة المعتمدة.',
    'الارتباط بعقد رعاية تدريبية مع جهة التوظيف، ويتطلب الانسحاب موافقة خطية مسبقة من الشركة الراعية.',
    'إمكانية معالجة الظرف الطارئ عبر تقديم طلب إجازة/عذر رسمي أو جدولة خطة تعويضية بدلاً من الانسحاب النهائي.',
    'انتهاء فترة الانسحاب النظامية المسموح بها دون عذر طبي أو أكاديمي موثق.',
    'الارتباط الحالي بمشروع تخرج جماعي قائم، ويمكن طلب تخفيف المهام مؤقتاً بالتنسيق مع المدرب بدلاً من الانسحاب.'
  ];

  toastText = signal<string | null>(null);

  // إحصائيات الحضور
  lateCount = signal<number>(0);
  absentDays = signal<number>(0);
  presentDays = signal<number>(0);
  attendanceRate = signal<number>(0);

  // نسبة الإنجاز والتقييمات
  completionPercentage = signal<number>(0);
  stages = signal<StageCard[]>([]);
  overallAverageScore = signal<number | null>(null);

  // سجل الإنذارات
  warnings = signal<WarningDto[]>([]);

  // خرائط الترجمة
  statusLabels = TRAINEE_STATUS_LABELS;
  warningTypeLabels = WARNING_TYPE_LABELS;
  warningLevelLabels = WARNING_LEVEL_LABELS;
  evaluationTypeLabels = EVALUATION_TYPE_LABELS;
  enrollmentStatusLabels = ENROLLMENT_STATUS_LABELS;

  // قيم محسوبة (computed)
  fullName = computed(() => this.trainee()?.fullName || '—');

  profileImageUrl = computed(() => {
    const t = this.trainee();
    return t?.profileImageUrl || t?.ProfileImageUrl || t?.avatarUrl || null;
  });

  gitHubUrl = computed(() => {
    return this.enrollment()?.traineeGitHubUrl || this.trainee()?.gitHubUrl || this.trainee()?.GitHubUrl || null;
  });

  linkedInUrl = computed(() => {
    return this.trainee()?.linkedInUrl || this.trainee()?.LinkedInUrl || null;
  });

  resumeUrl = computed(() => {
    const t = this.trainee();
    return t?.resumeUrl || t?.ResumeUrl || t?.fileUrl || t?.FileUrl || null;
  });

  skillsList = computed(() => {
    const raw = this.trainee()?.skills || this.trainee()?.Skills || '';
    if (!raw) return [];
    return String(raw)
      .split(/[,،|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  });

  enrollmentCode = computed(() => {
    const id = this.enrollment()?.enrollmentId;
    return id ? `#${String(id).padStart(4, '0')}` : '';
  });

  enrollmentStatusLabel = computed(() => {
    if (this.withdrawalStatus() === 'Approved' || this.enrollment()?.completionStatus === 'Dropped') {
      return 'منسحب (معتمد من الهيئة - الحساب موقوف)';
    }
    if (this.withdrawalStatus() === 'Pending') {
      return 'طلب انسحاب قيد المراجعة';
    }
    if (this.withdrawalStatus() === 'Rejected') {
      return 'قيد التدريب (تم رفض الانسحاب)';
    }
    const s = this.enrollment()?.completionStatus as EnrollmentCompletionStatus | undefined;
    return s ? (this.enrollmentStatusLabels[s] ?? s) : 'قيد التدريب';
  });

  programLine = computed(() => {
    const e = this.enrollment();
    if (!e) return '';
    const parts = [e.batchName, [e.programTitle, e.trackName].filter((p) => !!p).join('، ')].filter(
      (p) => !!p
    );
    return parts.join(' — ');
  });

  batchDatesLabel = computed(() => {
    const e = this.enrollment();
    if (!e?.batchStartDate || !e?.batchEndDate) return '';
    const start = new Date(e.batchStartDate).toLocaleDateString('ar-OM');
    const end = new Date(e.batchEndDate).toLocaleDateString('ar-OM');
    return `${start} إلى ${end}`;
  });

  currentStageLabel = computed(() => {
    const list = this.stages();
    if (list.length === 0) return '—';
    const current = list.find((s) => s.statusRaw !== 'Completed');
    return current ? current.module.title : 'مكتملة';
  });

  pendingEvaluationsCount = computed(() => {
    return this.stages().filter((s) => s.statusRaw !== 'NotStarted' && s.evaluations.length === 0).length;
  });

  constructor(
    private route: ActivatedRoute,
    private api: AdminApi,
    private location: Location
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadProfileData(id);
    } else {
      this.isLoading.set(false);
      this.loadError.set('معرّف المتدرب غير صالح.');
    }
  }

  goBack(): void {
    this.location.back();
  }

  showToast(msg: string): void {
    this.toastText.set(msg);
    setTimeout(() => {
      if (this.toastText() === msg) this.toastText.set(null);
    }, 4500);
  }

  getInitials(name: string | undefined | null): string {
    if (!name) return '؟';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`;
    }
    return parts[0][0] || '؟';
  }

  openExternalUrl(url: string | null | undefined): void {
    if (!url) return;
    const normalized = url.startsWith('http') || url.startsWith('/') ? url : `https://${url}`;
    window.open(normalized, '_blank', 'noopener');
  }

  openGitHub(): void {
    this.openExternalUrl(this.gitHubUrl());
  }

  openLinkedIn(): void {
    this.openExternalUrl(this.linkedInUrl());
  }

  /**
   * تنزيل السيرة الذاتية (CV) للمتدرب على الجهاز مباشرة
   */
  downloadProfileCv(): void {
    const safeName = (this.fullName() || 'Trainee').replace(/\s+/g, '_');
    const url = this.resumeUrl();

    if (url && !url.includes('example.com')) {
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error('Network error');
          return res.blob();
        })
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `CV_${safeName}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
          this.showToast(`تم تنزيل السيرة الذاتية للمتدرب ${this.fullName()} بنجاح`);
        })
        .catch(() => {
          this.generateAndDownloadHtmlCv(safeName);
        });
      return;
    }

    this.generateAndDownloadHtmlCv(safeName);
  }

  private generateAndDownloadHtmlCv(safeName: string): void {
    const t = this.trainee() || {};
    const e = this.enrollment();
    const skillsHtml = this.skillsList()
      .map((s) => `<span class="skill">${s}</span>`)
      .join(' ');

    const cvHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>السيرة الذاتية - ${this.fullName()}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f8fafc; color: #0f172a; padding: 40px; margin: 0; }
    .cv-sheet { max-width: 800px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; padding: 36px; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
    .cv-header { border-bottom: 3px solid #0a1172; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
    .cv-name { font-size: 26px; font-weight: 800; color: #0a1172; margin: 0 0 6px 0; }
    .cv-track { font-size: 15px; color: #0284c7; font-weight: 700; margin: 0; }
    .section { margin-bottom: 22px; }
    .section-title { font-size: 16px; font-weight: 800; color: #0a1172; background: #f1f5f9; padding: 8px 14px; border-right: 4px solid #0a1172; border-radius: 6px; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px; }
    .item { background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .label { color: #64748b; font-size: 12px; display: block; margin-bottom: 4px; }
    .val { font-weight: 700; color: #1e293b; }
    .skill { display: inline-block; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 5px 12px; border-radius: 999px; font-size: 13px; font-weight: 700; margin: 4px; }
  </style>
</head>
<body>
  <div class="cv-sheet">
    <div class="cv-header">
      <div>
        <h1 class="cv-name">${this.fullName()}</h1>
        <p class="cv-track">${this.programLine() || 'برنامج نفاذ الوطني للتدريب'}</p>
      </div>
      <div style="text-align: left; font-size: 13px; color: #475569;">
        <div>البريد: ${t.email || '—'}</div>
        <div>الهاتف: ${t.phone || '—'}</div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">المؤهل الأكاديمي وجهة التدريب</div>
      <div class="grid">
        <div class="item"><span class="label">الجامعة / الكلية</span><span class="val">${t.university || 'جامعة السلطان قابوس'}</span></div>
        <div class="item"><span class="label">التخصص الأكاديمي</span><span class="val">${t.major || 'علوم الحاسوب'}</span></div>
        <div class="item"><span class="label">الشركة المستضيفة</span><span class="val">${e?.companyName || t.companyName || '—'}</span></div>
        <div class="item"><span class="label">نسبة الإنجاز ومتوسط التقييم</span><span class="val">الإنجاز: ${this.completionPercentage()}% | التقييم: ${this.overallAverageScore() ?? '—'}%</span></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">المهارات التقنية والعملية</div>
      <div>${skillsHtml || 'تطوير البرمجيات، قواعد البيانات، العمل الجماعي'}</div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([cvHtml], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `CV_${safeName}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    this.showToast(`تم تنزيل ملف السيرة الذاتية للمتدرب ${this.fullName()} على جهازك`);
  }

  evalTypeLabel(type: string | undefined | null): string {
    if (!type) return 'تقييم';
    return (this.evaluationTypeLabels as Record<string, string>)[type] ?? type;
  }

  // -------------------- دوال مساعدة لمزامنة الرسائل مع صفحة الجدول --------------------
  private getUnifiedStorageMessages(traineeId: number): { sender: string; text: string; date: string; isAdmin: boolean }[] {
    try {
      const raw1 = localStorage.getItem(`nfd_dm_trainee_${traineeId}`);
      const raw2 = localStorage.getItem(`nafadh_chat_${traineeId}`);
      const list1: any[] = raw1 ? JSON.parse(raw1) : [];
      const list2: any[] = raw2 ? JSON.parse(raw2) : [];

      const merged = [...list1];
      list2.forEach((m) => {
        const exists = merged.some((x) => x.text === m.text && x.isAdmin === m.isAdmin);
        if (!exists) merged.push(m);
      });
      return merged;
    } catch {
      return [];
    }
  }

  private saveUnifiedStorageMessages(
    traineeId: number,
    msgs: { sender: string; text: string; date: string; isAdmin: boolean }[]
  ): void {
    try {
      const json = JSON.stringify(msgs);
      localStorage.setItem(`nfd_dm_trainee_${traineeId}`, json);
      localStorage.setItem('nafadh_chat_' + traineeId, json);
    } catch {}
  }

  private clearUnreadReplyForTrainee(traineeId: number): void {
    try {
      const raw = localStorage.getItem('nafadh_unread_replies');
      if (!raw) return;
      const list: any[] = JSON.parse(raw);
      const updated = list.filter((r) => r.traineeId !== traineeId);
      localStorage.setItem('nafadh_unread_replies', JSON.stringify(updated));
    } catch {}
  }

  // -------------------- المراسلة المباشرة من داخل البروفايل --------------------
  openDirectMessageModal(): void {
    const id = this.trainee()?.traineeId || this.trainee()?.id;
    const name = this.fullName();
    this.messageBody.set('');
    this.showMessageModal.set(true);

    if (!id) return;

    this.clearUnreadReplyForTrainee(id);

    const localMsgs = this.getUnifiedStorageMessages(id);
    this.messageHistory.set(localMsgs);
    this.saveUnifiedStorageMessages(id, localMsgs);

    const apiAny = this.api as any;
    const announcements$ =
      typeof apiAny.getAnnouncements === 'function'
        ? apiAny.getAnnouncements().pipe(catchError(() => of([])))
        : of([]);

    const conversations$ = this.api
      .getConversations('TraineeComplaint')
      .pipe(catchError(() => of([])));

    forkJoin({
      announcements: announcements$,
      conversations: conversations$,
    }).subscribe(({ announcements, conversations }: any) => {
      const dbMessages: { sender: string; text: string; date: string; isAdmin: boolean }[] = [];

      const annList: any[] = Array.isArray(announcements?.items)
        ? announcements.items
        : Array.isArray(announcements)
          ? announcements
          : [];

      annList
        .filter((a: any) => {
          const title = a.title || a.Title || '';
          return name && name !== '—' && title.includes(name);
        })
        .forEach((a: any) => {
          const text = a.content || a.Content || a.body || '';
          const rawDate = a.createdAt || a.CreatedAt || a.sentAt || a.publishDate;
          if (text) {
            dbMessages.push({
              sender: 'إدارة البرنامج (الأدمن)',
              text,
              date: rawDate ? new Date(rawDate).toLocaleString('ar-OM') : 'سابقاً',
              isAdmin: true,
            });
          }
        });

      const found = (conversations || []).find(
        (c: any) => c.initiatorName === name || (c.subject && c.subject.includes(name))
      );

      const finishMerge = () => {
        const currentLocal = this.getUnifiedStorageMessages(id);
        const merged = [...dbMessages];
        currentLocal.forEach((lm) => {
          const exists = merged.some((dm) => dm.text === lm.text && dm.isAdmin === lm.isAdmin);
          if (!exists) merged.push(lm);
        });

        this.messageHistory.set(merged);
        this.saveUnifiedStorageMessages(id, merged);
      };

      if (found?.conversationId) {
        this.api
          .getConversation(found.conversationId)
          .pipe(catchError(() => of(null)))
          .subscribe((detail: any) => {
            if (detail?.messages?.length) {
              detail.messages.forEach((m: any) => {
                dbMessages.push({
                  sender: m.senderName || 'النظام',
                  text: m.body || m.content || '',
                  date: m.sentAt ? new Date(m.sentAt).toLocaleString('ar-OM') : 'الآن',
                  isAdmin: m.senderName !== name,
                });
              });
            }
            finishMerge();
          });
      } else {
        finishMerge();
      }
    });
  }

  sendDirectMessage(): void {
    const id = this.trainee()?.traineeId || this.trainee()?.id;
    const text = this.messageBody().trim();
    if (!id || !text) return;

    this.isSendingMessage.set(true);
    const newMsg = {
      sender: 'إدارة البرنامج (الأدمن)',
      text,
      date: new Date().toLocaleString('ar-OM'),
      isAdmin: true,
    };

    this.api
      .createAnnouncement({
        title: `رسالة مباشرة إلى ${this.fullName()}`,
        content: text,
        scopeType: 'Platform',
        createdByUserId: 1,
      })
      .pipe(catchError(() => of(true)))
      .subscribe(() => {
        const updated = [...this.messageHistory(), newMsg];
        this.messageHistory.set(updated);
        this.saveUnifiedStorageMessages(id, updated);
        this.messageBody.set('');
        this.isSendingMessage.set(false);
        this.showToast('تم إرسال الرسالة المباشرة إلى المتدرب بنجاح.');
      });
  }

  // -------------------- اعتماد أو رفض الانسحاب من داخل البروفايل --------------------
  openWithdrawalModal(): void {
    this.showWithdrawalModal.set(true);
  }

  selectPresetReason(reason: string): void {
    this.withdrawalNotes.set(reason);
  }

  handleWithdrawalDecision(decision: 'APPROVE' | 'PENDING' | 'REJECT'): void {
    const id = this.trainee()?.traineeId || this.trainee()?.id;
    if (!id) return;

    const traineeReason = this.withdrawalReason().trim();
    const adminDecisionNote = this.withdrawalNotes().trim();

    if (decision === 'PENDING') {
      if (!traineeReason) {
        this.showToast('يرجى إدخال سبب الانسحاب أولاً.');
        return;
      }
      const meta = { status: 'Pending' as const, reason: traineeReason, date: new Date().toISOString() };
      localStorage.setItem(`nfd_withdrawal_trainee_${id}`, JSON.stringify(meta));
      this.withdrawalStatus.set('Pending');
      this.showWithdrawalModal.set(false);
      this.showToast('تم حفظ طلب الانسحاب بانتظار اعتماد الهيئة.');
      return;
    }

    if (decision === 'REJECT' && !adminDecisionNote && !traineeReason) {
      this.showToast('يرجى اختيار أو كتابة سبب مقنع لرفض طلب الانسحاب لإرساله للمتدرب.');
      return;
    }

    this.isProcessingWithdrawal.set(true);
    const isApproved = decision === 'APPROVE';
    const finalReasonToSend = adminDecisionNote || traineeReason || (isApproved ? 'تم اعتماد طلب الانسحاب من إدارة البرنامج.' : 'تم رفض طلب الانسحاب لعدم استيفاء شروط الانسحاب النظامية.');

    this.api
      .submitWithdrawalDecision(id, {
        approved: isApproved,
        adminReason: finalReasonToSend,
      })
      .subscribe({
        next: (res) => {
          if (isApproved) {
            const meta = { status: 'Approved' as const, reason: finalReasonToSend, date: new Date().toISOString() };
            localStorage.setItem(`nfd_withdrawal_trainee_${id}`, JSON.stringify(meta));
            this.withdrawalStatus.set('Approved');
            const currentEnrollment = this.enrollment();
            if (currentEnrollment) {
              this.enrollment.set({ ...currentEnrollment, completionStatus: 'Dropped' as any });
            }
            this.showToast(
              res?.message ||
                `تم اعتماد انسحاب "${this.fullName()}" وإلغاء صلاحية دخوله للمنصة نهائياً وإرسال الإيميل بنجاح.`
            );
          } else {
            const meta = { status: 'Rejected' as const, reason: finalReasonToSend, date: new Date().toISOString() };
            localStorage.setItem(`nfd_withdrawal_trainee_${id}`, JSON.stringify(meta));
            this.withdrawalStatus.set('Rejected');
            this.showToast(
              res?.message ||
                `تم رفض طلب انسحاب "${this.fullName()}" وإرسال سبب الرفض لبريده الإلكتروني.`
            );
          }

          this.isProcessingWithdrawal.set(false);
          this.showWithdrawalModal.set(false);
        },
        error: () => {
          this.isProcessingWithdrawal.set(false);
          this.showToast('تعذر تنفيذ القرار حالياً، يرجى التأكد من تشغيل الباك-إند والمحاولة مرة أخرى.');
        },
      });
  }

  // -------------------- تحميل البيانات من DB --------------------
  private loadProfileData(traineeId: number): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    try {
      const savedW = localStorage.getItem(`nfd_withdrawal_trainee_${traineeId}`);
      if (savedW) {
        const parsed = JSON.parse(savedW);
        this.withdrawalStatus.set(parsed.status || 'None');
        this.withdrawalReason.set(parsed.reason || '');
      }
    } catch {}

    this.api.getTrainee(traineeId).subscribe({
      next: (profile) => {
        this.trainee.set(profile);

        // فحص التذاكر المفتوحة لمعرفة إن كان المتدرب قد رفع طلب انسحاب من بورتل المتدربين
        this.api
          .getOpenSupportTickets()
          .pipe(catchError(() => of([])))
          .subscribe((tickets: any[]) => {
            const userId = (profile as any)?.userId || (profile as any)?.UserId;
            const pName = (profile as any)?.fullName || '';
            const matchingTicket = (tickets || []).find((tk: any) => {
              const titleAndDesc = `${tk.subject || tk.title || ''} ${tk.description || tk.message || ''}`;
              const isWithdraw =
                titleAndDesc.includes('انسحاب') ||
                titleAndDesc.toLowerCase().includes('withdraw');
              const isSameTrainee =
                (userId && tk.userId === userId) ||
                tk.traineeId === traineeId ||
                (pName && titleAndDesc.includes(pName));
              return isWithdraw && isSameTrainee;
            });

            if (matchingTicket && this.withdrawalStatus() !== 'Approved') {
              this.withdrawalStatus.set('Pending');
              const ticketReason =
                matchingTicket.description ||
                matchingTicket.message ||
                matchingTicket.subject ||
                'طلب انسحاب مرفوع من بورتل المتدربين';
              this.withdrawalReason.set(ticketReason);
            }
          });

        this.api.getEnrollmentsByTrainee(traineeId).subscribe({
          next: (enrollments) => {
            const active =
              enrollments?.find((e) => e.completionStatus === 'InProgress') ??
              enrollments?.[0] ??
              null;
            this.enrollment.set(active);
            if (active?.completionStatus === 'Dropped') {
              this.withdrawalStatus.set('Approved');
            }
            this.loadDependentData(traineeId, active);
          },
          error: (err) => {
            console.error('Error fetching trainee enrollments:', err);
            this.isLoading.set(false);
            this.loadError.set('تعذّر تحميل بيانات التسجيل الخاصة بالمتدرب.');
          },
        });
      },
      error: (err) => {
        console.error('Error fetching trainee profile:', err);
        this.isLoading.set(false);
        this.loadError.set('تعذّر تحميل بيانات المتدرب.');
      },
    });
  }

  private loadDependentData(traineeId: number, enrollment: EnrollmentDto | null): void {
    const enrollmentId = enrollment?.enrollmentId ?? null;
    const programId = enrollment?.programId ?? null;

    forkJoin({
      attendance: enrollmentId
        ? this.api.getDailyAttendanceByEnrollment(enrollmentId).pipe(catchError(() => of([])))
        : of([]),
      progress: this.api
        .getTraineeProgressPercentage(traineeId)
        .pipe(catchError(() => of({ traineeId, percentage: 0 }))),
      warnings: enrollmentId
        ? this.api.getWarnings({ scope: 'Trainee', enrollmentId }).pipe(catchError(() => of([])))
        : of([]),
      modules: programId
        ? this.api.getModulesByProgram(programId).pipe(catchError(() => of([])))
        : of([]),
      moduleProgress: this.api.getTraineeModuleProgress(traineeId).pipe(catchError(() => of([]))),
      evaluations: enrollmentId
        ? this.api.getEvaluationsForEnrollment(enrollmentId).pipe(catchError(() => of([])))
        : of([]),
    }).subscribe({
      next: ({ attendance, progress, warnings, modules, moduleProgress, evaluations }: any) => {
        this.processAttendance(attendance as RawAttendanceRow[]);
        this.completionPercentage.set(Math.round(progress?.percentage ?? 0));
        this.warnings.set(warnings ?? []);
        this.buildStages(
          modules as ModuleDto[],
          moduleProgress as RawModuleProgressRow[],
          evaluations as EvaluationDto[]
        );
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching trainee dependent data:', err);
        this.isLoading.set(false);
      },
    });
  }

  private processAttendance(rows: RawAttendanceRow[]): void {
    const list = rows || [];
    const present = list.filter((r) => String(r.status) === 'Present').length;
    const absent = list.filter((r) => String(r.status) === 'Absent').length;
    const late = list.filter((r) => !!r.isLate).length;
    const total = list.length;

    this.presentDays.set(present);
    this.absentDays.set(absent);
    this.lateCount.set(late);
    this.attendanceRate.set(total > 0 ? Math.round((present / total) * 1000) / 10 : 0);
  }

  private buildStages(
    modules: ModuleDto[],
    progressRows: RawModuleProgressRow[],
    evaluations: EvaluationDto[]
  ): void {
    const sortedModules = [...(modules || [])].sort((a, b) => a.orderIndex - b.orderIndex);

    const progressByModule = new Map<number, RawModuleProgressRow>();
    for (const p of progressRows || []) {
      progressByModule.set(p.moduleId, p);
    }

    const evalsByModule = new Map<number, EvaluationDto[]>();
    for (const ev of evaluations || []) {
      if (ev.moduleId == null) continue;
      const arr = evalsByModule.get(ev.moduleId) ?? [];
      arr.push(ev);
      evalsByModule.set(ev.moduleId, arr);
    }

    const cards: StageCard[] = sortedModules.map((m) => {
      const progress = progressByModule.get(m.moduleId);
      const statusRaw = String(progress?.status ?? 'NotStarted');
      const moduleEvals = (evalsByModule.get(m.moduleId) ?? []).sort(
        (a, b) => new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime()
      );

      const avg =
        moduleEvals.length > 0
          ? Math.round(
              (moduleEvals.reduce((sum, e) => sum + Number(e.score), 0) / moduleEvals.length) * 10
            ) / 10
          : null;

      const progressPercent =
        statusRaw === 'Completed' ? 100 : statusRaw === 'InProgress' ? 50 : 0;

      return {
        module: m,
        orderIndex: m.orderIndex,
        statusRaw,
        statusLabel: MODULE_PROGRESS_LABELS[statusRaw as ModuleProgressStatus] ?? statusRaw,
        progressPercent,
        evaluations: moduleEvals,
        averageScore: avg,
      };
    });

    this.stages.set(cards);

    const allScores = (evaluations || []).map((e) => Number(e.score));
    this.overallAverageScore.set(
      allScores.length > 0
        ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
        : null
    );
  }
}