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
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';
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
        this.batchGroups = (conversations ?? [])
          .filter((conversation: any) => conversation.category === 'BatchGroup')
          .filter((group: any, index: number, groups: any[]) =>
            index === groups.findIndex((item: any) => item.batchId === group.batchId)
          );
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

    // 1. جلب المحادثة والرسائل العادية أولاً
    this.api.getConversation(conversationId).subscribe({
      next: (conversation) => {
        const rawMessages = conversation?.messages ?? [];
        let loadedMessages = rawMessages
          .sort((a: any, b: any) => new Date(a.sentDate).getTime() - new Date(b.sentDate).getTime())
          .map((message: any) => ({
            sender: message.senderId === this.auth.userId ? 'trainer' : 'trainee',
            text: message.content ?? '',
            time: this.formatMessageTime(message.sentDate)
          }));

        // 2. جلب الجلسات الحقيقية الخاصة بهذه الدفعة من جدول NFD_Session في الباكند
        if (batchId) {
          this.api.getSessions(batchId).subscribe({
            next: (sessions: any[]) => {
              const batchSessions = (sessions ?? []).filter((s: any) => Number(s.batchId) === Number(batchId));

              if (batchSessions.length > 0) {
                const latestSession = batchSessions[batchSessions.length - 1];

                // ---------------------------------------------------------
                // الاعتماد على حالة الباكند المباشرة (Status) أو مطابقتها بأمان
                // ---------------------------------------------------------
                let apiStatus: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled' = 'Upcoming';
                
                // إذا كان الباكند يرسل الحالة كأرقام (Enum) أو نصوص
                if (latestSession.status === 1 || latestSession.status === 'Ongoing') {
                  apiStatus = 'Ongoing';
                } else if (latestSession.status === 2 || latestSession.status === 'Completed') {
                  apiStatus = 'Completed';
                } else if (latestSession.status === 3 || latestSession.status === 'Cancelled') {
                  apiStatus = 'Cancelled';
                } else {
                  apiStatus = 'Upcoming';
                }

          const sessionDateFormatted = latestSession.sessionDate 
              ? new Date(latestSession.sessionDate).toLocaleDateString('ar-OM', { year: 'numeric', month: 'short', day: 'numeric' })
              : 'تاريخ غير محدد';

            const sessionMessage: TrainerMessage = {
              sender: 'system' as any,
              time: this.formatMessageTime(new Date()),
              isMeetingNotification: true,
              meeting: {
                meetingId: latestSession.sessionId,
                batchId: latestSession.batchId,
                title: latestSession.topic ?? 'محاضرة تدريبية',
                startDate: sessionDateFormatted, // التاريخ الحقيقي من الباكند
                time: latestSession.startTime ?? 'وقت غير محدد', // الوقت الحقيقي
                durationMinutes: latestSession.durationMinutes ?? 60,
                status: apiStatus,
                joinUrl: latestSession.meetingLink ?? latestSession.joinUrl,
                recordingUrl: latestSession.recordingUrl,
                isHostStarted: true // لتفعيل الانضمام بسهولة
              }
            };
                if (!loadedMessages.some((m: any) => m.isMeetingNotification && m.meeting?.meetingId === latestSession.sessionId)) {
                  loadedMessages = [sessionMessage, ...loadedMessages];
                }
              }

              this.messages = loadedMessages;
              this.cdr.markForCheck();
            },
            error: () => {
              this.messages = loadedMessages;
              this.cdr.markForCheck();
            }
          });
        } else {
          this.messages = loadedMessages;
          this.cdr.markForCheck();
        }
      }
    });
  }

  selectedBatchGroup(): any | undefined {
    return this.batchGroups.find((group: any) => group.conversationId === this.selectedBatchGroupId);
  }

  sendMessage(): void {
    const text = this.messageText.trim();
    if (!text) return;

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
            time: this.formatMessageTime(savedMessage?.sentDate) || this.formatMessageTime(new Date())
          });
          this.messageText = '';
        }
      });
      return;
    }

    const userId = this.auth.userId;
    const trainee = this.selectedTrainee();
    if (!userId || !trainee) return;

    if (trainee.conversationId) {
      this.api.sendMessage(trainee.conversationId, {
        senderId: userId,
        receiverUserId: trainee.userId,
        content: text
      }).subscribe({
        next: (savedMessage) => {
          const newMessage: TrainerMessage = {
            sender: 'trainer',
            text: savedMessage?.content ?? text,
            time: this.formatMessageTime(savedMessage?.sentDate) || this.formatMessageTime(new Date())
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
        }
      });
    }
  }

  newMessage(): void {
    this.isNewMessage = true;
    this.selectedTraineeId.set(null);
    this.messages = [];
    this.messageText = '';
  }
}