import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

import { parseFourDigitYear, parseOptionalNumber } from './number.validators';
import { ValidationErrorKeys } from './validation-error-keys';

/**
 * Two controls must have the same string value (Freelancer `matchValue` for confirm password).
 * Attach to the **confirm** control, or use on FormGroup with `mustMatchFields('password','confirm')`.
 */
export function mustMatchSibling(
  otherControlName: string,
  errorKey = ValidationErrorKeys.mismatch
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const parent = control.parent;
    if (!parent) {
      return null;
    }
    const other = parent.get(otherControlName);
    if (!other) {
      return null;
    }
    const a = control.value == null ? '' : String(control.value);
    const b = other.value == null ? '' : String(other.value);
    return a === b ? null : { [errorKey]: { code: 'VAL_007', other: otherControlName } };
  };
}

/** FormGroup-level: `a` and `b` must match (e.g. password / confirm). */
export function mustMatchFields(aKey: string, bKey: string, errorKey = ValidationErrorKeys.mismatch): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    if (!(group instanceof FormGroup)) {
      return null;
    }
    const a = group.get(aKey);
    const b = group.get(bKey);
    if (!a || !b) {
      return null;
    }
    const av = a.value == null ? '' : String(a.value);
    const bv = b.value == null ? '' : String(b.value);
    return av === bv ? null : { [errorKey]: { code: 'VAL_007', aKey, bKey } };
  };
}

/**
 * Freelancer `unique`: current control value must not appear in `forbiddenValues()`.
 * Typical use: password not in a leaked list.
 */
export function valueNotInList(
  forbiddenValues: () => readonly string[],
  errorKey = ValidationErrorKeys.notUnique
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value == null ? '' : String(control.value);
    if (val === '') {
      return null;
    }
    const list = forbiddenValues();
    return list.includes(val) ? { [errorKey]: true } : null;
  };
}

/**
 * Freelancer `oneSelected`: at least one object in the array has a truthy `field`.
 * Control value must be `object[]`.
 */
/** Current numeric value must be less than or equal to the sibling (e.g. min wage ≤ max wage). */
export function numberOnOrBeforeSibling(
  siblingKey: string,
  errorKey = ValidationErrorKeys.numberAboveSibling
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const parent = control.parent;
    if (!parent) {
      return null;
    }
    const current = parseOptionalNumber(control.value);
    const sibling = parseOptionalNumber(parent.get(siblingKey)?.value);
    if (current == null || sibling == null) {
      return null;
    }
    return current <= sibling ? null : { [errorKey]: { siblingKey, code: 'VAL_026' } };
  };
}

/** Current numeric value must be greater than or equal to the sibling (e.g. max wage ≥ min wage). */
export function numberOnOrAfterSibling(
  siblingKey: string,
  errorKey = ValidationErrorKeys.numberBelowSibling
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const parent = control.parent;
    if (!parent) {
      return null;
    }
    const current = parseOptionalNumber(control.value);
    const sibling = parseOptionalNumber(parent.get(siblingKey)?.value);
    if (current == null || sibling == null) {
      return null;
    }
    return current >= sibling ? null : { [errorKey]: { siblingKey, code: 'VAL_027' } };
  };
}

/** End year must be on or after the sibling start year (4-digit year fields). */
export function yearOnOrAfterSibling(startKey: string, errorKey = 'yearRangeOrder'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const parent = control.parent;
    if (!parent) {
      return null;
    }
    const endYear = parseFourDigitYear(control.value);
    const startYear = parseFourDigitYear(parent.get(startKey)?.value);
    if (endYear == null || startYear == null) {
      return null;
    }
    return endYear >= startYear ? null : { [errorKey]: { startKey, code: 'VAL_016' } };
  };
}

/** End year must be at most `maxSpan` years after the sibling start year. */
export function yearWithinSpanAfterSibling(
  startKey: string,
  maxSpan: number,
  errorKey = 'yearSpanExceeded'
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const parent = control.parent;
    if (!parent) {
      return null;
    }
    const endYear = parseFourDigitYear(control.value);
    const startYear = parseFourDigitYear(parent.get(startKey)?.value);
    if (endYear == null || startYear == null) {
      return null;
    }
    return endYear <= startYear + maxSpan ? null : { [errorKey]: { startKey, maxSpan, code: 'VAL_025' } };
  };
}

/** Group validator: at least one of the named boolean controls must be `true`. */
export function anyControlTrue(keys: readonly string[], errorKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const ok = keys.some((k) => group.get(k)?.value === true);
    return ok ? null : { [errorKey]: true };
  };
}

export function oneObjectSelected(field: string, errorKey = ValidationErrorKeys.oneSelected): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    if (!Array.isArray(v) || v.length === 0) {
      return { [errorKey]: { field } };
    }
    const ok = v.some((obj) => obj && typeof obj === 'object' && (obj as Record<string, unknown>)[field]);
    return ok ? null : { [errorKey]: { field } };
  };
}
