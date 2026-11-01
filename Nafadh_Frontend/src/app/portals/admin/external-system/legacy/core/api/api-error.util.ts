import { HttpErrorResponse } from '@angular/common/http';

/** Shape produced by {@link httpErrorInterceptor} (duplicated here to avoid import cycles). */
interface NormalizedHttpError {
  status: number;
  code?: string;
  message: string;
  details?: unknown;
  ticketId?: string;
  occurredAtUtc?: string;
}

function isNormalizedHttpError(err: unknown): err is NormalizedHttpError {
  return (
    !!err &&
    typeof err === 'object' &&
    'status' in err &&
    typeof (err as NormalizedHttpError).status === 'number' &&
    'message' in err &&
    typeof (err as NormalizedHttpError).message === 'string'
  );
}

function descriptionFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const record = body as Record<string, unknown>;
  if (typeof record['Description'] === 'string' && record['Description'].trim()) {
    return record['Description'].trim();
  }
  if (typeof record['Message'] === 'string' && record['Message'].trim()) {
    return record['Message'].trim();
  }
  if (typeof record['error'] === 'string' && record['error'].trim()) {
    return record['error'].trim();
  }
  return null;
}

function codeFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const record = body as Record<string, unknown>;
  for (const key of ['Code', 'code'] as const) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function ticketIdFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const record = body as Record<string, unknown>;
  for (const key of ['TicketId', 'ticketId'] as const) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function occurredAtFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const record = body as Record<string, unknown>;
  for (const key of ['OccurredAtUtc', 'occurredAtUtc'] as const) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString();
    }
  }
  return null;
}

/** Support ticket id from API 500 body or normalized interceptor error. */
export function extractSupportTicketId(err: unknown): string | null {
  if (isNormalizedHttpError(err)) {
    const fromSelf =
      err && typeof err === 'object' && 'ticketId' in err
        ? (err as { ticketId?: unknown }).ticketId
        : undefined;
    if (typeof fromSelf === 'string' && fromSelf.trim()) {
      return fromSelf.trim();
    }
    if (err.details != null) {
      const fromDetails = ticketIdFromBody(err.details);
      if (fromDetails) {
        return fromDetails;
      }
    }
  }
  if (err instanceof HttpErrorResponse) {
    return ticketIdFromBody(err.error);
  }
  if (err && typeof err === 'object' && 'ticketId' in err) {
    const t = (err as { ticketId?: unknown }).ticketId;
    if (typeof t === 'string' && t.trim()) {
      return t.trim();
    }
  }
  return null;
}

/** UTC timestamp from API ticket payload. */
export function extractSupportOccurredAtUtc(err: unknown): string | null {
  if (isNormalizedHttpError(err)) {
    const fromSelf =
      err && typeof err === 'object' && 'occurredAtUtc' in err
        ? (err as { occurredAtUtc?: unknown }).occurredAtUtc
        : undefined;
    if (typeof fromSelf === 'string' && fromSelf.trim()) {
      return fromSelf.trim();
    }
    if (err.details != null) {
      const fromDetails = occurredAtFromBody(err.details);
      if (fromDetails) {
        return fromDetails;
      }
    }
  }
  if (err instanceof HttpErrorResponse) {
    return occurredAtFromBody(err.error);
  }
  if (err && typeof err === 'object' && 'occurredAtUtc' in err) {
    const t = (err as { occurredAtUtc?: unknown }).occurredAtUtc;
    if (typeof t === 'string' && t.trim()) {
      return t.trim();
    }
  }
  return null;
}

/** Read ASP.NET `Code` from the error body or normalized interceptor shape. */
export function extractApiErrorCode(err: unknown): string | null {
  if (isNormalizedHttpError(err) && err.code?.trim()) {
    return err.code.trim();
  }
  if (isNormalizedHttpError(err) && err.details != null) {
    const fromDetails = codeFromBody(err.details);
    if (fromDetails) {
      return fromDetails;
    }
  }
  if (err instanceof HttpErrorResponse) {
    return codeFromBody(err.error);
  }
  if (err && typeof err === 'object' && 'code' in err) {
    const c = (err as { code?: unknown }).code;
    if (typeof c === 'string' && c.trim()) {
      return c.trim();
    }
  }
  return null;
}

/** Read ASP.NET `Description` / `Message`, or normalized interceptor message. */
export function extractApiErrorMessage(err: unknown): string | null {
  if (err instanceof HttpErrorResponse) {
    const fromBody = descriptionFromBody(err.error);
    if (fromBody) {
      return fromBody;
    }
    if (typeof err.error === 'string' && err.error.trim()) {
      return err.error.trim();
    }
    if (err.message?.trim()) {
      return err.message.trim();
    }
  }
  if (isNormalizedHttpError(err) && err.message.trim()) {
    return err.message.trim();
  }
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) {
      return m.trim();
    }
  }
  if (typeof err === 'string' && err.trim()) {
    return err.trim();
  }
  return null;
}

/** HTTP status from {@link HttpErrorResponse} or normalized interceptor error shape. */
export function getNormalizedHttpErrorStatus(err: unknown): number | null {
  if (err instanceof HttpErrorResponse) {
    return err.status;
  }
  if (isNormalizedHttpError(err)) {
    return err.status;
  }
  return null;
}

/** True for unexpected failures that should show a support ticket (not validation 4xx). */
export function isSupportTicketWorthyError(err: unknown): boolean {
  const status = getNormalizedHttpErrorStatus(err);
  // Status 0 = browser could not reach the host — show connectivity copy, not a ticket.
  if (status === 0) {
    return false;
  }
  // Status -1 is used for client-side reports; only ticket-worthy when a ticket id exists.
  if (status === -1) {
    return extractSupportTicketId(err) != null;
  }
  if (status != null && status >= 500) {
    return true;
  }
  return extractSupportTicketId(err) != null;
}

/**
 * Scoped interview evaluation GET: enrollment exists but no AssessmentResult row yet (HTTP 404).
 * Enrollment-not-found 404 responses must still propagate to callers.
 */
export function isInterviewNoEvaluationYetError(err: unknown): boolean {
  if (getNormalizedHttpErrorStatus(err) !== 404) {
    return false;
  }
  const msg = extractApiErrorMessage(err)?.toLowerCase() ?? '';
  return msg.includes('no evaluation found for enrollment');
}
