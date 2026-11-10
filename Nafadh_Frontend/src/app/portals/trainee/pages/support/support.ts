
import { administrativeValue } from '../../../../core/models/administrative-constants';
import { NafadhConstantsService } from '../../../../core/services/nafadh-constants.service';

import {
  Component,
  OnInit,
  signal,
  computed,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  forkJoin,
  of,
  firstValueFrom
} from 'rxjs';

import { catchError } from 'rxjs/operators';

import { TraineeApi, TrainerInBatchDto } from '../../services/trainee-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { SystemVariablesService } from '../../../../services/system-variables.service';

import {
  ConversationDetailDto,
  ConversationMessageDto,
  TraineeProfileDto,
  EnrollmentDto,
  TrainerDto,
  BatchDto,
  WithdrawalRequestDto
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

  readonly constants = inject(NafadhConstantsService);

  // =========================================================
  // ACTIVE TAB
  // =========================================================

  activeTab = signal<SupportTab>('messages');

  // =========================================================
  // CONVERSATIONS
  // =========================================================

  conversations = signal<any[]>([]);

  active = signal<ConversationDetailDto | null>(null);

  // =========================================================
  // WITHDRAWAL REQUESTS
  // =========================================================

  withdrawalRequests = signal<WithdrawalRequestDto[]>([]);

  // =========================================================
  // TRAINEE
  // =========================================================

  traineeId = signal<number | null>(null);

  traineeName = signal<string>('المتدرب');

  enrollment = signal<EnrollmentDto | null>(null);

  // =========================================================
  // COMPANY
  // =========================================================

  companyName = signal('');

  // =========================================================
  // TRAINERS
  // =========================================================

  trainers = signal<TrainerDto[]>([]);

  loadingTrainers = signal(false);

  private trainersBatchId: number | null = null;

  // =========================================================
  // UI STATE
  // =========================================================

  isSubmitting = signal(false);

  errorMessage = signal('');

  successMessage = signal('');

  // Prevent duplicate message submissions
  isSendingReply = false;
  isSendingBatchMessage = false;
  isSendingPrivateMessage = false;

  // =========================================================
  // REPLY
  // =========================================================

  replyText = '';

  // =========================================================
  // NEW REQUEST
  // =========================================================

  newConv = {
    receiverType: '',
    trainerId: null as number | null,
    subject: '',
    note: '',
    firstMessage: ''
  };

  // =========================================================
  // ATTACHMENTS
  // =========================================================

  selectedFile: File | null = null;

  allowedExtensions = signal<string[]>([]);

  maxAttachmentSizeMb = signal<number>(0);

  attachmentSettingsLoaded = signal(false);

  attachmentSizeError = signal('');

  attachmentTypeError = signal('');

  // =========================================================
  // AUTHORITY SUBJECTS
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

  batchName = signal('');

  batchGroupConversationId = signal<number | null>(null);

  batchGroupMessages = signal<ConversationMessageDto[]>([]);

  batchTrainers = signal<TrainerDto[]>([]);

  batchTrainees = signal<TraineeProfileDto[]>([]);

  loadingBatch = signal(false);

  batchLoaded = signal(false);

  batchMessageText = '';

  showMembersPanel = false;

  // =========================================================
  // PRIVATE CHAT STATE
  // =========================================================

  privateChatOpen = signal(false);

  privateChatWith = signal<{
    userId: number;
    name: string;
    role: 'trainer' | 'trainee';
  } | null>(null);

  privateConversationId = signal<number | null>(null);

  privateMessages = signal<ConversationMessageDto[]>([]);

  privateMessageText = '';

  loadingPrivate = signal(false);

  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(
    private api: TraineeApi,
    public auth: AuthService,
    private systemVariablesService: SystemVariablesService
  ) {}

  // =========================================================
  // INITIALIZATION
  // =========================================================

  ngOnInit(): void {
    this.constants.ensure(
      'NFD_WDR_STAT',
      'NFD_TIC_STAT'
    );

    this.loadConversations();
    this.loadCurrentTraineeData();
    void this.loadAttachmentSettings();
  }

  // =========================================================
  // ATTACHMENT SETTINGS
  // =========================================================

  private async loadAttachmentSettings(): Promise<void> {

    this.attachmentSettingsLoaded.set(false);

    try {
      const [extensions, maxSize] = await Promise.all([
        firstValueFrom(
          this.systemVariablesService.getAllowedExtensions()
        ),
        firstValueFrom(
          this.systemVariablesService.getMaxAttachmentSizeMb()
        )
      ]);

      const normalizedExtensions = (
        Array.isArray(extensions) ? extensions : []
      )
        .map(extension =>
          String(extension).trim().replace(/^\./, '').toLowerCase()
        )
        .filter(extension => extension.length > 0);

      const normalizedMaxSize = Number(maxSize);

      if (
        normalizedExtensions.length === 0 ||
        !Number.isFinite(normalizedMaxSize) ||
        normalizedMaxSize <= 0
      ) {
        throw new Error('Invalid attachment settings');
      }

      this.allowedExtensions.set(normalizedExtensions);

      this.maxAttachmentSizeMb.set(normalizedMaxSize);

      this.attachmentSizeError.set(
        `حجم الملف يتجاوز الحد المسموح (${normalizedMaxSize} MB)`
      );

      this.attachmentTypeError.set(
        'نوع الملف غير مسموح. الامتدادات المقبولة: ' +
        normalizedExtensions.join(', ')
      );

      this.attachmentSettingsLoaded.set(true);

      // Optional custom error messages
      const [sizeMessage, typeMessage] = await Promise.all([
        firstValueFrom(
          this.systemVariablesService
            .getErrorMessage('ATTACHMENT_SIZE_ERROR')
            .pipe(catchError(() => of('')))
        ),
        firstValueFrom(
          this.systemVariablesService
            .getErrorMessage('ATTACHMENT_TYPE_ERROR')
            .pipe(catchError(() => of('')))
        )
      ]);

      if (typeof sizeMessage === 'string' && sizeMessage.trim()) {
        this.attachmentSizeError.set(sizeMessage);
      }

      if (typeof typeMessage === 'string' && typeMessage.trim()) {
        this.attachmentTypeError.set(typeMessage);
      }

      if (
        this.errorMessage() ===
        'تعذر تحميل إعدادات المرفقات، يرجى تحديث الصفحة والمحاولة مجددًا'
      ) {
        this.errorMessage.set('');
      }

    } catch (error) {

      console.error(
        'Error loading attachment settings:',
        error
      );

      this.allowedExtensions.set([]);
      this.maxAttachmentSizeMb.set(0);
      this.attachmentSettingsLoaded.set(false);

      // Do not block text-only support requests.
      // File validation will block attachments until settings load.
      this.errorMessage.set(
        'تعذر تحميل إعدادات المرفقات، يرجى تحديث الصفحة والمحاولة مجددًا'
      );
    }
  }

  // NEXT PART CONTINUES INSIDE THIS CLASS

  // =========================================================
  // TABS
  // =========================================================

  setTab(tab: SupportTab): void {
    this.activeTab.set(tab);
    this.errorMessage.set('');

    if (
      tab === 'batch' &&
      !this.batchLoaded() &&
      !this.loadingBatch()
    ) {
      if (this.enrollment()) {
        this.loadBatchGroup();
      }
      // If enrollment is still loading, the enrollment
      // loader will initialize the batch group later.
    }
  }

  // =========================================================
  // WITHDRAWAL REQUEST HELPERS
  // =========================================================

  isWithdrawalRequest(conversation: any): boolean {
    return (
      conversation?.isWithdrawal === true &&
      conversation?.originalRequest != null
    );
  }

  getWithdrawalStatus(
    conversation: any
  ): 'pending' | 'approved' | 'rejected' | null {

    if (!this.isWithdrawalRequest(conversation)) {
      return null;
    }

    const request = conversation.originalRequest;

    if (!request) {
      return null;
    }

    const status = administrativeValue(
      'NFD_WDR_STAT',
      request.status
    )?.key;

    switch (status) {
      case 'Pending':
        return 'pending';

      case 'Approved':
        return 'approved';

      case 'Rejected':
        return 'rejected';

      default:
        return null;
    }
  }

  // =========================================================
  // CURRENT TRAINEE DATA
  // =========================================================

  private loadCurrentTraineeData(): void {
    const userId = this.auth.userId;

    if (!userId) {
      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي'
      );
      return;
    }

    this.api.getTrainee(userId).subscribe({
      next: (trainee: TraineeProfileDto) => {
        const id = Number(trainee?.traineeId);

        if (!Number.isFinite(id) || id <= 0) {
          this.errorMessage.set(
            'تعذر تحديد بيانات المتدرب'
          );
          return;
        }

        this.traineeId.set(id);

        if (trainee.fullName?.trim()) {
          this.traineeName.set(trainee.fullName);
        }

        this.loadTraineeEnrollment(id);
        this.loadWithdrawalRequests(id);
      },

      error: (error: any) => {
        console.error(
          'Error loading trainee:',
          error
        );

        this.companyName.set('');
        this.trainers.set([]);

        this.errorMessage.set(
          'تعذر تحميل بيانات المتدرب'
        );
      }
    });
  }

  // =========================================================
  // WITHDRAWAL REQUESTS
  // =========================================================

  private loadWithdrawalRequests(traineeId: number): void {
    this.api.getTraineeWithdrawalRequests(traineeId).subscribe({
      next: (requests: WithdrawalRequestDto[]) => {
        this.withdrawalRequests.set(
          Array.isArray(requests) ? requests : []
        );

        this.updateConversationsList();
      },

      error: (error: any) => {
        console.error(
          'Error loading withdrawal requests:',
          error
        );

        this.withdrawalRequests.set([]);

        // Keep the complaints visible even if the
        // withdrawal endpoint fails.
        this.updateConversationsList();
      }
    });
  }

  // =========================================================
  // CONVERSATIONS
  // =========================================================

  private loadConversations(): void {
    this.updateConversationsList();
  }

  private updateConversationsList(): void {
    const userId = this.auth.userId;

    if (!userId) {
      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي'
      );
      return;
    }

    this.api.getConversations(userId).subscribe({
      next: (data: any[]) => {
        const allConversations = Array.isArray(data)
          ? data
          : [];

        const complaints = allConversations.filter(
          (conversation: any) =>
            conversation.type === 'TraineeComplaint' ||
            conversation.conversationType === 'TraineeComplaint'
        );

        const withdrawalItems = this.withdrawalRequests().map(
          (request: WithdrawalRequestDto) => ({
            conversationId: Number(request.id) + 1000000,
            subject: 'طلب انسحاب',
            startedByName: this.traineeName(),
            lastMessagePreview: request.reason ?? '',
            isWithdrawal: true,
            originalRequest: request
          })
        );

        this.conversations.set([
          ...withdrawalItems,
          ...complaints
        ]);

        const current = this.active();

        if (current) {
          const stillExists = this.conversations().some(
            (conversation: any) =>
              Number(conversation.conversationId) ===
              Number(current.conversationId)
          );

          if (!stillExists) {
            this.active.set(null);
            this.replyText = '';
          }
        }
      },

      error: (error: any) => {
        console.error(
          'Error loading conversations:',
          error
        );

        this.errorMessage.set(
          'تعذر تحميل الشكاوى والمراسلات'
        );
      }
    });
  }

  // =========================================================
  // TRAINEE ENROLLMENT
  // =========================================================

  private loadTraineeEnrollment(traineeId: number): void {
    this.api.getEnrollmentsByTrainee(traineeId).subscribe({
      next: (enrollments: EnrollmentDto[]) => {

        if (
          !Array.isArray(enrollments) ||
          enrollments.length === 0
        ) {
          this.enrollment.set(null);
          this.companyName.set('');
          this.trainers.set([]);
          this.batchTrainers.set([]);
          this.trainersBatchId = null;

          if (this.activeTab() === 'batch') {
            this.batchLoaded.set(true);
          }

          return;
        }

        // Select the current active enrollment.
        // If there is no active enrollment, preserve
        // the existing fallback to the first enrollment.
        const activeEnrollment =
          enrollments.find(
            (e: EnrollmentDto) =>
              e.completionStatus === 'Active' ||
              e.completionStatus === 'InProgress'
          ) || enrollments[0];

        console.log(
          'Support - Selected Enrollment:',
          activeEnrollment
        );

        this.enrollment.set(activeEnrollment);

        // Company must belong to the selected enrollment.
        const selectedCompanyName = String(
          activeEnrollment.companyName ?? ''
        ).trim();

        this.companyName.set(selectedCompanyName);

        // Trainers must belong to the selected batch.
        const batchId = Number(
          activeEnrollment.batchId
        );

        if (
          Number.isFinite(batchId) &&
          batchId > 0
        ) {
          this.loadTrainersByBatch(batchId);

          if (
            this.activeTab() === 'batch' &&
            !this.loadingBatch()
          ) {
            this.batchLoaded.set(false);
            this.loadBatchGroup();
          }

        } else {
          this.trainers.set([]);
          this.batchTrainers.set([]);
          this.trainersBatchId = null;

          if (this.activeTab() === 'batch') {
            this.batchLoaded.set(true);
          }
        }
      },

      error: (error: any) => {
        console.error(
          'Error loading enrollment:',
          error
        );

        this.enrollment.set(null);
        this.companyName.set('');
        this.trainers.set([]);
        this.batchTrainers.set([]);
        this.trainersBatchId = null;

        if (this.activeTab() === 'batch') {
          this.batchLoaded.set(true);
        }
      }
    });
  }

  // =========================================================
  // TRAINERS BY BATCH
  // =========================================================

  private loadTrainersByBatch(batchId: number): void {
    if (
      this.trainersBatchId === batchId &&
      (this.loadingTrainers() || this.trainers().length > 0)
    ) {
      return;
    }

    this.trainersBatchId = batchId;
    this.loadingTrainers.set(true);
    this.trainers.set([]);

    this.api.getBatchTrainers(batchId).subscribe({
      next: (response: TrainerInBatchDto[]) => {
        if (this.trainersBatchId !== batchId) {
          return;
        }

        // Remove duplicate trainers from the selected batch.
        const unique = new Map<number, TrainerInBatchDto>();

        for (const trainer of Array.isArray(response) ? response : []) {
          const id = Number(trainer.trainerId);

          if (
            Number.isFinite(id) &&
            id > 0 &&
            !unique.has(id)
          ) {
            unique.set(id, trainer);
          }
        }

        const assigned = [...unique.values()];

        if (!assigned.length) {
          this.trainers.set([]);
          this.batchTrainers.set([]);
          this.loadingTrainers.set(false);
          return;
        }

        // Load trainer details to obtain full names and user IDs.
        forkJoin(
          assigned.map(trainer =>
            this.api.getTrainer(Number(trainer.trainerId)).pipe(
              catchError(error => {
                console.warn(
                  'Could not load trainer details:',
                  trainer.trainerId,
                  error
                );

                return of(null);
              })
            )
          )
        ).subscribe({
          next: details => {
            if (this.trainersBatchId !== batchId) {
              return;
            }

            const resolved = assigned.map(
              (assignedTrainer, index) => {
                const detail = details[index];

                return {
                  ...assignedTrainer,
                  ...(detail ?? {}),
                  trainerId: Number(assignedTrainer.trainerId),
                  fullName: String(
                    detail?.fullName ||
                    assignedTrainer.trainerName ||
                    assignedTrainer.fullName ||
                    `مدرب رقم ${assignedTrainer.trainerId}`
                  ).trim()
                } as TrainerDto;
              }
            );

            this.trainers.set(resolved);
            this.batchTrainers.set(resolved);
            this.loadingTrainers.set(false);
          },

          error: error => {
            console.error(
              'Error resolving batch trainers:',
              error
            );

            if (this.trainersBatchId === batchId) {
              this.trainers.set([]);
              this.loadingTrainers.set(false);
            }
          }
        });
      },

      error: error => {
        console.error(
          'Batch trainers API error:',
          error
        );

        if (this.trainersBatchId === batchId) {
          this.trainers.set([]);
          this.loadingTrainers.set(false);

          this.errorMessage.set(
            'تعذر تحميل المدربين المرتبطين بالدفعة'
          );
        }
      }
    });
  }

  // =========================================================
  // OPEN CONVERSATION OR WITHDRAWAL REQUEST
  // =========================================================

  open(id: number): void {
    this.errorMessage.set('');
    this.replyText = '';

    const listItem = this.conversations().find(
      (conversation: any) =>
        Number(conversation.conversationId) === Number(id)
    );

    if (!listItem) {
      this.errorMessage.set(
        'المحادثة المطلوبة غير موجودة'
      );
      return;
    }

    // Withdrawal requests are displayed as virtual
    // conversations. Their messages are not persisted
    // through the normal conversation API.
    if (this.isWithdrawalRequest(listItem)) {
      const request =
        listItem.originalRequest as WithdrawalRequestDto;

      const messages: any[] = [];

      const reason = String(
        request.reason ?? ''
      ).trim();

      if (reason) {
        messages.push({
          messageId: Number(request.id),
          senderName: this.traineeName(),
          senderId: this.auth.userId,
          content: reason
        });
      }

      const adminNotes = String(
        request.adminNotes ?? ''
      ).trim();

      if (
        adminNotes &&
        adminNotes !== reason
      ) {
        messages.push({
          messageId: Number(request.id) + 999,
          senderName: 'مدير النظام',
          senderId: 0,
          content: adminNotes
        });
      }

      this.active.set({
        conversationId: id,
        subject: 'طلب انسحاب',
        receiverType: 'Authority',
        messages,
        originalRequest: request,
        isWithdrawal: true
      } as any);

      return;
    }

    // Normal conversation
    this.api.getConversation(id).subscribe({
      next: (conversation: any) => {
        const merged = {
          ...listItem,
          ...(conversation ?? {})
        };

        if (Array.isArray(merged.messages)) {
          merged.messages = [...merged.messages].sort(
            (a: any, b: any) =>
              new Date(a.sentDate ?? 0).getTime() -
              new Date(b.sentDate ?? 0).getTime()
          );
        }

        this.active.set(
          merged as ConversationDetailDto
        );

        const userId = this.auth.userId;

        if (userId) {
          this.api.markConversationAsRead(
            id,
            userId
          ).subscribe({
            error: (error: any) => {
              console.warn(
                'Could not mark conversation as read:',
                error
              );
            }
          });
        }
      },

      error: (error: any) => {
        console.error(
          'Error opening conversation:',
          error
        );

        this.errorMessage.set(
          'تعذر فتح المحادثة'
        );
      }
    });
  }

  // NEXT PART: BATCH GROUP AND PRIVATE CHAT

  // =========================================================
  // BATCH GROUP — LOAD
  // =========================================================

  loadBatchGroup(): void {
    if (this.loadingBatch()) {
      return;
    }

    const userId = this.auth.userId;
    const currentEnrollment = this.enrollment();

    if (!userId) {
      this.errorMessage.set('تعذر تحديد المستخدم الحالي');
      return;
    }

    const batchId = Number(currentEnrollment?.batchId);

    if (!Number.isFinite(batchId) || batchId <= 0) {
      this.loadingBatch.set(false);
      this.batchLoaded.set(true);
      this.batchGroupConversationId.set(null);
      this.batchGroupMessages.set([]);
      this.batchTrainers.set([]);
      this.batchTrainees.set([]);
      return;
    }

    this.loadingBatch.set(true);
    this.batchLoaded.set(false);
    this.errorMessage.set('');

    this.batchGroupConversationId.set(null);
    this.batchGroupMessages.set([]);
    this.batchTrainees.set([]);

    // Use the trainers resolved for the selected batch.
    // Do not clear the trainer list unnecessarily.
    if (this.trainersBatchId === batchId) {
      this.batchTrainers.set(this.trainers());
    } else {
      this.batchTrainers.set([]);
    }

    // =====================================================
    // LOAD BATCH DETAILS
    // =====================================================

    this.api.getBatch(batchId).subscribe({
      next: (batch: BatchDto) => {
        if (Number(this.enrollment()?.batchId) !== batchId) {
          return;
        }

        this.batchName.set(batch?.batchName ?? '');
      },

      error: (error: any) => {
        console.error('Error loading batch:', error);

        if (Number(this.enrollment()?.batchId) === batchId) {
          this.batchName.set('');
        }
      }
    });

    // =====================================================
    // LOAD BATCH TRAINERS
    // =====================================================

    this.loadTrainersByBatch(batchId);

    // =====================================================
    // LOAD BATCH TRAINEES
    // =====================================================

    this.api.getBatchTrainees(batchId).subscribe({
      next: (trainees: TraineeProfileDto[]) => {
        if (Number(this.enrollment()?.batchId) !== batchId) {
          return;
        }

        this.batchTrainees.set(
          Array.isArray(trainees) ? trainees : []
        );
      },

      error: (error: any) => {
        console.error(
          'Error loading batch trainees:',
          error
        );

        if (Number(this.enrollment()?.batchId) === batchId) {
          this.batchTrainees.set([]);
        }
      }
    });

    // =====================================================
    // FIND BATCH GROUP CONVERSATION
    // =====================================================

    this.api.getAllParticipantConversations(userId).subscribe({
      next: (all: any[]) => {
        if (Number(this.enrollment()?.batchId) !== batchId) {
          return;
        }

        const group = (Array.isArray(all) ? all : []).find(
          (conversation: any) =>
            conversation.category === 'BatchGroup' &&
            Number(conversation.batchId) === batchId
        );

        if (!group) {
          this.loadingBatch.set(false);
          this.batchLoaded.set(true);
          return;
        }

        const conversationId = Number(group.conversationId);

        if (
          !Number.isFinite(conversationId) ||
          conversationId <= 0
        ) {
          this.loadingBatch.set(false);
          this.batchLoaded.set(true);
          return;
        }

        this.batchGroupConversationId.set(conversationId);

        // =================================================
        // LOAD GROUP MESSAGES
        // =================================================

        this.api.getConversation(conversationId).subscribe({
          next: (conversation: any) => {
            if (
              Number(this.enrollment()?.batchId) !== batchId ||
              this.batchGroupConversationId() !== conversationId
            ) {
              return;
            }

            const messages = [
              ...(conversation?.messages ?? [])
            ].sort(
              (a: any, b: any) =>
                new Date(a.sentDate ?? 0).getTime() -
                new Date(b.sentDate ?? 0).getTime()
            );

            this.batchGroupMessages.set(messages);

            this.api.markConversationAsRead(
              conversationId,
              userId
            ).subscribe({
              error: (error: any) => {
                console.warn(
                  'Could not mark batch conversation as read:',
                  error
                );
              }
            });

            this.loadingBatch.set(false);
            this.batchLoaded.set(true);
          },

          error: (error: any) => {
            console.error(
              'Error loading batch conversation:',
              error
            );

            if (Number(this.enrollment()?.batchId) === batchId) {
              this.loadingBatch.set(false);
              this.batchLoaded.set(true);

              this.errorMessage.set(
                'تعذر تحميل رسائل مجموعة الدفعة'
              );
            }
          }
        });
      },

      error: (error: any) => {
        console.error(
          'Error loading participant conversations:',
          error
        );

        if (Number(this.enrollment()?.batchId) === batchId) {
          this.loadingBatch.set(false);
          this.batchLoaded.set(true);

          this.errorMessage.set(
            'تعذر تحميل محادثة مجموعة الدفعة'
          );
        }
      }
    });
  }

  // =========================================================
  // BATCH GROUP — REFRESH
  // =========================================================

  refreshBatchGroup(): void {
    if (this.loadingBatch()) {
      return;
    }

    this.batchLoaded.set(false);
    this.loadBatchGroup();
  }

  // =========================================================
  // BATCH GROUP — SEND MESSAGE
  // =========================================================

  sendBatchMessage(): void {
    if (this.isSendingBatchMessage) {
      return;
    }

    const content = this.batchMessageText.trim();
    const conversationId = this.batchGroupConversationId();
    const userId = this.auth.userId;

    if (!content || !conversationId || !userId) {
      return;
    }

    this.errorMessage.set('');
    this.isSendingBatchMessage = true;

    this.api.sendMessage(conversationId, {
      senderId: userId,
      content
    }).subscribe({
      next: (saved: ConversationMessageDto) => {
        this.batchGroupMessages.update(
          messages => [...messages, saved]
        );

        // Do not erase text entered while the request was pending.
        if (this.batchMessageText.trim() === content) {
          this.batchMessageText = '';
        }

        this.isSendingBatchMessage = false;
      },

      error: (error: any) => {
        console.error(
          'Error sending batch message:',
          error
        );

        this.errorMessage.set(
          'تعذر إرسال الرسالة إلى مجموعة الدفعة'
        );

        this.isSendingBatchMessage = false;
      }
    });
  }

  // NEXT PART: PRIVATE CHAT

  // =========================================================
  // PRIVATE CHAT — OPEN
  // =========================================================

  openPrivateChat(
    member: any,
    role: 'trainer' | 'trainee'
  ): void {
    const userId = this.auth.userId;

    if (!userId) {
      this.errorMessage.set('تعذر تحديد المستخدم الحالي');
      return;
    }

    const memberUserId = Number(member?.userId);

    if (
      !Number.isFinite(memberUserId) ||
      memberUserId <= 0
    ) {
      this.errorMessage.set(
        'لا يمكن تحديد المستخدم المطلوب'
      );
      return;
    }

    if (memberUserId === Number(userId)) {
      this.errorMessage.set(
        'لا يمكنك مراسلة نفسك'
      );
      return;
    }

    const memberName =
      String(member?.fullName ?? '').trim() || 'عضو';

    this.errorMessage.set('');

    this.privateChatWith.set({
      userId: memberUserId,
      name: memberName,
      role
    });

    this.privateChatOpen.set(true);
    this.loadingPrivate.set(true);

    this.privateMessages.set([]);
    this.privateConversationId.set(null);
    this.privateMessageText = '';

    this.api.getAllParticipantConversations(userId).subscribe({
      next: (all: any[]) => {
        // Ignore stale responses if the user switched chats.
        if (
          this.privateChatWith()?.userId !== memberUserId ||
          !this.privateChatOpen()
        ) {
          return;
        }

        const candidates = (all ?? []).filter(
          (conversation: any) =>
            conversation.category !== 'BatchGroup' &&
            conversation.type !== 'TraineeComplaint' &&
            conversation.conversationType !== 'TraineeComplaint' &&
            conversation.category !== 'TraineeComplaint'
        );

        if (candidates.length === 0) {
          this.createPrivateConversation(
            memberUserId,
            memberName,
            role
          );
          return;
        }

        this.findOrCreatePrivate(
          memberUserId,
          memberName,
          role,
          candidates
        );
      },

      error: (error: any) => {
        console.error(
          'Error loading private conversations:',
          error
        );

        if (this.privateChatWith()?.userId === memberUserId) {
          this.loadingPrivate.set(false);

          this.errorMessage.set(
            'تعذر التحقق من المحادثات الخاصة، يرجى المحاولة مجددًا'
          );
        }
      }
    });
  }

  // =========================================================
  // PRIVATE CHAT — FIND EXISTING OR CREATE
  // =========================================================

  private findOrCreatePrivate(
    memberUserId: number,
    memberName: string,
    role: 'trainer' | 'trainee',
    candidates: any[]
  ): void {
    const userId = this.auth.userId;

    if (!userId) {
      this.loadingPrivate.set(false);
      return;
    }

    const tryNext = (index: number): void => {
      if (
        !this.privateChatOpen() ||
        this.privateChatWith()?.userId !== memberUserId
      ) {
        return;
      }

      if (index >= candidates.length) {
        this.createPrivateConversation(
          memberUserId,
          memberName,
          role
        );
        return;
      }

      const candidate = candidates[index];
      const conversationId = Number(
        candidate?.conversationId
      );

      if (
        !Number.isFinite(conversationId) ||
        conversationId <= 0
      ) {
        tryNext(index + 1);
        return;
      }

      this.api.getConversation(conversationId).subscribe({
        next: (conversation: any) => {
          if (
            !this.privateChatOpen() ||
            this.privateChatWith()?.userId !== memberUserId
          ) {
            return;
          }

          const messages = conversation?.messages ?? [];

          // Preserve the existing matching logic.
          // The backend should ideally expose participant IDs
          // so the match can be verified independently of messages.
          const involvesMember = messages.some(
            (message: any) =>
              Number(message.senderId) === memberUserId ||
              Number(message.receiverId) === memberUserId
          );

          if (involvesMember) {
            this.loadPrivateConversation(conversationId);
            return;
          }

          tryNext(index + 1);
        },

        error: (error: any) => {
          console.error(
            'Error checking private conversation:',
            error
          );

          // Do not create a duplicate conversation when
          // an existing conversation cannot be inspected.
          this.loadingPrivate.set(false);

          this.errorMessage.set(
            'تعذر التحقق من المحادثات الخاصة'
          );
        }
      });
    };

    tryNext(0);
  }

  // =========================================================
  // PRIVATE CHAT — LOAD CONVERSATION
  // =========================================================

  private loadPrivateConversation(
    conversationId: number
  ): void {
    const userId = this.auth.userId;
    const requestedMemberId = this.privateChatWith()?.userId;

    this.api.getConversation(conversationId).subscribe({
      next: (conversation: any) => {
        if (
          !this.privateChatOpen() ||
          this.privateChatWith()?.userId !== requestedMemberId
        ) {
          return;
        }

        const messages = [
          ...(conversation?.messages ?? [])
        ].sort(
          (a: any, b: any) =>
            new Date(a.sentDate ?? 0).getTime() -
            new Date(b.sentDate ?? 0).getTime()
        );

        this.privateConversationId.set(conversationId);
        this.privateMessages.set(messages);

        if (userId) {
          this.api.markConversationAsRead(
            conversationId,
            userId
          ).subscribe({
            error: (error: any) => {
              console.warn(
                'Could not mark private conversation as read:',
                error
              );
            }
          });
        }

        this.loadingPrivate.set(false);
      },

      error: (error: any) => {
        console.error(
          'Error loading private conversation:',
          error
        );

        this.loadingPrivate.set(false);

        this.errorMessage.set(
          'تعذر فتح المحادثة الخاصة'
        );
      }
    });
  }

  // NEXT PART: PRIVATE CHAT — CREATE, SEND AND CLOSE

  // =========================================================
  // PRIVATE CHAT — CREATE
  // =========================================================

  private createPrivateConversation(
    memberUserId: number,
    memberName: string,
    role: 'trainer' | 'trainee'
  ): void {
    const userId = this.auth.userId;

    if (!userId) {
      this.loadingPrivate.set(false);
      return;
    }

    const category =
      role === 'trainer'
        ? 'TrainerTrainee'
        : 'TraineeTrainee';

    this.api.getOrCreatePrivateConversation({
      startedByUserId: userId,
      receiverUserId: memberUserId,
      subject: `محادثة مع ${memberName}`,
      firstMessage: 'مرحبًا 👋',
      category
    }).subscribe({
      next: (conversation: any) => {
        if (
          !this.privateChatOpen() ||
          this.privateChatWith()?.userId !== memberUserId
        ) {
          return;
        }

        const conversationId = Number(
          conversation?.conversationId
        );

        if (
          !Number.isFinite(conversationId) ||
          conversationId <= 0
        ) {
          this.loadingPrivate.set(false);
          this.errorMessage.set(
            'تعذر تحديد المحادثة الجديدة'
          );
          return;
        }

        const messages = [
          ...(conversation?.messages ?? [])
        ].sort(
          (a: any, b: any) =>
            new Date(a.sentDate ?? 0).getTime() -
            new Date(b.sentDate ?? 0).getTime()
        );

        this.privateConversationId.set(conversationId);
        this.privateMessages.set(messages);
        this.loadingPrivate.set(false);
      },

      error: (error: any) => {
        console.error(
          'Error creating private conversation:',
          error
        );

        this.loadingPrivate.set(false);

        this.errorMessage.set(
          'تعذر بدء المحادثة الخاصة'
        );
      }
    });
  }

  // =========================================================
  // PRIVATE CHAT — SEND MESSAGE
  // =========================================================

  sendPrivateMessage(): void {
    if (this.isSendingPrivateMessage) {
      return;
    }

    const content = this.privateMessageText.trim();
    const conversationId = this.privateConversationId();
    const userId = this.auth.userId;

    if (!content || !conversationId || !userId) {
      return;
    }

    this.errorMessage.set('');
    this.isSendingPrivateMessage = true;

    this.api.sendMessage(conversationId, {
      senderId: userId,
      content
    }).subscribe({
      next: (saved: ConversationMessageDto) => {
        // Do not append to another chat if the user switched.
        if (
          this.privateChatOpen() &&
          this.privateConversationId() === conversationId
        ) {
          this.privateMessages.update(
            messages => [...messages, saved]
          );

          if (this.privateMessageText.trim() === content) {
            this.privateMessageText = '';
          }
        }

        this.isSendingPrivateMessage = false;
      },

      error: (error: any) => {
        console.error(
          'Error sending private message:',
          error
        );

        this.errorMessage.set(
          'تعذر إرسال الرسالة الخاصة'
        );

        this.isSendingPrivateMessage = false;
      }
    });
  }

  // =========================================================
  // PRIVATE CHAT — CLOSE
  // =========================================================

  closePrivateChat(): void {
    this.privateChatOpen.set(false);
    this.privateChatWith.set(null);

    this.privateConversationId.set(null);
    this.privateMessages.set([]);

    this.privateMessageText = '';
    this.loadingPrivate.set(false);
  }

  // =========================================================
  // MEMBERS PANEL
  // =========================================================

  toggleMembersPanel(): void {
    this.showMembersPanel = !this.showMembersPanel;
  }

  // =========================================================
  // MESSAGE HELPERS
  // =========================================================

  isMine(message: ConversationMessageDto): boolean {
    return (
      Number(message.senderId) ===
      Number(this.auth.userId)
    );
  }

  isMe(userId: number | null | undefined): boolean {
    if (userId == null || this.auth.userId == null) {
      return false;
    }

    return Number(userId) === Number(this.auth.userId);
  }

  formatTime(value: string | Date | undefined): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date
      ? value
      : new Date(
          /[zZ]|[+-]\d{2}:\d{2}$/.test(value)
            ? value
            : `${value}Z`
        );

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('ar-OM', {
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  }

  // =========================================================
  // BATCH MEMBERS COUNT
  // =========================================================

  batchMembersCount = computed(() =>
    this.batchTrainers().length +
    this.batchTrainees().length
  );

  // NEXT PART: FILE VALIDATION, FORM SUBMISSION AND REPLIES

  // =========================================================
  // RECEIVER CHANGE
  // =========================================================

  onReceiverChange(): void {
    this.newConv.trainerId = null;
    this.newConv.subject = '';
    this.newConv.note = '';
    this.newConv.firstMessage = '';

    this.selectedFile = null;

    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.newConv.receiverType === 'Trainer') {
      const batchId = Number(this.enrollment()?.batchId);

      if (Number.isFinite(batchId) && batchId > 0) {
        this.loadTrainersByBatch(batchId);
      } else {
        this.trainers.set([]);
        this.errorMessage.set(
          'لا توجد دفعة تدريبية مرتبطة بالمتدرب'
        );
      }
    }

    if (
      this.newConv.receiverType === 'Company' &&
      !this.companyName().trim()
    ) {
      this.errorMessage.set(
        'لا توجد شركة مرتبطة بالتسجيل التدريبي الحالي'
      );
    }
  }

  // =========================================================
  // FILE SIZE FORMAT
  // =========================================================

  formatFileSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) {
      return '0 B';
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  // =========================================================
  // FILE SELECTION
  // =========================================================

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.validateAndSelectFile(file);
    }

    // Allow selecting the same file again.
    input.value = '';
  }

  // =========================================================
  // FILE DRAG AND DROP
  // =========================================================

  onFileDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer?.files;

    if (!files || files.length === 0) {
      return;
    }

    if (files.length > 1) {
      this.errorMessage.set(
        'يمكن إرفاق ملف واحد فقط لكل طلب'
      );
      return;
    }

    this.validateAndSelectFile(files[0]);
  }

  // =========================================================
  // ATTACHMENT VALIDATION
  // =========================================================

  private validateAndSelectFile(file: File): void {
    this.errorMessage.set('');

    if (!this.attachmentSettingsLoaded()) {
      this.errorMessage.set(
        'إعدادات المرفقات غير متاحة حاليًا، يرجى تحديث الصفحة والمحاولة مجددًا'
      );
      return;
    }

    const maxSizeMb = this.maxAttachmentSizeMb();
    const maxBytes = maxSizeMb * 1024 * 1024;

    const fileName = file.name.trim();

    if (!fileName || fileName.startsWith('.')) {
      this.errorMessage.set(
        'اسم الملف غير صالح'
      );
      return;
    }

    const extension = fileName.includes('.')
      ? fileName.split('.').pop()?.toLowerCase() ?? ''
      : '';

    const allowedExtensions = this.allowedExtensions()
      .map(ext =>
        String(ext)
          .trim()
          .replace(/^\./, '')
          .toLowerCase()
      )
      .filter(Boolean);

    if (!extension || !allowedExtensions.includes(extension)) {
      this.errorMessage.set(
        this.attachmentTypeError() ||
        `نوع الملف غير مسموح. الامتدادات المقبولة: ${allowedExtensions.join(', ')}`
      );
      return;
    }

    if (file.size === 0) {
      this.errorMessage.set(
        'لا يمكن إرفاق ملف فارغ'
      );
      return;
    }

    if (file.size > maxBytes) {
      const message =
        this.attachmentSizeError() ||
        `حجم الملف يتجاوز الحد المسموح (${maxSizeMb} MB)`;

      this.errorMessage.set(
        message
          .replace(/\{maxSize\}/g, String(maxSizeMb))
          .replace(/\{maxSizeMb\}/g, String(maxSizeMb))
      );
      return;
    }

    this.selectedFile = file;
    this.successMessage.set('');
  }

  // =========================================================
  // REMOVE ATTACHMENT
  // =========================================================

  removeFile(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.selectedFile = null;
    this.errorMessage.set('');
  }

  // =========================================================
  // FORM VALIDATION
  // =========================================================

  canSubmit(): boolean {
    if (this.isSubmitting()) {
      return false;
    }

    const receiverType = this.newConv.receiverType;
    const subject = this.newConv.subject.trim();
    const note = this.newConv.note.trim();
    const firstMessage = this.newConv.firstMessage.trim();

    if (!receiverType || !subject) {
      return false;
    }

    switch (receiverType) {
      case 'Trainer':
        return (
          this.newConv.trainerId != null &&
          this.trainers().some(
            trainer =>
              Number(trainer.trainerId) ===
              Number(this.newConv.trainerId)
          ) &&
          note.length > 0
        );

      case 'Company':
        return (
          this.companyName().trim().length > 0 &&
          note.length > 0
        );

      case 'Authority':
        return firstMessage.length > 0;

      default:
        return false;
    }
  }

  // NEXT PART: SEND REPLY AND SUBMIT REQUEST

  // =========================================================
  // SEND REPLY
  // =========================================================

  send(): void {
    if (this.isSendingReply) {
      return;
    }

    const conversation = this.active();
    const content = this.replyText.trim();
    const userId = this.auth.userId;

    if (!conversation || !content || !userId) {
      return;
    }

    this.errorMessage.set('');

    // Withdrawal requests use a separate backend workflow.
    // Never display an unsaved reply as a persisted message.
    if ((conversation as any).isWithdrawal === true) {
      this.errorMessage.set(
        'الرد على طلب الانسحاب غير متاح من هذه المحادثة. يرجى متابعة حالة الطلب من النظام.'
      );
      return;
    }

    const conversationId = Number(
      conversation.conversationId
    );

    if (
      !Number.isFinite(conversationId) ||
      conversationId <= 0
    ) {
      this.errorMessage.set(
        'رقم المحادثة غير صالح'
      );
      return;
    }

    this.isSendingReply = true;

    this.api.sendMessage(conversationId, {
      senderId: userId,
      content
    }).subscribe({
      next: () => {
        if (
          this.active()?.conversationId === conversationId
        ) {
          if (this.replyText.trim() === content) {
            this.replyText = '';
          }

          this.open(conversationId);
        }

        this.isSendingReply = false;
      },

      error: (error: any) => {
        console.error(
          'Error sending reply:',
          error
        );

        this.errorMessage.set(
          error?.error?.message ||
          'تعذر إرسال الرد، يرجى المحاولة مجددًا'
        );

        this.isSendingReply = false;
      }
    });
  }

  // =========================================================
  // SELECTED TRAINER
  // =========================================================

  private getSelectedTrainer(): TrainerDto | undefined {
    const trainerId = this.newConv.trainerId;

    if (!trainerId) {
      return undefined;
    }

    return this.trainers().find(
      trainer =>
        Number(trainer.trainerId) === Number(trainerId)
    );
  }

  // =========================================================
  // START CONVERSATION / SUBMIT REQUEST
  // =========================================================

  startConversation(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');

    const receiverType = this.newConv.receiverType;
    const subject = this.newConv.subject.trim();

    if (!receiverType) {
      this.errorMessage.set(
        'يرجى اختيار الجهة المستلمة أولاً'
      );
      return;
    }

    if (
      !['Trainer', 'Company', 'Authority'].includes(receiverType)
    ) {
      this.errorMessage.set(
        'الجهة المستلمة غير صالحة'
      );
      return;
    }

    // =====================================================
    // VALIDATE SELECTED TRAINER
    // =====================================================

    if (receiverType === 'Trainer') {
      if (!this.newConv.trainerId) {
        this.errorMessage.set(
          'يرجى اختيار المدرب'
        );
        return;
      }

      const selectedTrainer = this.getSelectedTrainer();

      if (!selectedTrainer) {
        this.errorMessage.set(
          'المدرب المختار غير مرتبط بالدفعة التدريبية الحالية'
        );
        return;
      }
    }

    // =====================================================
    // VALIDATE COMPANY
    // =====================================================

    if (
      receiverType === 'Company' &&
      !this.companyName().trim()
    ) {
      this.errorMessage.set(
        'لا توجد شركة مرتبطة بالمتدرب حاليًا'
      );
      return;
    }

    // =====================================================
    // VALIDATE SUBJECT
    // =====================================================

    if (!subject) {
      this.errorMessage.set(
        'يرجى كتابة نوع الطلب'
      );
      return;
    }

    // =====================================================
    // VALIDATE MESSAGE CONTENT
    // =====================================================

    const messageContent =
      receiverType === 'Trainer' ||
      receiverType === 'Company'
        ? this.newConv.note.trim()
        : this.newConv.firstMessage.trim();

    if (!messageContent) {
      this.errorMessage.set(
        receiverType === 'Authority'
          ? 'يرجى كتابة تفاصيل الطلب'
          : 'يرجى كتابة الملاحظة'
      );
      return;
    }

    const userId = this.auth.userId;

    if (!userId) {
      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي'
      );
      return;
    }

    // =====================================================
    // WITHDRAWAL REQUEST
    // =====================================================

    if (
      receiverType === 'Authority' &&
      subject === 'طلب انسحاب'
    ) {
      if (this.selectedFile) {
        this.errorMessage.set(
          'إرفاق الملفات مع طلب الانسحاب غير مدعوم حاليًا'
        );
        return;
      }

      this.submitWithdrawalRequest();
      return;
    }

    // =====================================================
    // ATTACHMENT SETTINGS CHECK
    // =====================================================

    if (
      this.selectedFile &&
      !this.attachmentSettingsLoaded()
    ) {
      this.errorMessage.set(
        'إعدادات المرفقات غير متاحة حاليًا'
      );
      return;
    }

    // =====================================================
    // ATTACHMENT VALIDATION
    // =====================================================

    if (this.selectedFile) {
      const file = this.selectedFile;

      const extension =
        file.name.split('.').pop()?.toLowerCase() ?? '';

      const allowed = this.allowedExtensions().map(
        ext => ext.replace(/^\./, '').toLowerCase()
      );

      if (!allowed.includes(extension)) {
        this.errorMessage.set(
          this.attachmentTypeError() ||
          'نوع الملف غير مسموح'
        );
        return;
      }

      if (
        file.size === 0 ||
        file.size >
          this.maxAttachmentSizeMb() * 1024 * 1024
      ) {
        this.errorMessage.set(
          'حجم الملف غير صالح أو يتجاوز الحد المسموح'
        );
        return;
      }
    }

    // =====================================================
    // CREATE REQUEST PAYLOAD
    // =====================================================

    const selectedTrainer = this.getSelectedTrainer();

    const payload = {
      type: 'TraineeComplaint',
      receiverType,

      receiverTrainerId:
        receiverType === 'Trainer'
          ? this.newConv.trainerId
          : null,

      receiverTrainerName:
        receiverType === 'Trainer'
          ? selectedTrainer?.fullName ?? ''
          : null,

      subject,

      note:
        receiverType === 'Trainer' ||
        receiverType === 'Company'
          ? this.newConv.note.trim()
          : '',

      firstMessage: messageContent,

      startedByUserId: userId,

      attachment: this.selectedFile
    };

    // =====================================================
    // SEND TO BACKEND
    // =====================================================

    this.isSubmitting.set(true);

    this.api.startConversation(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);

        this.successMessage.set(
          'تم إرسال الطلب بنجاح'
        );

        this.resetForm();

        // Reload complaints and withdrawal requests
        // without losing withdrawal items.
        this.loadConversations();

        setTimeout(() => {
          if (
            this.successMessage() ===
            'تم إرسال الطلب بنجاح'
          ) {
            this.successMessage.set('');
          }
        }, 4000);
      },

      error: (error: any) => {
        console.error(
          'Error submitting support request:',
          error
        );

        const serverMessage = error?.error?.message;

        this.errorMessage.set(
          typeof serverMessage === 'string' &&
          serverMessage.trim()
            ? serverMessage
            : 'حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى'
        );

        this.isSubmitting.set(false);
      }
    });
  }

  // NEXT PART: WITHDRAWAL REQUEST AND RESET FORM

  // =========================================================
  // SUBMIT WITHDRAWAL REQUEST
  // =========================================================

  private submitWithdrawalRequest(): void {
    const traineeId = this.traineeId();

    if (!traineeId) {
      this.errorMessage.set(
        'تعذر تحديد بيانات المتدرب'
      );
      return;
    }

    if (this.withdrawalRequests().length > 0) {
      this.errorMessage.set(
        'لا يمكنك تقديم طلب انسحاب جديد. لديك طلب انسحاب مسجل مسبقًا في النظام.'
      );
      return;
    }

    const reason = this.newConv.firstMessage.trim();

    if (!reason) {
      this.errorMessage.set(
        'يرجى كتابة سبب طلب الانسحاب'
      );
      return;
    }

    this.isSubmitting.set(true);

    this.api.createWithdrawalRequest({
      traineeId,
      reason
    }).subscribe({
      next: (response: any) => {
        this.isSubmitting.set(false);

        this.successMessage.set(
          response?.message ||
          'تم تقديم طلب الانسحاب بنجاح'
        );

        this.resetForm();

        this.loadWithdrawalRequests(traineeId);

        setTimeout(() => {
          this.successMessage.set('');
        }, 4000);
      },

      error: (error: any) => {
        console.error(
          'Error submitting withdrawal request:',
          error
        );

        this.errorMessage.set(
          error?.error?.message ||
          'حدث خطأ أثناء تقديم طلب الانسحاب'
        );

        this.isSubmitting.set(false);
      }
    });
  }

  // =========================================================
  // RESET FORM
  // =========================================================

  private resetForm(): void {
    this.newConv = {
      receiverType: '',
      trainerId: null,
      subject: '',
      note: '',
      firstMessage: ''
    };

    this.selectedFile = null;
  }

}
