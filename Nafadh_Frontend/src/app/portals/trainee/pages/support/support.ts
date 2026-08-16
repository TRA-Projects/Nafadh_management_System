import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TraineeApi } from '../../services/trainee-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { ConversationDetailDto, ConversationListItemDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainee-support',
  imports: [CommonModule, FormsModule],
  templateUrl: './support.html',
})
export class TraineeSupport implements OnInit {
  conversations = signal<ConversationListItemDto[]>([]);
  active = signal<ConversationDetailDto | null>(null);
  showNew = signal(false);
  replyText = '';
  newConv = { subject: '', firstMessage: '' };
  subjects = ['استفسار عن البرنامج التدريبي', 'مشكلة تقنية', 'استفسار عن الحضور', 'شكوى رسمية', 'أخرى'];

  constructor(private api: TraineeApi, public auth: AuthService) {}
  ngOnInit() {
    const uid = this.auth.userId ?? 4;
    this.api.getConversations(uid).subscribe((d) => this.conversations.set(d ?? []));
  }

  open(id: number) { this.api.getConversation(id).subscribe((c) => this.active.set(c)); }

  send() {
    const c = this.active();
    if (!c || !this.replyText.trim()) return;
    const uid = this.auth.userId ?? 4;
    this.api.sendMessage(c.conversationId, { senderId: uid, content: this.replyText }).subscribe(() => {
      this.replyText = '';
      this.open(c.conversationId);
    });
  }

  startConversation() {
    const uid = this.auth.userId ?? 4;
    this.api.startConversation({ type: 'TraineeComplaint', ...this.newConv, startedByUserId: uid }).subscribe(() => {
      this.showNew.set(false);
      this.api.getConversations(uid).subscribe((d) => this.conversations.set(d ?? []));
    });
  }
}
