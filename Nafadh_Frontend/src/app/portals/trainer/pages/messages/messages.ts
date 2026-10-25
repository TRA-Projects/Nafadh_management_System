
import { Component, OnInit, computed, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';

interface TrainerTrainee {
  traineeId: number;
  userId: number;
  name: string;
  batchName: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  online: boolean;
  conversationId: number | null;
}

export interface MeetingNotification {
  meetingId: number;
  batchId: number;
  title: string;
  startDate: string;
  time: string;
  durationMinutes: number;
 status:
  | 'Upcoming'
  | 'Ongoing'
  | 'Completed'
  | 'Cancelled'
  | 'Postponed';

  joinUrl?: string;
  recordingUrl?: string;
  isHostStarted?: boolean;
}

export interface TrainerMessage {
  sender: 'trainee' | 'trainer' | 'system';
  text?: string;
  time: string;
  isMeetingNotification?: boolean;
  meeting?: MeetingNotification;
}

@Component({
  selector: 'app-trainer-messages',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './messages.html',
  styleUrl: './messages.scss'
})
export class TrainerMessages implements OnInit {

  constructor(
    private api: TrainerApi,
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  // =====================================================
  // MEETING ACTIONS & HELPER METHODS
  // =====================================================

  joinMeeting(meeting: MeetingNotification): void {
    if (meeting.joinUrl && (meeting.status === 'Ongoing' || meeting.isHostStarted)) {
      window.open(meeting.joinUrl, '_blank');
    }
  }

  showMeetingDetails(meeting: MeetingNotification): void {
    alert(`تفاصيل الاجتماع:\nالعنوان: ${meeting.title}\nالتاريخ: ${meeting.startDate}\nالوقت: ${meeting.time}\nالمدة: ${meeting.durationMinutes} دقيقة\nالحالة: ${this.getMeetingStatusLabel(meeting.status)}`);
  }

  openRecording(recordingUrl?: string): void {
    if (recordingUrl) {
      window.open(recordingUrl, '_blank');
    }
  }

  getMeetingStatusLabel(status: MeetingNotification['status']): string {
  switch (status) {
    case 'Upcoming': return 'قادم';
    case 'Ongoing': return 'جارٍ الآن';
    case 'Completed': return 'منتهٍ';
    case 'Cancelled': return 'ملغي';
    case 'Postponed': return 'مؤجل';
    default: return '';
  }
}


  ngOnInit(): void {
    const userId = this.auth.userId;
    if (!userId) return;

    this.api.getTrainerByUserId(userId).subscribe({
      next: (trainer) => {
        this.loadTrainerTrainees(trainer.trainerId, userId);
      },
      error: (error) => {
        console.error('Failed to load trainer:', error);
      }
    });
  }

  private loadTrainerTrainees(trainerId: number, userId: number): void {
    this.api.getMyBatches(trainerId).subscribe({
      next: (batches) => {
        (batches ?? []).forEach(batch => {
          this.createBatchGroup(batch.batchId, userId);
        });

        const requests = (batches ?? []).map(batch => this.api.getBatchTrainees(batch.batchId));

        if (requests.length === 0) {
          this.trainees = [];
          this.loadTrainerConversations(userId);
          return;
        }

        forkJoin(requests).subscribe({
          next: (results) => {
            const allTrainees: TrainerTrainee[] = results.flatMap((batchTrainees, index) => {
              const batch = batches[index];
              return (batchTrainees as any[]).map((trainee) => ({
                traineeId: trainee.traineeId,
                userId: trainee.userId,
                name: trainee.fullName,
                batchName: batch.batchName ?? '',
                lastMessage: '',
                time: '',
                unread: false,
                online: false,
                conversationId: null
              }));
            });

            this.trainees = allTrainees;
            this.loadTrainerConversations(userId);

            if (allTrainees.length > 0) {
              this.selectTrainee(allTrainees[0].traineeId);
            }
          }
        });
      }
    });
  }

  private loadTrainerConversations(userId: number): void {
  this.api.getConversations(userId).subscribe({
    next: (conversations) => {
      const allConversations = conversations ?? [];

      // احتفظ بمحادثات المجموعات كما هي
      this.batchGroups = allConversations
        .filter((conversation: any) =>
          conversation.category === 'BatchGroup'
        )
        .filter((group: any, index: number, groups: any[]) =>
          index === groups.findIndex(
            (item: any) => item.batchId === group.batchId
          )
        );

      // المحادثات غير الجماعية هي المرشحة للمحادثات الفردية
      const individualConversations = allConversations.filter(
        (conversation: any) =>
          conversation.category !== 'BatchGroup'
      );

      // نحتاج تفاصيل كل محادثة لمعرفة معرّف المتدرب من الرسائل
      if (individualConversations.length === 0) {
        return;
      }

      forkJoin(
        individualConversations.map((conversation: any) =>
          this.api.getConversation(conversation.conversationId)
        )
      ).subscribe({
        next: (details: any[]) => {
          for (const detail of details) {
            const conversationMessages = detail?.messages ?? [];

            for (const trainee of this.trainees) {
              // الرسالة تحتوي senderId وreceiverId؛ نطابق بها userId
              const belongsToTrainee = conversationMessages.some(
                (message: any) =>
                  Number(message.senderId) === Number(trainee.userId) ||
                  Number(message.receiverId) === Number(trainee.userId)
              );

              if (!belongsToTrainee) {
                continue;
              }

              trainee.conversationId = detail.conversationId;

              this.messagesByTrainee[trainee.traineeId] =
                conversationMessages.map((message: any) => ({
                  sender:
                    Number(message.senderId) === Number(userId)
                      ? 'trainer'
                      : 'trainee',
                  text: message.content ?? '',
                  time: this.formatMessageTime(message.sentDate)
                }));

              // إذا كان هذا المتدرب هو المحدد حاليًا، أظهر الرسائل
              if (
                this.selectedTraineeId() === trainee.traineeId
              ) {
                this.messages =
                  this.messagesByTrainee[trainee.traineeId];
              }

              break;
            }
          }

          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error(
            'Failed to load individual conversations:',
            error
          );
        }
      });
    },
    error: (error) => {
      console.error('Failed to load trainer conversations:', error);
    }
  });
}

  private formatMessageTime(dateValue: string | Date | undefined): string {
    if (!dateValue) return '';
    const date = typeof dateValue === 'string' ? new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(dateValue) ? dateValue : `${dateValue}Z`) : dateValue;
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ar-OM', { hour: 'numeric', minute: '2-digit' }).format(date);
  }

  searchText = '';
  unreadOnly = false;
  selectedBatchName = '';

  get batchNames(): string[] {
    const traineeBatchNames = this.trainees.map(t => t.batchName);
    const groupBatchNames = this.batchGroups.map(g => g.batchName);
    return [...new Set([...traineeBatchNames, ...groupBatchNames].filter((name): name is string => !!name))];
  }

  get filteredBatchGroups(): any[] {
    const search = this.searchText.trim().toLowerCase().replace(/[أإآ]/g, 'ا');
    return this.batchGroups.filter((group: any) => {
      const groupName = String(group.subject ?? '').toLowerCase().replace(/[أإآ]/g, 'ا');
      const matchesSearch = !search || groupName.includes(search) || String(group.batchName ?? '').toLowerCase().replace(/[أإآ]/g, 'ا').includes(search);
      const matchesBatch = !this.selectedBatchName || group.batchName === this.selectedBatchName;
      const matchesUnread = !this.unreadOnly || Number(group.unreadCount ?? 0) > 0;
      return matchesSearch && matchesBatch && matchesUnread;
    });
  }

  todayDate = new Intl.DateTimeFormat('ar-OM', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  get filteredTrainees() {
    const search = this.searchText.trim().toLowerCase();
    return this.trainees.filter((trainee) => {
      const matchesSearch = !search || trainee.name.toLowerCase().includes(search) || trainee.batchName.toLowerCase().includes(search);
      const matchesBatch = !this.selectedBatchName || trainee.batchName === this.selectedBatchName;
      const matchesUnread = !this.unreadOnly || trainee.unread;
      return matchesSearch && matchesBatch && matchesUnread;
    });
  }

  trainees: TrainerTrainee[] = [];
  selectedBatchGroupId: number | null = null;
  batchGroups: any[] = [];
  isBatchGroupSelected = false;

  createBatchGroup(batchId: number, trainerUserId: number): void {
    this.api.createBatchGroup({ batchId, trainerUserId }).subscribe({
      next: (response) => {
        this.selectedBatchGroupId = response?.conversationId ?? null;
        this.loadTrainerConversations(this.auth.userId!);
      }
    });
  }

  isNewMessage = false;
  selectedTraineeId = signal<number | null>(null);

  selectedTrainee(): TrainerTrainee | undefined {
    return this.trainees.find((trainee) => trainee.traineeId === this.selectedTraineeId()) ?? this.trainees[0];
  }

  messageText = '';
  messagesByTrainee: Record<number, TrainerMessage[]> = {};
  messages: TrainerMessage[] = [];

  selectTrainee(traineeId: number): void {
    this.isBatchGroupSelected = false;
    this.selectedTraineeId.set(traineeId);
    this.isNewMessage = false;

    const trainee = this.trainees.find((item) => item.traineeId === traineeId);
    if (!trainee) {
      this.messages = [];
      return;
    }

    this.messages = this.messagesByTrainee[traineeId] ?? [];
    trainee.unread = false;

    const userId = this.auth.userId;
    if (userId && trainee.conversationId) {
      this.api.markConversationAsRead(trainee.conversationId, userId).subscribe();
    }
  }
selectBatchGroup(conversationId: number): void {
  this.isBatchGroupSelected = true;
  this.selectedBatchGroupId = conversationId;

  if (!conversationId) {
    return;
  }

  this.selectedTraineeId.set(null);
  this.messages = [];

  const currentGroup = this.selectedBatchGroup();
  const batchId = currentGroup?.batchId;

  this.api.getConversation(conversationId).subscribe({
    next: (conversation) => {
      const rawMessages = conversation?.messages ?? [];

      // الرسائل العادية في المجموعة
      let loadedMessages: TrainerMessage[] = [...rawMessages]
        .sort(
          (a: any, b: any) =>
            new Date(a.sentDate).getTime() -
            new Date(b.sentDate).getTime()
        )
        .map((message: any) => ({
          sender:
            Number(message.senderId) === Number(this.auth.userId)
              ? 'trainer'
              : 'trainee',
          text: message.content ?? '',
          time: this.formatMessageTime(message.sentDate)
        }));

      // لا يوجد batchId؟ أظهر الرسائل العادية على الأقل
      if (!batchId) {
        this.messages = loadedMessages;
        this.cdr.markForCheck();
        return;
      }

      // جلب اجتماعات الدفعة
      this.api.getSessions(batchId).subscribe({
        next: (sessions: any[]) => {
          const batchSessions = (sessions ?? [])
            .filter(
              (session: any) =>
                Number(session.batchId) === Number(batchId)
            )
            .sort(
              (a: any, b: any) =>
                new Date(a.sessionDate).getTime() -
                new Date(b.sessionDate).getTime()
            );

          // قيم NFD_SessionStatus في الباكند:
          // Scheduled=0, Completed=1, Cancelled=2,
          // Postponed=3, InProgress=4
          const meetingMessages: TrainerMessage[] =
            batchSessions.map((session: any) => {
              const numericStatus = Number(session.status);
              let meetingStatus: MeetingNotification['status'];

              if (
                session.status === 'InProgress' ||
                numericStatus === 4
              ) {
                meetingStatus = 'Ongoing';
              } else if (
                session.status === 'Completed' ||
                numericStatus === 1
              ) {
                meetingStatus = 'Completed';
              } else if (
                session.status === 'Cancelled' ||
                numericStatus === 2
              ) {
                meetingStatus = 'Cancelled';
              } else if (
                session.status === 'Postponed' ||
                numericStatus === 3
              ) {
                meetingStatus = 'Postponed';
              } else {
                meetingStatus = 'Upcoming';
              }

              const sessionDateFormatted = session.sessionDate
                ? new Date(session.sessionDate).toLocaleDateString(
                    'ar-OM',
                    {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }
                  )
                : 'تاريخ غير محدد';

              const meeting: MeetingNotification = {
                meetingId: session.sessionId,
                batchId: session.batchId,
                title: session.topic ?? 'محاضرة تدريبية',
                startDate: sessionDateFormatted,
                time: session.startTime ?? 'وقت غير محدد',
                durationMinutes: session.durationMinutes ?? 60,
                status: meetingStatus,
                joinUrl: session.meetingLink ?? session.joinUrl,
                recordingUrl: session.recordingUrl,
                isHostStarted: meetingStatus === 'Ongoing'
              };

              return {
                sender: 'system',
                time: this.formatMessageTime(
                  session.sessionDate
                    ? new Date(session.sessionDate)
                    : new Date()
                ),
                isMeetingNotification: true,
                meeting
              };
            });

          // أظهر إشعارات الاجتماعات مع رسائل المجموعة
          loadedMessages = [...meetingMessages, ...loadedMessages];
          this.messages = loadedMessages;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('تعذر تحميل اجتماعات الدفعة:', error);

          // إذا فشل جلب الاجتماعات، لا نخفي الرسائل العادية
          this.messages = loadedMessages;
          this.cdr.markForCheck();
        }
      });
    },
    error: (error) => {
      console.error('تعذر تحميل محادثة المجموعة:', error);
      this.messages = [];
      this.cdr.markForCheck();
    }
  });
}

  selectedBatchGroup(): any | undefined {
    return this.batchGroups.find((group: any) => group.conversationId === this.selectedBatchGroupId);
  }

  sendMessage(): void {
  const text = this.messageText.trim();
  if (!text) return;

  // إرسال إلى مجموعة الدفعة — اترك هذا المسار كما هو
  if (this.isBatchGroupSelected && this.selectedBatchGroupId) {
    const userId = this.auth.userId;
    if (!userId) return;

    this.api.sendMessage(this.selectedBatchGroupId, {
      senderId: userId,
      receiverUserId: null,
      content: text
    }).subscribe({
      next: (savedMessage) => {
        this.messages.push({
          sender: 'trainer',
          text: savedMessage?.content ?? text,
          time:
            this.formatMessageTime(savedMessage?.sentDate) ||
            this.formatMessageTime(new Date())
        });
        this.messageText = '';
      },
      error: (error) => {
        console.error('فشل إرسال رسالة المجموعة:', error);
      }
    });

    return;
  }

  // إرسال إلى متدرب واحد
  const userId = this.auth.userId;
  const trainee = this.selectedTrainee();
  if (!userId || !trainee) return;

  // لا توجد محادثة: أنشئها والرسالة تكون أول رسالة فيها
  if (!trainee.conversationId) {
    this.api.createConversation({
      type: 'Other',
      category: 'TrainerTrainee',
      subject: `محادثة ${trainee.name}`,
      startedByUserId: userId,
      firstMessage: text,
      receiverUserId: trainee.userId
    }).subscribe({
      next: (createdConversation) => {
        const conversationId = createdConversation?.conversationId;

        if (!conversationId) {
          console.error(
            'لم يرجع الخادم conversationId:',
            createdConversation
          );
          return;
        }

        trainee.conversationId = conversationId;

        const newMessage: TrainerMessage = {
          sender: 'trainer',
          text,
          time: this.formatMessageTime(new Date())
        };

        this.messagesByTrainee[trainee.traineeId] = [newMessage];
        this.messages = this.messagesByTrainee[trainee.traineeId];
        trainee.lastMessage = text;
        trainee.time = newMessage.time;
        trainee.unread = false;
        this.messageText = '';

        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('فشل إنشاء المحادثة الفردية:', error);
      }
    });

    return;
  }

  // المحادثة موجودة: أرسل الرسالة فيها
  this.api.sendMessage(trainee.conversationId, {
    senderId: userId,
    receiverUserId: trainee.userId,
    content: text
  }).subscribe({
    next: (savedMessage) => {
      const newMessage: TrainerMessage = {
        sender: 'trainer',
        text: savedMessage?.content ?? text,
        time:
          this.formatMessageTime(savedMessage?.sentDate) ||
          this.formatMessageTime(new Date())
      };

      if (!this.messagesByTrainee[trainee.traineeId]) {
        this.messagesByTrainee[trainee.traineeId] = [];
      }

      this.messagesByTrainee[trainee.traineeId].push(newMessage);
      this.messages = this.messagesByTrainee[trainee.traineeId];
      trainee.lastMessage = text;
      trainee.time = newMessage.time;
      trainee.unread = false;
      this.messageText = '';

      this.cdr.markForCheck();
    },
    error: (error) => {
      console.error('فشل إرسال الرسالة الفردية:', error);
    }
  });
}

  newMessage(): void {
    this.isNewMessage = true;
    this.selectedTraineeId.set(null);
    this.messages = [];
    this.messageText = '';
  }
}
