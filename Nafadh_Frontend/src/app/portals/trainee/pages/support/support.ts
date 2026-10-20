import {
  Component,
  OnInit,
  signal,
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { TraineeApi } from '../../services/trainee-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  ConversationDetailDto,
  ConversationListItemDto,
  ConversationMessageDto,
  TraineeProfileDto,
  EnrollmentDto,
  TrainerDto,
  BatchDto
} from '../../../../core/models/dtos';


type SupportTab = 'messages' | 'batch';


@Component({
  selector: 'app-trainee-support',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './support.html',
  styleUrl: './support.scss'
})
export class TraineeSupport implements OnInit {

  // =========================================================
  // Active Tab
  // =========================================================

  activeTab = signal<SupportTab>('messages');


  // =========================================================
  // Conversations (existing)
  // =========================================================

  conversations =
    signal<ConversationListItemDto[]>([]);

  active =
    signal<ConversationDetailDto | null>(null);


  // =========================================================
  // Trainee
  // =========================================================

  traineeId =
    signal<number | null>(null);

  enrollment =
    signal<EnrollmentDto | null>(null);


  // =========================================================
  // Company
  // =========================================================

  companyName =
    signal('');


  // =========================================================
  // Trainers
  // =========================================================

  trainers =
    signal<TrainerDto[]>([]);

  loadingTrainers =
    signal(false);


  // =========================================================
  // UI
  // =========================================================

  isSubmitting =
    signal(false);

  errorMessage =
    signal('');

  successMessage =
    signal('');


  // =========================================================
  // Reply
  // =========================================================

  replyText = '';


  // =========================================================
  // New Request
  // =========================================================

  newConv = {
    receiverType: '',
    trainerId: null as number | null,
    subject: '',
    note: '',
    firstMessage: ''
  };


  // =========================================================
  // File
  // =========================================================

  selectedFile: File | null = null;


  // =========================================================
  // Authority Subjects
  // =========================================================

  subjects = [
    'استفسار عن البرنامج التدريبي',
    'مشكلة تقنية',
    'استفسار عن الحضور',
    'شكوى رسمية',
    'طلب انسحاب',
    'أخرى'
  ];


  // =========================================================
  // BATCH GROUP STATE
  // =========================================================

  batchName =
    signal('');

  batchGroupConversationId =
    signal<number | null>(null);

  batchGroupMessages =
    signal<ConversationMessageDto[]>([]);

  batchTrainers =
    signal<TrainerDto[]>([]);

  batchTrainees =
    signal<TraineeProfileDto[]>([]);

  loadingBatch =
    signal(false);

  batchLoaded =
    signal(false);

  batchMessageText = '';

  showMembersPanel = false;


  // =========================================================
  // PRIVATE CHAT STATE
  // =========================================================

  privateChatOpen =
    signal(false);

  privateChatWith =
    signal<{
      userId: number;
      name: string;
      role: 'trainer' | 'trainee';
    } | null>(null);

  privateConversationId =
    signal<number | null>(null);

  privateMessages =
    signal<ConversationMessageDto[]>([]);

  privateMessageText = '';

  loadingPrivate =
    signal(false);


  // =========================================================
  // Constructor
  // =========================================================

  constructor(
    private api: TraineeApi,
    public auth: AuthService
  ) {}


  // =========================================================
  // Init
  // =========================================================

  ngOnInit(): void {
    this.loadConversations();
    this.loadCurrentTraineeData();
  }


  // =========================================================
  // Tabs
  // =========================================================

  setTab(tab: SupportTab): void {
    this.activeTab.set(tab);

    if (
      tab === 'batch' &&
      !this.batchLoaded() &&
      !this.loadingBatch()
    ) {
      this.loadBatchGroup();
    }
  }


  // =========================================================
  // Withdrawal Request
  // =========================================================

  isWithdrawalRequest(conversation: any): boolean {
    if (!conversation) return false;
    return String(conversation?.subject ?? '').trim() === 'طلب انسحاب';
  }


  getWithdrawalStatus(
    conversation: any
  ): 'pending' | 'approved' | 'rejected' | null {
    if (!this.isWithdrawalRequest(conversation)) return null;
    return 'pending';
  }


  // =========================================================
  // Trainee
  // =========================================================

  private loadCurrentTraineeData(): void {
    const uid = this.auth.userId;
    if (!uid) return;

    this.api.getTrainee(uid).subscribe({
      next: (trainee: TraineeProfileDto) => {
        const traineeId = Number(trainee.traineeId);
        if (!traineeId || Number.isNaN(traineeId)) return;
        this.traineeId.set(traineeId);
        this.loadTraineeEnrollment(traineeId);
      },
      error: (err: any) => {
        console.error('Error loading trainee:', err);
        this.companyName.set('');
        this.trainers.set([]);
      }
    });
  }


  // =========================================================
  // Enrollment
  // =========================================================

  private loadTraineeEnrollment(traineeId: number): void {
    this.api.getEnrollmentsByTrainee(traineeId).subscribe({
      next: (enrollments: EnrollmentDto[]) => {

        if (!enrollments || enrollments.length === 0) {
          this.enrollment.set(null);
          this.companyName.set('');
          this.trainers.set([]);
          return;
        }

        const activeEnrollment =
          enrollments.find(e => {
            const status = String(e.completionStatus ?? '').toLowerCase();
            return (
              status === 'active' ||
              status === 'inprogress' ||
              status === 'in_progress'
            );
          }) || enrollments[0];

        this.enrollment.set(activeEnrollment);
        this.companyName.set(activeEnrollment.companyName ?? '');

        const batchId = Number(activeEnrollment.batchId);
        if (batchId && !Number.isNaN(batchId)) {
          this.loadTrainersByBatch(batchId);
        } else {
          this.trainers.set([]);
        }
      },
      error: (err: any) => {
        console.error('Error loading enrollment:', err);
        this.enrollment.set(null);
        this.companyName.set('');
        this.trainers.set([]);
      }
    });
  }


  // =========================================================
  // Trainers
  // =========================================================

  private loadTrainersByBatch(batchId: number): void {
    this.loadingTrainers.set(true);
    this.trainers.set([]);

    this.api.getBatchTrainers(batchId).subscribe({
      next: (batchTrainers: TrainerDto[]) => {

        if (!batchTrainers || batchTrainers.length === 0) {
          this.trainers.set([]);
          this.loadingTrainers.set(false);
          return;
        }

        const requests = batchTrainers.map(bt => {
          const trainerId = Number(bt.trainerId);
          if (!trainerId || Number.isNaN(trainerId)) {
            return of(bt);
          }
          return this.api.getTrainer(trainerId).pipe(
            catchError(() => of(bt))
          );
        });

        forkJoin(requests).subscribe({
          next: (fullTrainers) => {
            const validTrainers = fullTrainers.filter(
              t => t != null
            ) as TrainerDto[];
            this.trainers.set(validTrainers);
            this.loadingTrainers.set(false);
          },
          error: () => {
            this.trainers.set(batchTrainers);
            this.loadingTrainers.set(false);
          }
        });
      },
      error: (err: any) => {
        console.error('Error loading trainers:', err);
        this.trainers.set([]);
        this.loadingTrainers.set(false);
      }
    });
  }


  // =========================================================
  // Conversations (existing)
  // =========================================================

  private loadConversations(): void {
    const uid = this.auth.userId;
    if (!uid) {
      this.errorMessage.set('تعذر تحديد المستخدم الحالي');
      return;
    }

    this.api.getConversations(uid).subscribe({
      next: (data) => {
        const all = data ?? [];
        const complaints = all.filter(
          (c: any) =>
            c.type === 'TraineeComplaint' ||
            c.conversationType === 'TraineeComplaint'
        );
        this.conversations.set(complaints);

        const current = this.active();
        if (current) {
          const exists = complaints.some(
            (c: any) =>
              Number(c.conversationId) === Number(current.conversationId)
          );
          if (!exists) this.active.set(null);
        }
      },
      error: (err: any) => {
        console.error('Error loading conversations:', err);
        this.errorMessage.set('تعذر تحميل الشكاوى');
      }
    });
  }


  open(id: number): void {
    this.errorMessage.set('');

    const listConversation: any = this.conversations().find(
      c => Number(c.conversationId) === Number(id)
    );

    this.api.getConversation(id).subscribe({
      next: (conversation: any) => {
        const merged = {
          ...(listConversation ?? {}),
          ...(conversation ?? {})
        };
        this.active.set(merged as ConversationDetailDto);
      },
      error: () => {
        this.errorMessage.set('تعذر فتح المحادثة');
      }
    });
  }


  // =========================================================
  // BATCH GROUP — LOAD
  // =========================================================

  loadBatchGroup(): void {
    const uid = this.auth.userId;
    const currentEnrollment = this.enrollment();

    if (!uid) {
      this.errorMessage.set('تعذر تحديد المستخدم الحالي');
      return;
    }

    const batchId = Number(currentEnrollment?.batchId);

    if (!batchId || Number.isNaN(batchId)) {
      this.loadingBatch.set(false);
      this.batchLoaded.set(true);
      return;
    }

    this.loadingBatch.set(true);
    this.errorMessage.set('');
    this.batchGroupConversationId.set(null);
    this.batchGroupMessages.set([]);
    this.batchTrainees.set([]);
    this.batchTrainers.set([]);

    // 1) اسم الدفعة
    this.api.getBatch(batchId).subscribe({
      next: (batch: BatchDto) => {
        this.batchName.set(batch?.batchName ?? '');
      },
      error: () => this.batchName.set('')
    });

    // 2) مدربو الدفعة
    this.api.getBatchTrainers(batchId).subscribe({
      next: (t: TrainerDto[]) => this.batchTrainers.set(t ?? []),
      error: () => this.batchTrainers.set([])
    });

    // 3) متدربو الدفعة
    this.api.getBatchTrainees(batchId).subscribe({
      next: (t: TraineeProfileDto[]) => this.batchTrainees.set(t ?? []),
      error: () => this.batchTrainees.set([])
    });

    // 4) ابحث عن جروب الدفعة
    this.api.getAllParticipantConversations(uid).subscribe({
      next: (all) => {

        const group = (all ?? []).find(
          (c: any) =>
            c.category === 'BatchGroup' &&
            Number(c.batchId) === batchId
        );

        if (!group) {
          this.loadingBatch.set(false);
          this.batchLoaded.set(true);
          return;
        }

        this.batchGroupConversationId.set(group.conversationId);

        // 5) حمّل الرسائل
        this.api.getConversation(group.conversationId).subscribe({
          next: (conversation: any) => {

            const sorted = [...(conversation?.messages ?? [])]
              .sort(
                (a, b) =>
                  new Date(a.sentDate).getTime() -
                  new Date(b.sentDate).getTime()
              );

            this.batchGroupMessages.set(sorted);

            this.api
              .markConversationAsRead(group.conversationId, uid)
              .subscribe({ error: () => {} });

            this.loadingBatch.set(false);
            this.batchLoaded.set(true);
          },
          error: () => {
            this.loadingBatch.set(false);
            this.batchLoaded.set(true);
          }
        });
      },
      error: (err: any) => {
        console.error('Error loading batch group:', err);
        this.loadingBatch.set(false);
        this.batchLoaded.set(true);
      }
    });
  }


  refreshBatchGroup(): void {
    this.batchLoaded.set(false);
    this.loadBatchGroup();
  }


  // =========================================================
  // BATCH GROUP — SEND
  // =========================================================

  sendBatchMessage(): void {
    const text = this.batchMessageText.trim();
    const conversationId = this.batchGroupConversationId();
    const uid = this.auth.userId;

    if (!text || !conversationId || !uid) return;

    this.api.sendMessage(conversationId, {
      senderId: uid,
      content: text
    }).subscribe({
      next: (saved: any) => {
        const current = this.batchGroupMessages();
        this.batchGroupMessages.set([
          ...current,
          saved
        ]);
        this.batchMessageText = '';
      },
      error: (err: any) => {
        console.error('Error sending batch message:', err);
        this.errorMessage.set('تعذر إرسال الرسالة');
      }
    });
  }


  // =========================================================
  // PRIVATE CHAT
  // =========================================================

  /**
   * فتح محادثة خاصة مع عضو (مدرب أو متدرب)
   */
  openPrivateChat(
    member: any,
    role: 'trainer' | 'trainee'
  ): void {

    const uid = this.auth.userId;
    if (!uid) return;

    const memberUserId = Number(member?.userId);

    if (!memberUserId || Number.isNaN(memberUserId)) {
      this.errorMessage.set('لا يمكن تحديد المستخدم');
      return;
    }

    if (memberUserId === uid) {
      this.errorMessage.set('لا يمكنك مراسلة نفسك');
      return;
    }

    const memberName = member?.fullName ?? 'عضو';

    this.privateChatWith.set({
      userId: memberUserId,
      name: memberName,
      role
    });

    this.privateChatOpen.set(true);
    this.loadingPrivate.set(true);
    this.privateMessages.set([]);
    this.privateConversationId.set(null);

    // ابحث عن محادثة خاصة موجودة بيني وبين هذا العضو
    this.api.getAllParticipantConversations(uid).subscribe({
      next: (all) => {

        // نحتاج نتحقق من كل محادثة من نوع ثنائي — نأخذ القائمة
        // ثم نجلب كل واحدة ونفحص إن كان هذا العضو طرفًا فيها.
        const candidates = (all ?? []).filter(
          (c: any) =>
            c.category !== 'BatchGroup' &&
            c.type !== 'TraineeComplaint' &&
            c.category !== 'TraineeComplaint'
        );

        if (candidates.length === 0) {
          this.createPrivateConversation(memberUserId, memberName, role);
          return;
        }

        // جرّب أول محادثة تناسب الشروط ثم افحص رسائلها
        this.findOrCreatePrivate(memberUserId, memberName, role, candidates);
      },
      error: () => {
        this.createPrivateConversation(memberUserId, memberName, role);
      }
    });
  }


  private findOrCreatePrivate(
    memberUserId: number,
    memberName: string,
    role: 'trainer' | 'trainee',
    candidates: any[]
  ): void {

    const uid = this.auth.userId;
    if (!uid) return;

    // نجرّب تحميل أول محادثة، ونتحقق إن كان العضو طرفًا فيها
    const tryNext = (index: number) => {

      if (index >= candidates.length) {
        // لم نجد — ننشئ
        this.createPrivateConversation(memberUserId, memberName, role);
        return;
      }

      const candidate = candidates[index];

      this.api.getConversation(candidate.conversationId).subscribe({
        next: (conversation: any) => {

          const messages = conversation?.messages ?? [];

          const involvesMember = messages.some(
            (m: any) =>
              Number(m.senderId) === memberUserId ||
              Number(m.receiverId) === memberUserId
          );

          if (involvesMember) {
            // وجدناها
            this.loadPrivateConversation(candidate.conversationId);
            return;
          }

          tryNext(index + 1);
        },
        error: () => tryNext(index + 1)
      });
    };

    tryNext(0);
  }


  private loadPrivateConversation(conversationId: number): void {
    const uid = this.auth.userId;

    this.api.getConversation(conversationId).subscribe({
      next: (conversation: any) => {
        this.privateConversationId.set(conversationId);

        const sorted = [...(conversation?.messages ?? [])]
          .sort(
            (a, b) =>
              new Date(a.sentDate).getTime() -
              new Date(b.sentDate).getTime()
          );

        this.privateMessages.set(sorted);

        if (uid) {
          this.api
            .markConversationAsRead(conversationId, uid)
            .subscribe({ error: () => {} });
        }

        this.loadingPrivate.set(false);
      },
      error: () => {
        this.loadingPrivate.set(false);
        this.errorMessage.set('تعذر فتح المحادثة');
      }
    });
  }


  private createPrivateConversation(
    memberUserId: number,
    memberName: string,
    role: 'trainer' | 'trainee'
  ): void {

    const uid = this.auth.userId;
    if (!uid) return;

    const category =
      role === 'trainer'
        ? 'TrainerTrainee'
        : 'TraineeTrainee';

    this.api.getOrCreatePrivateConversation({
      startedByUserId: uid,
      receiverUserId: memberUserId,
      subject: `محادثة مع ${memberName}`,
      firstMessage: 'مرحبًا 👋',
      category
    }).subscribe({
      next: (conversation: any) => {
        this.privateConversationId.set(conversation.conversationId);
        const sorted = [...(conversation.messages ?? [])]
          .sort(
            (a, b) =>
              new Date(a.sentDate).getTime() -
              new Date(b.sentDate).getTime()
          );
        this.privateMessages.set(sorted);
        this.loadingPrivate.set(false);
      },
      error: (err: any) => {
        console.error('Error creating private conversation:', err);
        this.loadingPrivate.set(false);
        this.errorMessage.set('تعذر بدء المحادثة');
      }
    });
  }


  sendPrivateMessage(): void {
    const text = this.privateMessageText.trim();
    const conversationId = this.privateConversationId();
    const uid = this.auth.userId;

    if (!text || !conversationId || !uid) return;

    this.api.sendMessage(conversationId, {
      senderId: uid,
      content: text
    }).subscribe({
      next: (saved: any) => {
        const current = this.privateMessages();
        this.privateMessages.set([...current, saved]);
        this.privateMessageText = '';
      },
      error: (err: any) => {
        console.error('Error sending private message:', err);
        this.errorMessage.set('تعذر إرسال الرسالة');
      }
    });
  }


  closePrivateChat(): void {
    this.privateChatOpen.set(false);
    this.privateChatWith.set(null);
    this.privateConversationId.set(null);
    this.privateMessages.set([]);
    this.privateMessageText = '';
  }


  // =========================================================
  // Members Panel
  // =========================================================

  toggleMembersPanel(): void {
    this.showMembersPanel = !this.showMembersPanel;
  }


  // =========================================================
  // Helpers for batch UI
  // =========================================================

  isMine(message: ConversationMessageDto): boolean {
    return Number(message.senderId) === Number(this.auth.userId);
  }


  isMe(userId: number | null | undefined): boolean {
    return Number(userId) === Number(this.auth.userId);
  }


  formatTime(value: string | Date | undefined): string {
    if (!value) return '';

    const date =
      typeof value === 'string'
        ? new Date(
            /[zZ]|[+-]\d{2}:\d{2}$/.test(value)
              ? value
              : `${value}Z`
          )
        : value;

    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('ar-OM', {
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  }


  batchMembersCount = computed(() =>
    this.batchTrainers().length + this.batchTrainees().length
  );


  // =========================================================
  // File
  // =========================================================

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      this.errorMessage.set('حجم الملف يجب ألا يتجاوز 10MB');
      this.selectedFile = null;
      input.value = '';
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg'
    ];

    if (!allowedTypes.includes(file.type)) {
      this.errorMessage.set('يسمح فقط بصورة PNG أو JPG أو JPEG أو ملف PDF');
      this.selectedFile = null;
      input.value = '';
      return;
    }

    this.errorMessage.set('');
    this.selectedFile = file;
  }


  removeFile(event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedFile = null;
  }


  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  }


  // =========================================================
  // Receiver Change
  // =========================================================

  onReceiverChange(): void {
    this.newConv.subject = '';
    this.newConv.note = '';
    this.newConv.firstMessage = '';
    this.newConv.trainerId = null;
    this.selectedFile = null;
    this.errorMessage.set('');
  }


  private getSelectedTrainer(): TrainerDto | undefined {
    const trainerId = this.newConv.trainerId;
    if (!trainerId) return undefined;
    return this.trainers().find(
      t => Number(t.trainerId) === Number(trainerId)
    );
  }


  getReceiverLabel(conversation: any): string {
    if (!conversation) return '';
    const raw =
      conversation?.receiverType ??
      conversation?.recipientType ??
      conversation?.targetType ??
      '';
    const receiverType = String(raw).trim().toLowerCase();

    if (receiverType.includes('authority') || receiverType.includes('هيئة')) {
      return 'هيئة تنظيم الاتصالات';
    }
    if (receiverType.includes('trainer') || receiverType.includes('مدرب')) {
      const name =
        conversation?.receiverTrainerName ??
        conversation?.trainerName ??
        '';
      return name ? String(name) : 'المدرب';
    }
    if (receiverType.includes('company') || receiverType.includes('شركة')) {
      const name =
        conversation?.receiverCompanyName ??
        conversation?.companyName ??
        this.companyName();
      return name ? `الشركة - ${name}` : 'الشركة';
    }
    return '';
  }


  // =========================================================
  // Validate
  // =========================================================

  canSubmit(): boolean {
    if (!this.newConv.receiverType) return false;

    if (this.newConv.receiverType === 'Trainer') {
      return (
        !!this.newConv.trainerId &&
        !!this.newConv.subject.trim() &&
        !!this.newConv.note.trim()
      );
    }
    if (this.newConv.receiverType === 'Company') {
      return (
        !!this.newConv.subject.trim() &&
        !!this.newConv.note.trim()
      );
    }
    if (this.newConv.receiverType === 'Authority') {
      return (
        !!this.newConv.subject.trim() &&
        !!this.newConv.firstMessage.trim()
      );
    }
    return false;
  }


  // =========================================================
  // Send Reply (existing)
  // =========================================================

  send(): void {
    const conversation = this.active();
    if (!conversation || !this.replyText.trim()) return;

    const uid = this.auth.userId;
    if (!uid) return;

    this.api.sendMessage(conversation.conversationId, {
      senderId: uid,
      content: this.replyText.trim()
    }).subscribe({
      next: () => {
        this.replyText = '';
        this.open(conversation.conversationId);
      },
      error: () => this.errorMessage.set('تعذر إرسال الرد')
    });
  }


  // =========================================================
  // Start Conversation (existing)
  // =========================================================

  startConversation(): void {
    if (this.isSubmitting()) return;

    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.newConv.receiverType) {
      this.errorMessage.set('يرجى اختيار الجهة المستلمة أولاً');
      return;
    }

    if (
      this.newConv.receiverType === 'Trainer' &&
      !this.newConv.trainerId
    ) {
      this.errorMessage.set('يرجى اختيار المدرب');
      return;
    }

    if (!this.newConv.subject.trim()) {
      this.errorMessage.set('يرجى كتابة نوع الطلب');
      return;
    }

    if (
      (this.newConv.receiverType === 'Trainer' ||
        this.newConv.receiverType === 'Company') &&
      !this.newConv.note.trim()
    ) {
      this.errorMessage.set('يرجى كتابة الملاحظة');
      return;
    }

    if (
      this.newConv.receiverType === 'Authority' &&
      !this.newConv.firstMessage.trim()
    ) {
      this.errorMessage.set('يرجى كتابة تفاصيل الطلب');
      return;
    }

    const uid = this.auth.userId;
    if (!uid) {
      this.errorMessage.set('تعذر تحديد المستخدم الحالي');
      return;
    }

    const selectedTrainer = this.getSelectedTrainer();

    const messageContent =
      this.newConv.receiverType === 'Trainer' ||
      this.newConv.receiverType === 'Company'
        ? this.newConv.note.trim()
        : this.newConv.firstMessage.trim();

    const payload = {
      type: 'TraineeComplaint',
      receiverType: this.newConv.receiverType,
      receiverTrainerId:
        this.newConv.receiverType === 'Trainer'
          ? this.newConv.trainerId
          : null,
      receiverTrainerName:
        this.newConv.receiverType === 'Trainer'
          ? (selectedTrainer?.fullName ?? '')
          : null,
      subject: this.newConv.subject.trim(),
      note:
        this.newConv.receiverType === 'Trainer' ||
        this.newConv.receiverType === 'Company'
          ? this.newConv.note.trim()
          : '',
      firstMessage: messageContent,
      startedByUserId: uid,
      attachment: this.selectedFile
    };

    this.isSubmitting.set(true);

    this.api.startConversation(payload).subscribe({
      next: () => {
        this.successMessage.set('تم إرسال الطلب بنجاح');
        this.newConv = {
          receiverType: '',
          trainerId: null,
          subject: '',
          note: '',
          firstMessage: ''
        };
        this.selectedFile = null;
        this.loadConversations();
        this.isSubmitting.set(false);
        setTimeout(() => this.successMessage.set(''), 4000);
      },
      error: (err: any) => {
        console.error('Error sending request:', err);
        let message =
          'حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى';
        if (err?.error?.message) message = err.error.message;
        this.errorMessage.set(message);
        this.isSubmitting.set(false);
      }
    });
  }
}