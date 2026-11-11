import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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
export interface SendBatchNotificationDto {
  batchId: number;
  traineeId: number | null;
  title: string;
  message: string;
}
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getMine(): Observable<NotificationDto[]> {
    return this.http.get<NotificationDto[]>(`${this.base}/Notification/me`);

  }

  markAsRead(notificationId: number): Observable<void> {
    return this.http.put(`${this.base}/Notification/${notificationId}/read`, {}, { responseType: 'text' })
      .pipe(map(() => undefined));
  }

  markAllAsRead(): Observable<void> {
    return this.http.put(`${this.base}/Notification/me/read-all`, {}, { responseType: 'text' })
      .pipe(map(() => undefined));
  }
  sendToBatch(
  dto: SendBatchNotificationDto
): Observable<{ message: string; sentCount: number }> {
  return this.http.post<{ message: string; sentCount: number }>(
    `${this.base}/Notification/trainer/send`,
    dto
  );
}

deleteNotification(notificationId: number): Observable<void> {
  return this.http.delete<void>(
    `${this.base}/Notification/${notificationId}`
  );
}
}
