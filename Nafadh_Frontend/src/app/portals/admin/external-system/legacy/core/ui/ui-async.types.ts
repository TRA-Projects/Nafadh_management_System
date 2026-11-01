export type UiAsyncResultKind = 'idle' | 'success' | 'error';

/** Last completed async outcome (for banners, toasts, or inline messages). */
export interface UiAsyncSnapshot {
  kind: UiAsyncResultKind;
  message: string;
  code?: string;
  details?: unknown;
  at: string;
}

export interface AsyncExecuteOptions<T = unknown> {
  /** When false, `inProgress` / overlay are not toggled (still tracks snapshot if enabled). Default true. */
  showProgress?: boolean;
  /** Shown in the global loading overlay while work runs. */
  progressMessage?: string;
  /** When true (default), updates `lastSnapshot` on success. */
  recordSuccess?: boolean;
  /** Optional human-readable success message stored in `lastSnapshot`. */
  successMessage?: string;
  onSuccess?: (value: T) => void;
  onError?: (error: unknown) => void;
  /** Runs after success or failure (like `finally`). */
  finalize?: () => void | Promise<void>;
}
