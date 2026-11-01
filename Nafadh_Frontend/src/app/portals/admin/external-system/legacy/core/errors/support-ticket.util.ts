/**
 * Client-side support ticket helpers (readable id embeds UTC date/time).
 * Format: JS-yyyyMMdd-HHmmss-XXXX
 */

export function createSupportTicketId(at: Date = new Date()): string {
  const pad = (n: number, len = 2): string => String(n).padStart(len, '0');
  const stamp =
    `${at.getUTCFullYear()}${pad(at.getUTCMonth() + 1)}${pad(at.getUTCDate())}` +
    `-${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}${pad(at.getUTCSeconds())}`;
  const suffix = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `JS-${stamp}-${suffix}`;
}

export function formatTicketWhenUtc(isoOrDate: string | Date | null | undefined): string {
  const d =
    typeof isoOrDate === 'string'
      ? new Date(isoOrDate)
      : isoOrDate instanceof Date
        ? isoOrDate
        : new Date();
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  }
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`
  );
}

/** Localized message when the API/host cannot be reached (no support ticket). */
export function formatNetworkUnreachableUserMessage(): string {
  return $localize`:@@jobseeker.support.networkUnreachable:Unable to reach the server. Please check your connection and try again.`;
}

/** Localized user-facing ticket line (English source for $localize). */
export function formatSupportTicketUserMessage(
  ticketId: string,
  occurredAtUtc: string | Date | null | undefined,
  options?: { supportNotified?: boolean }
): string {
  const when = formatTicketWhenUtc(occurredAtUtc);
  if (options?.supportNotified === false) {
    return $localize`:@@jobseeker.support.ticketMessageOffline:Something went wrong. Contact NAFADH support with ticket ${ticketId}:ticketId: (${when}:when:). Support could not be notified automatically.`;
  }
  return $localize`:@@jobseeker.support.ticketMessage:Something went wrong. Contact NAFADH support with ticket ${ticketId}:ticketId: (${when}:when:).`;
}
