/// <reference types="@angular/localize" />

import { extractApiErrorCode, extractApiErrorMessage, getNormalizedHttpErrorStatus } from './api-error.util';

/** Stable API copy for an application file that is over ATTACHMENT_MAX_SIZE_MB. */
export const APPLICATION_FILE_TOO_LARGE_MESSAGE = 'The file exceeds the maximum allowed size.';

/** Stable API copy for an application file whose extension is not allowed. */
export const APPLICATION_INVALID_FILE_TYPE_MESSAGE = 'File type is not allowed.';

/**
 * Localized message when an application upload failed because the file is too large
 * or the host rejected the body. Returns null for unrelated errors.
 */
export function translateApplicationUploadError(error: unknown): string | null {
  const status = getNormalizedHttpErrorStatus(error);
  const code = (extractApiErrorCode(error) ?? '').trim().toLowerCase();
  const raw = (extractApiErrorMessage(error) ?? '').trim();
  const bodyTooLarge =
    status === 413 ||
    /request body too large/i.test(raw) ||
    /request entity too large/i.test(raw);

  if (code === 'file_too_large' || raw === APPLICATION_FILE_TOO_LARGE_MESSAGE || bodyTooLarge) {
    return $localize`:@@validation.fileExceedsAllowedSize:The file exceeds the maximum allowed size.`;
  }

  if (code === 'invalid_file_type' || raw === APPLICATION_INVALID_FILE_TYPE_MESSAGE) {
    return $localize`:@@validation.invalidFileType:File type is not allowed`;
  }

  return null;
}
