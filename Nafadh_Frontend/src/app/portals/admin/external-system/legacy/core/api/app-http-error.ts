/** Normalized HTTP error shape produced by {@link httpErrorInterceptor}. */
export interface AppHttpError {
  status: number;
  /** ASP.NET `Code` when present (e.g. NAFATH_FETCH_FAILED). */
  code?: string;
  message: string;
  details?: unknown;
  /** Support ticket from unexpected API failures. */
  ticketId?: string;
  occurredAtUtc?: string;
}
