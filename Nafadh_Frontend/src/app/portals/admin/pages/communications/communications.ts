import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router'; // 👈 استيراد الرابط لقراءة اسم المتدرب
import { AdminApi } from '../../services/admin-api';
import { ConversationDetailDto, ConversationListItemDto, WarningDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-admin-communications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './communications.html',
})
export class AdminCommunications implements OnInit {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute); // 👈 حقن مسار التوجيه

  tab = signal<'company' | 'complaints' | 'warnings'>('company');
  companyThreads = signal<ConversationListItemDto[]>([]);
  complaintThreads = signal<ConversationListItemDto[]>([]);
  traineeWarnings = signal<WarningDto[]>([]);
  activeConversation = signal<ConversationDetailDto | null>(null);
  replyText = '';

  ngOnInit() {
    // 1. جلب البيانات العادية
    this.api.getConversations('CompanyThread').subscribe((d) => this.companyThreads.set(d || []));
    this.api.getWarnings({ scope: 'Trainee' }).subscribe((d) => this.traineeWarnings.set(d || []));

    // 2. فحص هل تم تحويلنا من صفحة الدفعات لمراسلة متدرب معين؟
    this.route.queryParams.subscribe((params) => {
      const traineeName = params['traineeName'];
      const traineeId = params['traineeId'];

      if (traineeName || traineeId) {
        // تحويل التبويب تلقائياً إلى محادثات المتدربين
        this.tab.set('complaints');

        this.api.getConversations('TraineeComplaint').subscribe((d) => {
          const list = d || [];
          this.complaintThreads.set(list);

          // البحث هل توجد محادثة سابقة مع هذا المتدرب؟
          const found = list.find((c) =>
            (traineeName && c.startedByName && c.startedByName.includes(traineeName)) ||
            (traineeName && c.subject && c.subject.includes(traineeName))
          );

          if (found) {
            // فتح المحادثة السابقة فوراً
            this.open(found.conversationId);
          } else {
            // إذا كانت أول محادثة، نفتح له نافذة شات جديدة باسمه فوراً
            this.activeConversation.set({
              conversationId: 0,
              type: 'TraineeComplaint' as any,
              category: 'مراسلة إدارية فورية',
              subject: `محادثة مباشرة مع: ${traineeName || 'المتدرب'}`,
              status: 'Open' as any,
              unreadCount: 0,
              startedByName: traineeName || 'المتدرب',
              messages: []
            });
          }
        });
      } else {
        // فتح عادي لصفحة المراسلات
        this.api.getConversations('TraineeComplaint').subscribe((d) => this.complaintThreads.set(d || []));
      }
    });
  }

  open(id: number) {
    if (!id) return;
    this.api.getConversation(id).subscribe((c) => this.activeConversation.set(c));
  }

  reply() {
    const conv = this.activeConversation();
    if (!conv || !this.replyText.trim()) return;

    if (conv.conversationId > 0) {
      // إرسال الرد للمحادثة الموجودة بالسيرفر
      this.api.replyToConversation(conv.conversationId, { senderId: 1, content: this.replyText }).subscribe((msg) => {
        this.activeConversation.update((c) => (c ? { ...c, messages: [...c.messages, msg] } : c));
        this.replyText = '';
      });
    } else {
      // إرسال في المحادثة المباشرة الجديدة
      const newMsg: any = {
        messageId: Date.now(),
        content: this.replyText,
        sentDate: new Date().toISOString(),
        status: 'Sent',
        senderId: 1,
        senderName: 'إدارة البرنامج'
      };
      this.activeConversation.update((c) => (c ? { ...c, messages: [...c.messages, newMsg] } : c));
      this.replyText = '';
    }
  }
}