import { Component, OnInit, computed, signal } from '@angular/core';
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

interface TrainerMessage {
  sender: 'trainee' | 'trainer';
  text: string;
  time: string;
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
    public auth: AuthService
  ) {}

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    const userId = this.auth.userId;

    if (!userId) {
      return;
    }

    this.api.getTrainerByUserId(userId).subscribe({
      next: (trainer) => {
        console.log('Trainer:', trainer);

        this.loadTrainerTrainees(
          trainer.trainerId,
          userId
        );
      },

      error: (error) => {
        console.error(
          'Failed to load trainer:',
          error
        );
      }
    });
  }

  // =====================================================
  // LOAD TRAINER TRAINEES
  // =====================================================

  private loadTrainerTrainees(
    trainerId: number,
    userId: number
  ): void {

    this.api.getMyBatches(trainerId).subscribe({
      next: (batches) => {

        const requests = (batches ?? []).map(
          (batch) =>
            this.api.getBatchTrainees(
              batch.batchId
            )
        );

        if (requests.length === 0) {
          this.trainees = [];
          return;
        }

        forkJoin(requests).subscribe({
          next: (results) => {

            console.log(
              'Trainer trainees:',
              results
            );

            const allTrainees: TrainerTrainee[] =
              results.flatMap(
                (batchTrainees, index) => {

                  const batch = batches[index];

                  return (batchTrainees as any[]).map(
                    (trainee) => ({
                      traineeId:
                        trainee.traineeId,

                      userId:
                        trainee.userId,

                      name:
                        trainee.fullName,

                      batchName:
                        batch.batchName ?? '',

                      lastMessage: '',
                      time: '',
                      unread: false,
                      online: false,
                      conversationId: null
                    })
                  );
                }
              );

            this.trainees = allTrainees;

            // تحميل المحادثات بعد تحميل المتدربين
            this.loadTrainerConversations(
              userId
            );

            // اختيار أول متدرب
            if (allTrainees.length > 0) {
              this.selectedTraineeId.set(
                allTrainees[0].traineeId
              );
            }
          },

          error: (error) => {
            console.error(
              'Failed to load trainees:',
              error
            );
          }
        });
      },

      error: (error) => {
        console.error(
          'Failed to load trainer batches:',
          error
        );
      }
    });
  }

  // =====================================================
  // LOAD REAL CONVERSATIONS
  // =====================================================

  private loadTrainerConversations(
    userId: number
  ): void {

    this.api.getConversations(userId).subscribe({
      next: (conversations) => {

        // نحتاج فقط محادثات المدرب مع المتدرب
        const trainerConversations =
          (conversations ?? []).filter(
            (conversation: any) =>
              conversation.category ===
              'TrainerTrainee'
          );

        if (
          trainerConversations.length === 0
        ) {
          this.messages = [];
          return;
        }

        const requests =
          trainerConversations.map(
            (conversation: any) =>
              this.api.getConversation(
                conversation.conversationId
              )
          );

        forkJoin(requests).subscribe({
          next: (details) => {

            details.forEach(
              (conversation: any) => {

                const messages =
                  conversation.messages ?? [];

                if (messages.length === 0) {
                  return;
                }

                // استخراج المستخدمين المشاركين
                const participantIds =
                  messages
                    .flatMap(
                      (message: any) => [
                        message.senderId,
                        message.receiverId
                      ]
                    )
                    .filter(
                      (
                        id: number | null
                      ) =>
                        id != null &&
                        id !== userId
                    );

                // إيجاد المتدرب المرتبط بالمحادثة
                const trainee =
                  this.trainees.find(
                    (item) =>
                      participantIds.includes(
                        item.userId
                      )
                  );

                if (!trainee) {
                  return;
                }

                // ترتيب الرسائل من الأقدم للأحدث
                const sortedMessages =
                  [...messages].sort(
                    (a, b) =>
                      new Date(
                        a.sentDate
                      ).getTime() -
                      new Date(
                        b.sentDate
                      ).getTime()
                  );

                // ربط رقم المحادثة بالمتدرب
                trainee.conversationId =
                  conversation.conversationId;

                // آخر رسالة
                const lastMessage =
                  sortedMessages[
                    sortedMessages.length - 1
                  ];

                trainee.lastMessage =
                  lastMessage?.content ?? '';

                trainee.time =
                  this.formatMessageTime(
                    lastMessage?.sentDate
                  );

                // حالة الرسائل غير المقروءة
                trainee.unread =
                  messages.some(
                    (message: any) =>
                      message.senderId !== userId &&
                      message.status !== 'Read'
                  );

                // تحويل رسائل الـ Backend
                // إلى الشكل المستخدم في الواجهة
                this.messagesByTrainee[
                  trainee.traineeId
                ] =
                  sortedMessages.map(
                    (message: any) => ({
                      sender:
                        message.senderId === userId
                          ? 'trainer'
                          : 'trainee',

                      text:
                        message.content ?? '',

                      time:
                        this.formatMessageTime(
                          message.sentDate
                        )
                    })
                  );

                // إذا كان هذا هو المتدرب المحدد حاليًا
                // اعرض رسائله مباشرة
                if (
                  this.selectedTraineeId() ===
                  trainee.traineeId
                ) {
                  this.messages =
                    this.messagesByTrainee[
                      trainee.traineeId
                    ] ?? [];
                }
              }
            );
          },

          error: (error) => {
            console.error(
              'Failed to load conversations:',
              error
            );
          }
        });
      },

      error: (error) => {
        console.error(
          'Failed to load trainer conversations:',
          error
        );
      }
    });
  }

  // =====================================================
  // FORMAT DATE
  // =====================================================

  private formatMessageTime(
    dateValue: string | Date | undefined
  ): string {

    if (!dateValue) {
      return '';
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(
      'ar-OM',
      {
        hour: 'numeric',
        minute: '2-digit'
      }
    ).format(date);
  }

  // =====================================================
  // SEARCH
  // =====================================================

  searchText = '';

  unreadOnly = false;

  todayDate =
    new Intl.DateTimeFormat(
      'ar-OM',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }
    ).format(new Date());

  get filteredTrainees() {

    const search =
      this.searchText
        .trim()
        .toLowerCase();

    return this.trainees.filter(
      (trainee) => {

        const matchesSearch =
          !search ||
          trainee.name
            .toLowerCase()
            .includes(search) ||
          trainee.batchName
            .toLowerCase()
            .includes(search) ||
          trainee.lastMessage
            .toLowerCase()
            .includes(search);

        const matchesUnread =
          !this.unreadOnly ||
          trainee.unread;

        return (
          matchesSearch &&
          matchesUnread
        );
      }
    );
  }

  // =====================================================
  // TRAINEES
  // =====================================================

  trainees: TrainerTrainee[] = [];

  // =====================================================
  // SELECTED TRAINEE
  // =====================================================

  isNewMessage = false;

  selectedTraineeId =
    signal<number | null>(null);

 selectedTrainee(): TrainerTrainee | undefined {
  return (
    this.trainees.find(
      (trainee) =>
        trainee.traineeId ===
        this.selectedTraineeId()
    ) ??
    this.trainees[0]
  );
}

  // =====================================================
  // MESSAGES
  // =====================================================

  messageText = '';

  messagesByTrainee:
    Record<number, TrainerMessage[]> = {};

  messages: TrainerMessage[] = [];

  // =====================================================
  // SELECT TRAINEE
  // =====================================================

  selectTrainee(
    traineeId: number
  ): void {

    this.selectedTraineeId.set(
      traineeId
    );

    this.isNewMessage = false;

    const trainee =
      this.trainees.find(
        (item) =>
          item.traineeId ===
          traineeId
      );

    if (!trainee) {
      this.messages = [];
      return;
    }

    // عرض الرسائل الموجودة محليًا
    this.messages =
      this.messagesByTrainee[
        traineeId
      ] ?? [];

    // إزالة حالة غير مقروء محليًا
    trainee.unread = false;

    // تعليم المحادثة كمقروءة في Backend
    const userId =
      this.auth.userId;

    if (
      userId &&
      trainee.conversationId
    ) {

      this.api
        .markConversationAsRead(
          trainee.conversationId,
          userId
        )
        .subscribe({
          error: (error) => {
            console.error(
              'Failed to mark conversation as read:',
              error
            );
          }
        });
    }
  }

  // =====================================================
  // SEND MESSAGE
  // =====================================================

 sendMessage(): void {

  console.log('SEND CLICK');

  const text =
    this.messageText.trim();

  if (!text) {
    return;
  }

  const userId =
    this.auth.userId;

  const trainee =
    this.selectedTrainee();
    console.log('TRAINEE DEBUG:', {
  userId,
  trainee
});

  if (!userId || !trainee) {
    return;
  }
    console.log('SEND MESSAGE DEBUG:', {
  userId,
  traineeId: trainee.traineeId,
  traineeUserId: trainee.userId,
  conversationId: trainee.conversationId,
  text
});
    // -------------------------------------------------
    // إذا كانت هناك محادثة موجودة
    // -------------------------------------------------

    if (trainee.conversationId) {

      this.api.sendMessage(
        trainee.conversationId,
        {
          senderId: userId,
          content: text
        }
      ).subscribe({

        next: (savedMessage) => {

          const newMessage:
            TrainerMessage = {
              sender: 'trainer',
              text: savedMessage?.content ?? text,
              time:
                this.formatMessageTime(
                  savedMessage?.sentDate
                ) ||
                this.formatMessageTime(
                  new Date()
                )
            };

          if (
            !this.messagesByTrainee[
              trainee.traineeId
            ]
          ) {
            this.messagesByTrainee[
              trainee.traineeId
            ] = [];
          }

          this.messagesByTrainee[
            trainee.traineeId
          ].push(newMessage);

          this.messages =
            this.messagesByTrainee[
              trainee.traineeId
            ];

          // تحديث آخر رسالة في القائمة
          trainee.lastMessage =
            text;

          trainee.time =
            newMessage.time;

          trainee.unread =
            false;

          this.messageText = '';
        },

        error: (error) => {
          console.error(
            'Failed to send message:',
            error
          );
        }
      });

      return;
    }

    // -------------------------------------------------
    // إذا لم توجد محادثة
    // ننشئ محادثة جديدة
    // -------------------------------------------------

    this.api.createConversation({
      type: 'Other',
      category: 'TrainerTrainee',
      subject:
        `محادثة مع ${trainee.name}`,
      startedByUserId: userId,
      firstMessage: text,
      receiverUserId: trainee.userId
    }).subscribe({

      next: (conversation) => {

        trainee.conversationId =
          conversation.conversationId;

        const newMessage:
          TrainerMessage = {
            sender: 'trainer',
            text: text,
            time:
              this.formatMessageTime(
                new Date()
              )
          };

        this.messagesByTrainee[
          trainee.traineeId
        ] = [newMessage];

        this.messages =
          this.messagesByTrainee[
            trainee.traineeId
          ];

        trainee.lastMessage =
          text;

        trainee.time =
          newMessage.time;

        trainee.unread =
          false;

        this.messageText = '';

        this.isNewMessage = false;
      },

      error: (error) => {
        console.error(
          'Failed to create conversation:',
          error
        );
      }
    });
  }

  // =====================================================
  // NEW MESSAGE
  // =====================================================

  newMessage(): void {

    this.isNewMessage = true;

    this.selectedTraineeId.set(
      null
    );

    this.messages = [];

    this.messageText = '';
  }
}