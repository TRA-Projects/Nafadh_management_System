import { HttpErrorResponse } from '@angular/common/http';

/** Extracts a readable Arabic message from the error shapes the backend returns. */
export function messageOf(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'تعذر الاتصال بالخادم.';
    if (err.status === 401) return 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً.';

    const body = err.error;
    if (typeof body === 'string' && body.trim()) return body;
    if (body?.message) return body.message;
    if (body?.errors && typeof body.errors === 'object') {
      const first = Object.values(body.errors as Record<string, string[]>)[0];
      if (Array.isArray(first) && first.length) return first[0];
    }
    if (err.status === 403) return 'لا تملك صلاحية تنفيذ هذا الإجراء.';
  }
  return fallback;
}

/** yyyy-MM-dd in local time (for <input type="date">). */
export function toInputDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB');
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString('en-GB')} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}
