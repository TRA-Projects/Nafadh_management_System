import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { ValidationErrorKeys } from './validation-error-keys';

/** Default: Freelancer `VALID_EXTENSIONS`. */
export const DEFAULT_DOCUMENT_EXTENSIONS = ['xls', 'xlsx', 'docx', 'pdf', 'jpg', 'jpeg', 'png', 'gif'] as const;

function extensionOf(file: File): string {
  const parts = file.name.split('.');
  return parts.length > 1 ? (parts.pop() ?? '').toLowerCase() : '';
}

/** Freelancer `validFile`: any `File` with size &gt; 0. */
export function fileNonEmpty(errorKey = ValidationErrorKeys.fileRequired): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    if (v instanceof File && v.size > 0) {
      return null;
    }
    return { [errorKey]: { code: 'VAL_009' } };
  };
}

/** Freelancer `fileRequired` — alias semantics same as `fileNonEmpty`. */
export const fileRequiredContent = fileNonEmpty;

/**
 * Freelancer `validateFileExtension`: if value is empty string or string path, skip;
 * if `File`, enforce extension.
 */
export function fileExtensionAllowed(
  allowed: readonly string[] = DEFAULT_DOCUMENT_EXTENSIONS,
  errorKey = ValidationErrorKeys.invalidFileType
): ValidatorFn {
  const set = new Set(allowed.map((e) => e.toLowerCase()));
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    if (v == null || typeof v === 'string') {
      return null;
    }
    if (!(v instanceof File) || v.size <= 0) {
      return null;
    }
    const ext = extensionOf(v);
    return set.has(ext) ? null : { [errorKey]: { code: 'VAL_022', allowed: [...set] } };
  };
}

export function fileMaxSizeBytes(maxBytes: number, errorKey = 'fileTooLarge'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    if (!(v instanceof File) || v.size <= 0) {
      return null;
    }
    return v.size <= maxBytes ? null : { [errorKey]: { maxBytes } };
  };
}
