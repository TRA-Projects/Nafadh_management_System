import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { ConversationDetailDto, ConversationListItemDto, WarningDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-admin-communications',
  imports: [CommonModule, FormsModule],
  templateUrl: './communications.html',
})
export class AdminCommunications implements OnInit {
  tab = signal<'company' | 'complaints' | 'warnings'>('company');
  companyThreads = signal<ConversationListItemDto[]>([]);
  complaintThreads = signal<ConversationListItemDto[]>([]);
  traineeWarnings = signal<WarningDto[]>([]);
  activeConversation = signal<ConversationDetailDto | null>(null);
  replyText = '';

  constructor(private api: AdminApi) {}

  ngOnInit() {
    this.api.getConversations('CompanyThread').subscribe((d) => this.companyThreads.set(d));
    this.api.getConversations('TraineeComplaint').subscribe((d) => this.complaintThreads.set(d));
    this.api.getWarnings({ scope: 'Trainee' }).subscribe((d) => this.traineeWarnings.set(d));
  }

  open(id: number) { this.api.getConversation(id).subscribe((c) => this.activeConversation.set(c)); }

  reply() {
    const conv = this.activeConversation();
    if (!conv || !this.replyText.trim()) return;
    this.api.replyToConversation(conv.conversationId, { senderId: 1, content: this.replyText }).subscribe((msg) => {
      this.activeConversation.update((c) => (c ? { ...c, messages: [...c.messages, msg] } : c));
      this.replyText = '';
    });
  }
}
