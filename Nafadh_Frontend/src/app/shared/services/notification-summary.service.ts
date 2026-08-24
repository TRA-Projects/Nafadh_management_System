import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';

export interface NotificationSummary {
  notificationsCount: number;
  directMessagesCount: number;
  conversationsCount: number;
  totalCount: number;
}

/**
 * Shared notification summary service.
 *
 * The backend aggregates system notifications, direct messages and
 * communication conversations through GET /api/Notification/summary.
 * The shared shell consumes this single source of truth across portals.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationSummaryService {
  private readonly http = inject(HttpClient);

  private readonly base = environment.apiBaseUrl;

  /** Shared read-only state consumed by AppShell. */
  private readonly summarySignal = signal<NotificationSummary>({
    notificationsCount: 0,
    directMessagesCount: 0,
    conversationsCount: 0,
    totalCount: 0,
  });

  readonly summary = this.summarySignal.asReadonly();

  /** Initial load of the authenticated user's shared notification summary. */
  load(): void {
    this.refresh();
  }

  /** Refresh the shared bell counters from the real backend. */
  refresh(): void {
    this.http
      .get<NotificationSummary>(`${this.base}/Notification/summary`)
      .subscribe({
        next: (summary) => {
          // Normalize the API response so the shared UI always receives numbers.
          this.summarySignal.set({
            notificationsCount: Number(summary?.notificationsCount ?? 0),
            directMessagesCount: Number(summary?.directMessagesCount ?? 0),
            conversationsCount: Number(summary?.conversationsCount ?? 0),
            totalCount: Number(summary?.totalCount ?? 0),
          });
        },
        error: (error) => {
          // Notification failures must not break the shared portal shell.
          console.error('Failed to load notification summary.', error);
        },
      });
  }

  /** Reset counters after logout. */
  reset(): void {
    this.summarySignal.set({
      notificationsCount: 0,
      directMessagesCount: 0,
      conversationsCount: 0,
      totalCount: 0,
    });
  }
}
