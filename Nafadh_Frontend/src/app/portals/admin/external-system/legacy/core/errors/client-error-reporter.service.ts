import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import { AppHttpError } from '../api/app-http-error';
import { ApiPaths } from '../api/api-paths';
import { getRuntimeApiBaseUrl } from '../runtime-config';
import { LocaleService } from '../locale/locale.service';
import { uiAsyncActions } from '../store/ui-async/ui-async.actions';
import {
  createSupportTicketId,
  formatSupportTicketUserMessage,
} from './support-ticket.util';

export interface ClientErrorReportPayload {
  ticketId: string;
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  locale?: string;
  extra?: string;
}

/**
 * Creates support tickets for FE crashes and network failures, POSTs to the API
 * (via HttpBackend to avoid interceptor recursion), and shows a toast when asked.
 */
@Injectable({ providedIn: 'root' })
export class ClientErrorReporter {
  private readonly store = inject(Store);
  private readonly locale = inject(LocaleService);
  private readonly rawHttp = new HttpClient(inject(HttpBackend));

  private lastToastAt = 0;
  private readonly recentKeys = new Map<string, number>();

  /** Attach a local ticket to a network / unexpected client HTTP error (sync). */
  attachLocalTicket(error: AppHttpError): AppHttpError {
    if (error.ticketId?.trim()) {
      return error;
    }
    const ticketId = createSupportTicketId();
    const occurredAtUtc = new Date().toISOString();
    return {
      ...error,
      ticketId,
      occurredAtUtc,
      message: formatSupportTicketUserMessage(ticketId, occurredAtUtc),
    };
  }

  /** Fire-and-forget report for status 0 / -1 (no second toast — AsyncExecutor shows it). */
  reportNetworkFailure(error: AppHttpError): void {
    if (!error.ticketId) {
      return;
    }
    void this.postReport(
      {
        ticketId: error.ticketId,
        message: error.message || 'Network / request failure',
        url: typeof location !== 'undefined' ? location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        locale: this.locale.locale(),
        extra: JSON.stringify({ status: error.status, details: error.details ?? null }).slice(0, 4000),
      },
      { showToast: false }
    );
  }

  /** Global ErrorHandler / unhandledrejection. */
  reportRuntimeError(error: unknown, options?: { showToast?: boolean }): void {
    const showToast = options?.showToast !== false;
    const runtime = error instanceof Error ? error : new Error(String(error));
    const key = `${runtime.name}:${runtime.message}`.slice(0, 200);
    if (this.isThrottled(key)) {
      return;
    }

    const ticketId = createSupportTicketId();
    const occurredAtUtc = new Date().toISOString();
    console.error('[ClientErrorReporter]', ticketId, runtime);

    void this.postReport(
      {
        ticketId,
        message: runtime.message || runtime.name || 'Unhandled client error',
        stack: runtime.stack,
        url: typeof location !== 'undefined' ? location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        locale: this.locale.locale(),
      },
      { showToast, occurredAtUtc }
    );
  }

  installGlobalHandlers(): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.addEventListener('unhandledrejection', (event) => {
      this.reportRuntimeError(event.reason ?? 'unhandledrejection');
    });
  }

  private async postReport(
    payload: ClientErrorReportPayload,
    options: { showToast: boolean; occurredAtUtc?: string }
  ): Promise<void> {
    const occurredAtUtc = options.occurredAtUtc ?? new Date().toISOString();
    let supportNotified = true;

    try {
      const base = getRuntimeApiBaseUrl().replace(/\/?$/, '/');
      const url = `${base}${ApiPaths.supportClientErrorReport.replace(/^\//, '')}`;
      await firstValueFrom(
        this.rawHttp.post<{ ticketId?: string; occurredAtUtc?: string; emailed?: boolean }>(url, payload)
      );
    } catch {
      supportNotified = false;
    }

    if (options.showToast) {
      this.toastTicket(payload.ticketId, occurredAtUtc, supportNotified);
    } else if (!supportNotified) {
      console.warn('[ClientErrorReporter] could not notify support for', payload.ticketId);
    }
  }

  private toastTicket(ticketId: string, occurredAtUtc: string, supportNotified: boolean): void {
    const now = Date.now();
    if (now - this.lastToastAt < 3000) {
      return;
    }
    this.lastToastAt = now;
    const message = formatSupportTicketUserMessage(ticketId, occurredAtUtc, { supportNotified });
    this.store.dispatch(
      uiAsyncActions.recordError({
        error: { status: -1, message, ticketId, occurredAtUtc },
        fallbackMessage: message,
      })
    );
  }

  private isThrottled(key: string): boolean {
    const now = Date.now();
    const last = this.recentKeys.get(key);
    if (last != null && now - last < 10_000) {
      return true;
    }
    this.recentKeys.set(key, now);
    if (this.recentKeys.size > 100) {
      for (const [k, t] of this.recentKeys) {
        if (now - t > 60_000) {
          this.recentKeys.delete(k);
        }
      }
    }
    return false;
  }
}
