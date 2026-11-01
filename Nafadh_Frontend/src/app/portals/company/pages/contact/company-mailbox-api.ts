import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
export interface CompanyMailDraft {
  id: string; conversationId: number | null; subject: string; category: string; content: string; updatedAt: string;
}
@Injectable({ providedIn: 'root' })
export class CompanyMailboxApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/CompanyMailbox`;
  getTrash() { return this.http.get<{ trashedIds: number[]; ownedIds: number[] }>(`${this.base}/trash`); }
  trashConversation(id: number) { return this.http.put<void>(`${this.base}/trash/${id}`, {}); }
  restoreConversation(id: number) { return this.http.delete<void>(`${this.base}/trash/${id}`); }
  getDrafts() { return this.http.get<CompanyMailDraft[]>(`${this.base}/drafts`); }
  saveDraft(draft: CompanyMailDraft) { return this.http.put<CompanyMailDraft>(`${this.base}/drafts/${draft.id}`, draft); }
  deleteDraft(id: string) { return this.http.delete<void>(`${this.base}/drafts/${id}`); }
  deleteConversation(id: number) { return this.http.delete<void>(`${this.base}/conversations/${id}`); }
}
