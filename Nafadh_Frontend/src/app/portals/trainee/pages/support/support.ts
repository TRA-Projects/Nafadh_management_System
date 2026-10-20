import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  forkJoin,
  of
} from 'rxjs';

import {
  catchError
} from 'rxjs/operators';

import { TraineeApi } from '../../services/trainee-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  ConversationDetailDto,
  ConversationListItemDto,
  TraineeProfileDto,
  EnrollmentDto,
  TrainerDto,
  WithdrawalRequestDto,
  WithdrawalRequestStatus
} from '../../../../core/models/dtos';


@Component({
  selector: 'app-trainee-support',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './support.html'
})
export class TraineeSupport implements OnInit {

  // =========================================================
  // Conversations
  // =========================================================

  conversations = signal<any[]>([]);
  active = signal<any | null>(null);

  // =========================================================
  // Withdrawal Requests
  // =========================================================

  withdrawalRequests = signal<WithdrawalRequestDto[]>([]);

  // =========================================================
  // Trainee
  // =========================================================

  traineeId = signal<number | null>(null);
  enrollment = signal<EnrollmentDto | null>(null);
  companyName = signal('');
  trainers = signal<TrainerDto[]>([]);
  loadingTrainers = signal(false);

  // =========================================================
  // UI
  // =========================================================

  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

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
  // Constructor & Init
  // =========================================================

  constructor(
    private api: TraineeApi,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCurrentTraineeData();
  }

  // =========================================================
  // Withdrawal Request Helpers
  // =========================================================

  isWithdrawalRequest(conversation: any): boolean {
    if (!conversation) return false;
    return String(conversation?.subject ?? '').trim() === 'طلب انسحاب';
  }

  getWithdrawalStatus(conversation: any): 'pending' | 'approved' | 'rejected' | null {
    if (!this.isWithdrawalRequest(conversation)) return null;

    // جلب الطلب سواء كان من القائمة المدمجة أو المحادثات
    let req: any = conversation.originalRequest;
    
    if (!req) {
      const requests = this.withdrawalRequests();
      req = requests && requests.length > 0 ? requests[0] : null;
    }

    if (!req) return 'pending';

    // تحويل الحالة إلى نص (String) لتفادي مشكلة اختلاف الحروف الكبيرة/الصغيرة أو الأرقام
    const statusStr = String(req.status).toLowerCase();

    // فحص إذا كانت الحالة (1 أو Approved أو approved)
    if (statusStr === '1' || statusStr === 'approved') {
      return 'approved';
    }
    
    // فحص إذا كانت الحالة (2 أو Rejected أو rejected)
    if (statusStr === '2' || statusStr === 'rejected') {
      return 'rejected';
    }

    // إذا كانت (0 أو Pending أو pending) أو أي شيء آخر
    return 'pending';
  }

  // =========================================================
  // Data Loaders
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
        this.loadWithdrawalRequests(traineeId);
      },
      error: (err) => {
        console.error('Error loading trainee:', err);
        this.companyName.set('');
        this.trainers.set([]);
      }
    });
  }

  private loadWithdrawalRequests(traineeId: number): void {
    (this.api as any).getTraineeWithdrawalRequests(traineeId).subscribe({
      next: (requests: WithdrawalRequestDto[]) => {
        this.withdrawalRequests.set(requests ?? []);
        this.updateConversationsList();
      },
      error: (err: any) => {
        console.error('Error loading withdrawal requests:', err);
        this.withdrawalRequests.set([]);
        this.updateConversationsList();
      }
    });
  }

  private updateConversationsList(): void {
    const uid = this.auth.userId;
    if (!uid) return;

    this.api.getConversations(uid).subscribe({
      next: (data) => {
        const all = data ?? [];
        
        const complaints = all.filter(
          (c: any) => c.type === 'TraineeComplaint' || c.conversationType === 'TraineeComplaint'
        );

        // تحويل طلبات الانسحاب لتبدو كمحادثات في القائمة
        const withdrawalItems = this.withdrawalRequests().map(w => ({
          conversationId: w.id + 1000000, // ID مميز للانسحاب
          subject: 'طلب انسحاب',
          startedByName: 'أنت',
          lastMessagePreview: w.reason,
          isWithdrawal: true,
          originalRequest: w
        }));

        // دمج القائمتين (الانسحاب تظهر أولاً)
        this.conversations.set([...withdrawalItems, ...complaints]);

        const current = this.active();
        if (current) {
          const exists = this.conversations().some(
            (c: any) => Number(c.conversationId) === Number(current.conversationId)
          );
          if (!exists) this.active.set(null);
        }
      },
      error: (err) => {
        console.error('Error loading conversations:', err);
        this.errorMessage.set('تعذر تحميل الشكاوى');
      }
    });
  }

  private loadTraineeEnrollment(traineeId: number): void {
    this.api.getEnrollmentsByTrainee(traineeId).subscribe({
      next: (enrollments: EnrollmentDto[]) => {
        if (!enrollments || enrollments.length === 0) {
          this.enrollment.set(null);
          this.companyName.set('');
          this.trainers.set([]);
          return;
        }

        const activeEnrollment = enrollments.find(e => {
          const status = String(e.completionStatus ?? '').toLowerCase();
          return status === 'active' || status === 'inprogress' || status === 'in_progress';
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
      error: (err) => {
        console.error('Error loading enrollment:', err);
        this.enrollment.set(null);
        this.companyName.set('');
        this.trainers.set([]);
      }
    });
  }

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
          const id = Number(bt.trainerId);
          if (!id || Number.isNaN(id)) return of(bt);
          return this.api.getTrainer(id).pipe(catchError(() => of(bt)));
        });

        forkJoin(requests).subscribe({
          next: (fullTrainers) => {
            this.trainers.set(fullTrainers.filter(t => t != null) as TrainerDto[]);
            this.loadingTrainers.set(false);
          },
          error: () => {
            this.trainers.set(batchTrainers);
            this.loadingTrainers.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Error loading trainers:', err);
        this.trainers.set([]);
        this.loadingTrainers.set(false);
      }
    });
  }

  // =========================================================
  // Open Item (Conversation or Withdrawal)
  // =========================================================

  open(id: number): void {
    this.errorMessage.set('');

    if (id >= 1000000) {
      const actualId = id - 1000000;
      const req = this.withdrawalRequests().find(r => r.id === actualId);
      
      if (req) {
        this.active.set({
          conversationId: id,
          subject: 'طلب انسحاب',
          receiverType: 'Authority',
          messages: [
            {
              messageId: req.id,
              senderName: 'أنت',
              senderId: this.auth.userId,
              content: req.reason
            }
          ],
          withdrawalStatus: this.getWithdrawalStatus({ originalRequest: req }),
          isWithdrawal: true
        } as any);
      }
      return;
    }

    const listConversation: any = this.conversations().find(
      c => Number(c.conversationId) === Number(id)
    );

    this.api.getConversation(id).subscribe({
      next: (conversation) => {
        const mergedConversation: any = {
          ...(listConversation ?? {}),
          ...(conversation ?? {})
        };
        this.active.set(mergedConversation as ConversationDetailDto);
      },
      error: () => {
        this.errorMessage.set('تعذر فتح المحادثة');
      }
    });
  }

  // =========================================================
  // File & Form Helpers
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

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
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

  onReceiverChange(): void {
    this.newConv.subject = '';
    this.newConv.note = '';
    this.newConv.firstMessage = '';
    this.newConv.trainerId = null;
    this.selectedFile = null;
    this.errorMessage.set('');
  }

  private getSelectedTrainer(): TrainerDto | undefined {
    const id = this.newConv.trainerId;
    if (!id) return undefined;
    return this.trainers().find(t => Number(t.trainerId) === Number(id));
  }

  canSubmit(): boolean {
    if (!this.newConv.receiverType) return false;

    if (this.newConv.receiverType === 'Trainer') {
      return !!this.newConv.trainerId && !!this.newConv.subject.trim() && !!this.newConv.note.trim();
    }
    if (this.newConv.receiverType === 'Company') {
      return !!this.newConv.subject.trim() && !!this.newConv.note.trim();
    }
    if (this.newConv.receiverType === 'Authority') {
      return !!this.newConv.subject.trim() && !!this.newConv.firstMessage.trim();
    }
    return false;
  }

  // =========================================================
  // Send Reply
  // =========================================================

  send(): void {
    const conversation = this.active();
    if (!conversation || !this.replyText.trim() || conversation.isWithdrawal) return;

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
  // Submit Logic
  // =========================================================

  startConversation(): void {
    if (this.isSubmitting()) return;
    this.errorMessage.set('');
    this.successMessage.set('');

    // التحقق من الحقول
    if (!this.newConv.receiverType) {
      this.errorMessage.set('يرجى اختيار الجهة المستلمة أولاً');
      return;
    }
    if (this.newConv.receiverType === 'Trainer' && !this.newConv.trainerId) {
      this.errorMessage.set('يرجى اختيار المدرب');
      return;
    }
    if (!this.newConv.subject.trim()) {
      this.errorMessage.set('يرجى كتابة نوع الطلب');
      return;
    }
    if ((this.newConv.receiverType === 'Trainer' || this.newConv.receiverType === 'Company') && !this.newConv.note.trim()) {
      this.errorMessage.set('يرجى كتابة الملاحظة');
      return;
    }
    if (this.newConv.receiverType === 'Authority' && !this.newConv.firstMessage.trim()) {
      this.errorMessage.set('يرجى كتابة تفاصيل الطلب');
      return;
    }

    const uid = this.auth.userId;
    if (!uid) {
      this.errorMessage.set('تعذر تحديد المستخدم الحالي');
      return;
    }

    // مسار طلب الانسحاب
    if (this.newConv.receiverType === 'Authority' && this.newConv.subject.trim() === 'طلب انسحاب') {
      this.submitWithdrawalRequest();
      return;
    }

    // مسار المحادثات العادية
    const selectedTrainer = this.getSelectedTrainer();
    const messageContent = (this.newConv.receiverType === 'Trainer' || this.newConv.receiverType === 'Company')
      ? this.newConv.note.trim()
      : this.newConv.firstMessage.trim();

    const payload = {
      type: 'TraineeComplaint',
      receiverType: this.newConv.receiverType,
      receiverTrainerId: this.newConv.receiverType === 'Trainer' ? this.newConv.trainerId : null,
      receiverTrainerName: this.newConv.receiverType === 'Trainer' ? (selectedTrainer?.fullName ?? '') : null,
      subject: this.newConv.subject.trim(),
      note: (this.newConv.receiverType === 'Trainer' || this.newConv.receiverType === 'Company') ? this.newConv.note.trim() : '',
      firstMessage: messageContent,
      startedByUserId: uid,
      attachment: this.selectedFile
    };

    this.isSubmitting.set(true);
    this.api.startConversation(payload).subscribe({
      next: () => {
        this.successMessage.set('تم إرسال الطلب بنجاح');
        this.resetForm();
        this.updateConversationsList();
        this.isSubmitting.set(false);
        setTimeout(() => this.successMessage.set(''), 4000);
      },
      error: (err) => {
        console.error('Error sending request:', err);
        this.errorMessage.set(err?.error?.message ?? 'حدث خطأ أثناء إرسال الطلب');
        this.isSubmitting.set(false);
      }
    });
  }

  private submitWithdrawalRequest(): void {
    const traineeId = this.traineeId();
    if (!traineeId) {
      this.errorMessage.set('تعذر تحديد بيانات المتدرب');
      return;
    }

    const hasPending = this.withdrawalRequests().some(r => r.status === WithdrawalRequestStatus.Pending);
    if (hasPending) {
      this.errorMessage.set('لديك بالفعل طلب انسحاب معلق قيد المراجعة.');
      return;
    }

    this.isSubmitting.set(true);
    (this.api as any).createWithdrawalRequest({
      traineeId: traineeId,
      reason: this.newConv.firstMessage.trim()
    }).subscribe({
      next: (res: any) => {
        this.successMessage.set(res?.message ?? 'تم تقديم طلب الانسحاب بنجاح.');
        this.resetForm();
        this.loadWithdrawalRequests(traineeId);
        this.isSubmitting.set(false);
        setTimeout(() => this.successMessage.set(''), 4000);
      },
      error: (err: any) => {
        console.error('Error creating withdrawal request:', err);
        this.errorMessage.set(err?.error?.message ?? 'حدث خطأ أثناء تقديم طلب الانسحاب');
        this.isSubmitting.set(false);
      }
    });
  }

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