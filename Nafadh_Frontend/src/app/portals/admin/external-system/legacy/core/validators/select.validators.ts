import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { ValidationErrorKeys } from './validation-error-keys';

const DEFAULT_PLACEHOLDER = 'Choose...';

/**
 * Freelancer `selectRequired`: value must not be empty and not the placeholder label.
 * Pass `placeholders` for localized placeholders (e.g. `['Choose...', 'اختر...']`).
 */
export function selectNotPlaceholder(
  placeholders: string[] = [DEFAULT_PLACEHOLDER],
  errorKey = ValidationErrorKeys.selectRequired
): ValidatorFn {
  const set = new Set(placeholders.map((p) => p.trim()));
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    if (v === null || v === undefined) {
      return { [errorKey]: { code: 'VAL_010' } };
    }
    const s = typeof v === 'string' ? v.trim() : String(v);
    if (s === '' || set.has(s)) {
      return { [errorKey]: { code: 'VAL_010' } };
    }
    return null;
  };
}
