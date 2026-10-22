
import { Injectable, inject, signal } from '@angular/core';
import { catchError, EMPTY, interval, of, startWith, switchMap } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { SessionDto } from '../../../../core/models/dtos';
import { TraineeApi } from '../../services/trainee-api';

@Injectable({
  providedIn: 'root',
})
export class MeetingSessionWatcher {
  private readonly auth = inject(AuthService);
  private readonly api = inject(TraineeApi);

  readonly activeMeeting = signal<SessionDto | null>(null);

  private batchId: number | null = null;
  private started = false;

  start(): void {
    if (this.started) return;

    const userId = this.auth.userId;
    if (!userId) return;

    this.started = true;

    this.api.getTrainee(userId).pipe(
      switchMap(trainee =>
        this.api.getEnrollmentsByTrainee(trainee.traineeId)
      ),
      switchMap(enrollments => {
        const activeEnrollment =
          enrollments.find(e =>
            e.completionStatus === 'Active' ||
            e.completionStatus === 'InProgress'
          ) ?? enrollments[0];

        if (!activeEnrollment?.batchId) {
          return EMPTY;
        }

        this.batchId = activeEnrollment.batchId;

        return interval(15000).pipe(
          startWith(0),
          switchMap(() =>
            this.api.getSessionsByBatch(this.batchId!).pipe(
              catchError(error => {
                console.error('Failed to load sessions:', error);
                return of([] as SessionDto[]);
              })
            )
          )
        );
      }),
      catchError(error => {
        console.error('Failed to initialize meeting watcher:', error);
        this.started = false;
        return EMPTY;
      })
    ).subscribe(sessions => {
      this.checkSessions(sessions);
    });
  }

  dismiss(): void {
    const session = this.activeMeeting();

    if (session) {
      this.markAsNotified(session.sessionId);
    }

    this.activeMeeting.set(null);
  }

  private checkSessions(sessions: SessionDto[]): void {
    if (this.activeMeeting()) return;

    const now = new Date();

    const upcoming = sessions.find(session => {
      if (
        session.status !== 'Scheduled' ||
        !session.startTime ||
        !session.sessionDate
      ) {
        return false;
      }

      if (this.wasNotified(session.sessionId)) {
        return false;
      }

      const datePart = session.sessionDate.substring(0, 10);
      const startDate = new Date(`${datePart}T${session.startTime}`);

      if (Number.isNaN(startDate.getTime())) {
        return false;
      }

      const elapsed = now.getTime() - startDate.getTime();

      // Show notification during the first minute
      // after the scheduled start time.
      return elapsed >= 0 && elapsed < 60000;
    });

    if (upcoming) {
      this.markAsNotified(upcoming.sessionId);
      this.activeMeeting.set(upcoming);
    }
  }

  private storageKey(sessionId: number): string {
    return `nafadh-meeting-notified-${this.auth.userId}-${sessionId}`;
  }

  private wasNotified(sessionId: number): boolean {
    try {
      return localStorage.getItem(this.storageKey(sessionId)) === 'true';
    } catch {
      return false;
    }
  }

  private markAsNotified(sessionId: number): void {
    try {
      localStorage.setItem(this.storageKey(sessionId), 'true');
    } catch {
      // Storage may be unavailable in some browsers.
    }
  }
}
