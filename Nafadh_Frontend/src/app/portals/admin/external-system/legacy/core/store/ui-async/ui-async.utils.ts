import {
  extractApiErrorCode,
  extractApiErrorMessage,
  extractSupportOccurredAtUtc,
  extractSupportTicketId,
  getNormalizedHttpErrorStatus,
  isSupportTicketWorthyError,
} from '../../api/api-error.util';
import { translateApplicationUploadError } from '../../api/application-upload-error.i18n';
import { translateAuthApiError } from '../../api/auth-api-error.i18n';
import { translateInterviewManagementApiError } from '../../api/interview-management-api-error.i18n';
import { translateRegistrationApiError } from '../../api/registration-api-error.i18n';
import {
  formatNetworkUnreachableUserMessage,
  formatSupportTicketUserMessage,
} from '../../errors/support-ticket.util';
import type { UiAsyncResultKind, UiAsyncSnapshot } from '../../ui/ui-async.types';

export function isoNow(): string {
  return new Date().toISOString();
}

export function messageFromUnknown(error: unknown, fallbackGeneric: string): string {
  if (getNormalizedHttpErrorStatus(error) === 0) {
    return formatNetworkUnreachableUserMessage();
  }

  const uploadMessage = translateApplicationUploadError(error);
  if (uploadMessage) {
    return uploadMessage;
  }

  if (isSupportTicketWorthyError(error)) {
    const ticketId = extractSupportTicketId(error);
    if (ticketId) {
      return formatSupportTicketUserMessage(ticketId, extractSupportOccurredAtUtc(error) ?? isoNow());
    }
  }

  const raw = extractApiErrorMessage(error);
  if (!raw) {
    return fallbackGeneric;
  }
  return translateAuthApiError(
    translateRegistrationApiError(translateInterviewManagementApiError(raw), extractApiErrorCode(error))
  );
}

export function codeFromUnknown(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'status' in error) {
    const s = (error as { status?: unknown }).status;
    if (typeof s === 'number') {
      return `HTTP_${s}`;
    }
  }
  if (error && typeof error === 'object' && 'code' in error) {
    const c = (error as { code?: unknown }).code;
    if (typeof c === 'string' && c.trim()) {
      return c;
    }
  }
  return undefined;
}

/** English fallback when actions bypass {@link AsyncExecutorService} (edge cases). */
export function defaultProgressLabel(): string {
  return 'Please wait…';
}

export function buildSuccessSnapshot(
  message: string | undefined,
  details: unknown,
  defaultDone: string
): UiAsyncSnapshot {
  return {
    kind: 'success',
    message: message?.trim() ? message.trim() : defaultDone,
    details,
    at: isoNow(),
  };
}

export function buildErrorSnapshot(error: unknown, fallbackGeneric: string): UiAsyncSnapshot {
  return {
    kind: 'error',
    message: messageFromUnknown(error, fallbackGeneric),
    code: codeFromUnknown(error),
    details: error,
    at: isoNow(),
  };
}

export function buildManualSnapshot(
  kind: UiAsyncResultKind,
  message: string,
  details?: unknown,
  code?: string
): UiAsyncSnapshot | null {
  if (kind === 'idle') {
    return null;
  }
  return {
    kind,
    message,
    code,
    details,
    at: isoNow(),
  };
}
