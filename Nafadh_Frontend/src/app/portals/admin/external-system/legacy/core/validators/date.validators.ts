import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

import { ValidationErrorKeys } from './validation-error-keys';

/**
 * Parses `<input type="date">` values (`yyyy-MM-dd`), ISO strings, or `Date`.
 * Returns `null` if empty or invalid (let `Validators.required` handle empties).
 */
export function parseIsoDateInput(value: unknown): Date | null {
  if (value == null || value === '') {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : startOfDayUtc(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const d = new Date(trimmed.length === 10 ? `${trimmed}T00:00:00` : trimmed);
    return Number.isNaN(d.getTime()) ? null : startOfDayUtc(d);
  }
  return null;
}

function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

function refDateFor(control: AbstractControl, ref: 'today' | string): Date | null {
  if (ref === 'today') {
    return todayUtc();
  }
  const parent = control.parent;
  if (!parent) {
    return null;
  }
  return parseIsoDateInput(parent.get(ref)?.value);
}

/**
 * Freelancer `notEarlierThan`: input must be **strictly before** the reference date
 * (`'today'` or another control name). Invalid if `input &gt;= ref`.
 */
export function notEarlierThan(
  ref: 'today' | string,
  errorKey = ValidationErrorKeys.earlierDate
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const input = parseIsoDateInput(control.value);
    if (!input) {
      return null;
    }
    const r = refDateFor(control, ref);
    if (!r) {
      return null;
    }
    return input.getTime() < r.getTime() ? null : { [errorKey]: { ref, code: 'VAL_015' } };
  };
}

/**
 * Freelancer `notOlderThan`: input must be **on or after** the reference date.
 * Invalid if `input &lt; ref`.
 */
export function notOlderThan(
  ref: 'today' | string,
  errorKey = ValidationErrorKeys.olderDate
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const input = parseIsoDateInput(control.value);
    if (!input) {
      return null;
    }
    const r = refDateFor(control, ref);
    if (!r) {
      return null;
    }
    return input.getTime() >= r.getTime() ? null : { [errorKey]: { ref, code: 'VAL_017' } };
  };
}

/**
 * `<input type="datetime-local">` (or ISO) value must not be earlier than now minus `toleranceMs`.
 * Empty values pass (let `Validators.required` handle empties).
 */
export function dateTimeNotInPast(
  errorKey: string = ValidationErrorKeys.notificationSchedulePast,
  toleranceMs = 60_000,
  now: () => Date = () => new Date()
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = typeof control.value === 'string' ? control.value.trim() : control.value;
    if (raw == null || raw === '') {
      return null;
    }
    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return { [ValidationErrorKeys.invalidDate]: true };
    }
    return d.getTime() >= now().getTime() - toleranceMs ? null : { [errorKey]: true };
  };
}

/** This control's date must be on or before the given reference day (default: today). */
export function dateOnOrBeforeDay(refDay: () => Date = todayUtc, errorKey = 'dateOnOrBefore'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const d = parseIsoDateInput(control.value);
    if (!d) {
      return null;
    }
    const ref = refDay();
    return d.getTime() <= ref.getTime() ? null : { [errorKey]: { max: ref.toISOString().slice(0, 10) } };
  };
}

/** This control's date must be on or after the given reference day (default: today). */
export function dateOnOrAfterDay(refDay: () => Date = todayUtc, errorKey = 'dateOnOrAfter'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const d = parseIsoDateInput(control.value);
    if (!d) {
      return null;
    }
    const ref = refDay();
    return d.getTime() >= ref.getTime() ? null : { [errorKey]: { min: ref.toISOString().slice(0, 10) } };
  };
}

/**
 * Compare this control to a sibling on the same parent `FormGroup`.
 * Current value must be **strictly before** `otherKey`'s value (e.g. start &lt; end).
 */
export function dateBeforeSibling(otherKey: string, errorKey = 'dateBefore'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const parent = control.parent;
    if (!parent) {
      return null;
    }
    const self = parseIsoDateInput(control.value);
    const other = parseIsoDateInput(parent.get(otherKey)?.value);
    if (!self || !other) {
      return null;
    }
    return self.getTime() < other.getTime() ? null : { [errorKey]: { otherKey } };
  };
}

/**
 * Compare this control to a sibling: current value must be **after** `otherKey`.
 */
export function dateAfterSibling(otherKey: string, errorKey = 'dateAfter'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const parent = control.parent;
    if (!parent) {
      return null;
    }
    const self = parseIsoDateInput(control.value);
    const other = parseIsoDateInput(parent.get(otherKey)?.value);
    if (!self || !other) {
      return null;
    }
    return self.getTime() > other.getTime() ? null : { [errorKey]: { otherKey } };
  };
}

/**
 * Attach to the **FormGroup** so both fields are validated together when either changes.
 * Ensures `startKey` date is &lt;= `endKey` date.
 */
export function dateRangeOrder(startKey: string, endKey: string, errorKey = 'dateRangeOrder'): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    if (!(group instanceof FormGroup)) {
      return null;
    }
    const d1 = parseIsoDateInput(group.get(startKey)?.value);
    const d2 = parseIsoDateInput(group.get(endKey)?.value);
    if (!d1 || !d2) {
      return null;
    }
    return d1.getTime() <= d2.getTime() ? null : { [errorKey]: { startKey, endKey } };
  };
}
