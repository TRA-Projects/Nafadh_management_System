import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  ConversationDetailDto,
  ConversationListItemDto,
} from '../../../../core/models/dtos';

@Component({
  selector: 'app-company-contact',
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrls: ['./contact.scss'],
})
export class CompanyContact implements OnInit {

  // ============================================================
  // Conversations
  // ============================================================

  conversations = signal<ConversationListItemDto[]>([]);

  active = signal<ConversationDetailDto | null>(null);

  // ============================================================
  // UI State
  // ============================================================

  showNew = signal(false);

  searchText = '';

  replyText = '';

  loading = signal(false);

  errorMessage = signal('');

  // ============================================================
  // New Conversation
  // ============================================================

  newConv = {
    category: 'طلبات الاستضافة والاعتماد',
    subject: '',
    firstMessage: '',
  };

  categories = [
    'طلبات الاستضافة والاعتماد',
    'البرامج والخطط التدريبية',
    'الحضور والغياب',
    'التقييمات والتقارير',
    'الإنذارات والمخالفات',
    'استفسار عام',
  ];

  // ============================================================
  // Computed values
  // ============================================================

  totalConversations = computed(() => {
    return this.conversations().length;
  });

  totalUnread = computed(() => {
    return this.conversations().reduce(
      (total, conversation) => total + (conversation.unreadCount ?? 0),
      0
    );
  });

  // ============================================================
  // Constructor
  // ============================================================

  constructor(
    private api: CompanyApi,
    public auth: AuthService
  ) {}

  // ============================================================
  // Init
  // ============================================================

  ngOnInit(): void {
    this.loadConversations();
  }

  // ============================================================
  // Load conversations
  // ============================================================

  loadConversations(): void {

    const userId = this.auth.userId;

    if (!userId) {
      this.errorMessage.set('لم يتم العثور على المستخدم الحالي.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.api.getConversations(userId).subscribe({

      next: (data) => {
        this.conversations.set(data ?? []);
        this.loading.set(false);
      },

      error: (error) => {
        console.error('Failed to load conversations:', error);

        this.loading.set(false);

        this.errorMessage.set(
          'تعذر تحميل المحادثات. تأكد من اتصال النظام بالخادم.'
        );
      },
    });
  }

  // ============================================================
  // Search
  // ============================================================

  filteredConversations(): ConversationListItemDto[] {

    const search = this.searchText.trim().toLowerCase();

    if (!search) {
      return this.conversations();
    }

    return this.conversations().filter((conversation) => {

      const subject =
        conversation.subject?.toLowerCase() ?? '';

      const category =
        conversation.category?.toLowerCase() ?? '';

      const preview =
        conversation.lastMessagePreview?.toLowerCase() ?? '';

      return (
        subject.includes(search) ||
        category.includes(search) ||
        preview.includes(search)
      );
    });
  }

  // ============================================================
  // Open conversation
  // ============================================================

  open(id: number): void {

    this.api.getConversation(id).subscribe({

      next: (conversation) => {

        this.active.set(conversation);

        const userId = this.auth.userId;

        if (!userId) {
          return;
        }

        // Mark messages received from the Authority as read.
        this.api.markConversationRead(id, userId).subscribe({

          next: () => {

            this.conversations.update((items) =>
              items.map((item) =>
                item.conversationId === id
                  ? { ...item, unreadCount: 0 }
                  : item
              )
            );
          },

          error: (error: unknown) => {
            console.error(
              'Failed to mark conversation as read:',
              error
            );
          },
        });
      },

      error: (error) => {
        console.error('Failed to open conversation:', error);

        this.errorMessage.set(
          'تعذر فتح المحادثة.'
        );
      },
    });
  }

  // ============================================================
  // Send reply
  // ============================================================

  send(): void {

    const conversation = this.active();

    const content = this.replyText.trim();

    const userId = this.auth.userId;

    if (!conversation || !content || !userId) {
      return;
    }

    this.api
      .sendMessage(
        conversation.conversationId,
        {
          senderId: userId,
          content: content,
        }
      )
      .subscribe({

        next: (message) => {

          const messageWithSender = {
            ...message,

            senderName:
              message.senderName ??
              this.auth.session()?.fullName ??
              'أنت',

            sentDate:
              message.sentDate ??
              new Date().toISOString(),
          };

          this.active.update((current) => {

            if (!current) {
              return current;
            }

            return {
              ...current,

              messages: [
                ...current.messages,
                messageWithSender,
              ],

              lastMessagePreview: content,

              lastMessageDate:
                messageWithSender.sentDate,

              unreadCount: 0,
            };
          });

          // Update the preview in the left/right conversation list.
          this.conversations.update((items) =>
            items.map((item) =>
              item.conversationId === conversation.conversationId
                ? {
                    ...item,
                    lastMessagePreview: content,
                    lastMessageDate:
                      messageWithSender.sentDate,
                    unreadCount: 0,
                  }
                : item
            )
          );

          this.replyText = '';
        },

        error: (error) => {

          console.error(
            'Failed to send message:',
            error
          );

          this.errorMessage.set(
            'تعذر إرسال الرسالة.'
          );
        },
      });
  }

  // ============================================================
  // Start new conversation
  // ============================================================

  startConversation(): void {

    const userId = this.auth.userId;

    if (!userId) {
      this.errorMessage.set(
        'لم يتم العثور على المستخدم الحالي.'
      );

      return;
    }

    const subject =
      this.newConv.subject.trim();

    const firstMessage =
      this.newConv.firstMessage.trim();

    if (!subject || !firstMessage) {
      return;
    }

    const dto = {
      type: 'CompanyThread',

      category:
        this.newConv.category,

      subject: subject,

      firstMessage: firstMessage,

      startedByUserId: userId,
    };

    this.api.startConversation(dto).subscribe({

      next: (conversation) => {

        // Close modal.
        this.showNew.set(false);

        // Clear old form values.
        this.newConv = {
          category: 'طلبات الاستضافة والاعتماد',
          subject: '',
          firstMessage: '',
        };

        // Open newly created conversation immediately.
        this.active.set(conversation);

        // Refresh list.
        this.loadConversations();
      },

      error: (error) => {

        console.error(
          'Failed to create conversation:',
          error
        );

        this.errorMessage.set(
          'تعذر إنشاء المحادثة.'
        );
      },
    });
  }

  // ============================================================
  // Close active conversation
  // ============================================================

  clearActive(): void {
    this.active.set(null);
    this.replyText = '';
  }
}