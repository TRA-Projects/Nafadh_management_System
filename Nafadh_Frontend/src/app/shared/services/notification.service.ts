import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface NotificationDto {
  notificationId: number;
  userId: number;
  title: string;
  message: string;
  relatedEntity?: string | null;
  isRead: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getMine(): Observable<NotificationDto[]> {
    return this.http.get<NotificationDto[]>(`${this.base}/Notification/me`);
  }

  markAsRead(notificationId: number): Observable<void> {
    return this.http.put<void>(`${this.base}/Notification/${notificationId}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.base}/Notification/me/read-all`, {});
  }
}
