import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { ValidationErrorKeys } from './validation-error-keys';

function numVal(control: AbstractControl): string | number | null | undefined {
  return control.value as string | number | null | undefined;
}

/** Parses optional numeric input; returns `null` when empty or not finite. */
export function parseOptionalNumber(value: unknown): number | null {
  if (value === '' || value == null) {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Freelancer `number`: finite numeric string or number, not empty. */
export function numericValue(errorKey = ValidationErrorKeys.invalidNumberFormat): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = numVal(control);
    if (v === '' || v === null || v === undefined) {
      return null;
    }
    const n = Number(v);
    return !Number.isNaN(n) ? null : { [errorKey]: { code: 'VAL_013' } };
  };
}

/** Freelancer `notZero`. */
export function notZero(errorKey = ValidationErrorKeys.invalidNumberVal): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = numVal(control);
    if (v === '' || v === null || v === undefined) {
      return null;
    }
    const n = Number(v);
    if (Number.isNaN(n)) {
      return { [errorKey]: { code: 'VAL_021' } };
    }
    return n !== 0 ? null : { [errorKey]: { code: 'VAL_021' } };
  };
}

export function minNumber(min: number, errorKey = ValidationErrorKeys.numberBelowRange): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = numVal(control);
    if (v === '' || v === null || v === undefined) {
      return null;
    }
    const n = Number(v);
    if (!Number.isFinite(n)) {
      return null;
    }
    return n >= min ? null : { [errorKey]: { code: 'VAL_024', min } };
  };
}

/** Parses a 4-digit year string; returns `null` when empty or not exactly four digits. */
export function parseFourDigitYear(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }
  const text = String(value).trim();
  if (!/^\d{4}$/.test(text)) {
    return null;
  }
  const year = Number(text);
  return Number.isFinite(year) ? year : null;
}

function resolveMaxYear(maxYear: number | (() => number)): number {
  return typeof maxYear === 'function' ? maxYear() : maxYear;
}

/** Year between `minYear` and `maxYear` (inclusive). Defaults `maxYear` to the current calendar year. */
export function validYearInRange(
  minYear: number,
  maxYear: number | (() => number) = () => new Date().getFullYear(),
  errorKey = ValidationErrorKeys.invalidYear
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const year = parseFourDigitYear(control.value);
    if (year == null) {
      return null;
    }
    const max = resolveMaxYear(maxYear);
    if (year < minYear || year > max) {
      return { [errorKey]: { code: 'VAL_012', min: minYear, max } };
    }
    return null;
  };
}

/** Year between 1900 and current year (Freelancer `validYear`). */
export function validYear(errorKey = ValidationErrorKeys.invalidYear): ValidatorFn {
  return validYearInRange(1900, () => new Date().getFullYear(), errorKey);
}

/** Education start/end year: 1980 through the current year. */
export const EDUCATION_YEAR_MIN = 1980;

export function educationYear(errorKey = ValidationErrorKeys.invalidYear): ValidatorFn {
  return validYearInRange(EDUCATION_YEAR_MIN, () => new Date().getFullYear(), errorKey);
}

/** Freelancer `isCivilId`: 5–12 digits (note: legacy used wrong error code in JS). */
export function civilIdDigits(errorKey = ValidationErrorKeys.invalidIdNumber): ValidatorFn {
  const regex = /^[0-9]{5,12}$/;
  return (control: AbstractControl): ValidationErrors | null => {
    const s = control.value == null ? '' : String(control.value).trim();
    if (s === '') {
      return null;
    }
    return regex.test(s) ? null : { [errorKey]: { code: 'VAL_023' } };
  };
}
