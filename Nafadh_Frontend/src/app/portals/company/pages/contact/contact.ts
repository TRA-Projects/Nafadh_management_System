import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { ConversationDetailDto, ConversationListItemDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-company-contact',
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
})
export class CompanyContact implements OnInit {
  conversations = signal<ConversationListItemDto[]>([]);
  active = signal<ConversationDetailDto | null>(null);
  showNew = signal(false);
  replyText = '';
  newConv = { category: 'طلبات الاستضافة والاعتماد', subject: '', firstMessage: '' };
  categories = ['طلبات الاستضافة والاعتماد', 'البرامج والخطط التدريبية', 'الحضور والغياب', 'التقييمات والتقارير', 'الإنذارات والمخالفات', 'استفسار عام'];

  constructor(private api: CompanyApi, public auth: AuthService) {}
  ngOnInit() {
    const uid = this.auth.userId ?? 2;
    this.api.getConversations(uid).subscribe((d) => this.conversations.set(d ?? []));
  }

  open(id: number) { this.api.getConversation(id).subscribe((c) => this.active.set(c)); }

  send() {
    const c = this.active();
    if (!c || !this.replyText.trim()) return;
    const uid = this.auth.userId ?? 2;
    this.api.sendMessage(c.conversationId, { senderId: uid, content: this.replyText }).subscribe((msg) => {
      this.active.update((cur) => (cur ? { ...cur, messages: [...cur.messages, msg] } : cur));
      this.replyText = '';
    });
  }

  startConversation() {
    const uid = this.auth.userId ?? 2;
    this.api.startConversation({ type: 'CompanyThread', ...this.newConv, startedByUserId: uid }).subscribe(() => {
      this.showNew.set(false);
      this.api.getConversations(uid).subscribe((d) => this.conversations.set(d ?? []));
    });
  }
}
