import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';

import type { AppHttpError } from '../api/app-http-error';
import { ClientErrorReporter } from './client-error-reporter.service';

function unwrapError(error: unknown): unknown {
  if (!error || typeof error !== 'object') {
    return error;
  }
  const record = error as { rejection?: unknown; ngOriginalError?: unknown };
  if (record.rejection != null) {
    return unwrapError(record.rejection);
  }
  if (record.ngOriginalError != null) {
    return unwrapError(record.ngOriginalError);
  }
  return error;
}

/** HTTP failures are already toasted via AsyncExecutor / interceptor tickets. */
function isHandledHttpError(error: unknown): boolean {
  if (error instanceof HttpErrorResponse) {
    return true;
  }
  if (!error || typeof error !== 'object') {
    return false;
  }
  const e = error as Partial<AppHttpError>;
  return typeof e.status === 'number' && typeof e.message === 'string';
}

/**
 * Must not constructor-inject Store-backed services — StoreDevtools also depends on ErrorHandler
 * (NG0200 cycle: ErrorHandler → ClientErrorReporter → Store → StoreDevtools → ErrorHandler).
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly injector = inject(Injector);

  handleError(error: unknown): void {
    const unwrapped = unwrapError(error);
    if (isHandledHttpError(unwrapped)) {
      console.error('[Global Error][HTTP]', unwrapped);
      return;
    }
    try {
      this.injector.get(ClientErrorReporter).reportRuntimeError(unwrapped, { showToast: true });
    } catch (reportError) {
      console.error('[Global Error]', unwrapped);
      console.error('[Global Error][report failed]', reportError);
    }
  }
}
