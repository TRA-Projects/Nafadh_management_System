import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, interval, of, startWith, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface NotificationSummary {
  notificationsCount: number;
  directMessagesCount: number;
  conversationsCount: number;
  totalCount: number;
}

const EMPTY_SUMMARY: NotificationSummary = {
  notificationsCount: 0,
  directMessagesCount: 0,
  conversationsCount: 0,
  totalCount: 0,
};

@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
  private readonly http = inject(HttpClient);

  readonly summary = signal<NotificationSummary>(EMPTY_SUMMARY);

  load(): void {
    // Polling keeps the shared bell current without adding real-time infrastructure
    // that the existing project does not use elsewhere.
    interval(30000)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.http
            .get<NotificationSummary>(`${environment.apiBaseUrl}/Notification/summary`)
            .pipe(catchError(() => of(EMPTY_SUMMARY)))
        )
      )
      .subscribe((summary) => this.summary.set(summary));
  }

  refresh(): void {
    // Refresh immediately when the user opens the bell; polling continues afterward.
    this.http
      .get<NotificationSummary>(`${environment.apiBaseUrl}/Notification/summary`)
      .pipe(catchError(() => of(EMPTY_SUMMARY)))
      .subscribe((summary) => this.summary.set(summary));
  }
}
