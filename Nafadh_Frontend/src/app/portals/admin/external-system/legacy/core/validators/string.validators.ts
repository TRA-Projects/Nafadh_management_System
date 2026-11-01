import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { ValidationErrorKeys } from './validation-error-keys';

/** Same pattern as Freelancer `validations.js` `email`. */
const EMAIL_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

/** Latin letters and spaces only (Freelancer `name`). */
const NAME_REGEX = /^[A-Za-z]+(?:[ ][A-Za-z]+)*$/;

/** Special char + uppercase (Freelancer `password`). */
const PASSWORD_REGEX = /^(?=.*[!@#$%^&*(),.?{}|<>])(?=.*[A-Z]).*$/;

/** Digits with optional leading `+` (Freelancer `phone`). */
const PHONE_REGEX = /^(?:\+?\d+)$/;

function strVal(control: AbstractControl): string {
  const v = control.value;
  if (v == null) {
    return '';
  }
  return typeof v === 'string' ? v : String(v);
}

/** Non-empty after trim (stricter than `Validators.required` for strings). */
export function requiredTrimmed(errorKey = ValidationErrorKeys.requiredTrimmed): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const s = strVal(control).trim();
    return s !== '' ? null : { [errorKey]: true };
  };
}

export function emailFormat(errorKey = ValidationErrorKeys.invalidEmail): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const s = strVal(control).trim();
    if (s === '') {
      return null;
    }
    return EMAIL_REGEX.test(s) ? null : { [errorKey]: { code: 'VAL_005' } };
  };
}

export function nameLatinWords(errorKey = ValidationErrorKeys.invalidName): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const s = strVal(control).trim();
    if (s === '') {
      return null;
    }
    return NAME_REGEX.test(s) ? null : { [errorKey]: true };
  };
}

export function passwordFreelancerRules(errorKey = ValidationErrorKeys.passwordMinReq): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const s = strVal(control);
    if (s === '') {
      return null;
    }
    return PASSWORD_REGEX.test(s) ? null : { [errorKey]: { code: 'VAL_018' } };
  };
}

export function phoneDigits(errorKey = ValidationErrorKeys.invalidPhone): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const s = strVal(control).trim();
    if (s === '') {
      return null;
    }
    return PHONE_REGEX.test(s) ? null : { [errorKey]: { code: 'VAL_006' } };
  };
}

/** Prepends `https://` when the user omitted a scheme (e.g. `moheri.gov.om/path`). */
export function normalizeUrlInput(raw: string): string {
  const s = raw.trim();
  if (!s) {
    return s;
  }
  if (/^https?:\/\//i.test(s)) {
    return s;
  }
  return `https://${s}`;
}

function isValidWebUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s) {
    return false;
  }
  try {
    const parsed = new URL(normalizeUrlInput(s));
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

/**
 * Optional URL: empty is valid; non-empty must be a parseable http(s) URL.
 */
export function linkOptional(errorKey = ValidationErrorKeys.invalidLink): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const s = strVal(control).trim();
    if (s === '') {
      return null;
    }
    return isValidWebUrl(s) ? null : { [errorKey]: { code: 'VAL_014' } };
  };
}

/** Required http(s) URL — trims whitespace; accepts domains without a scheme. */
export function linkRequired(errorKey = ValidationErrorKeys.invalidLink): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const s = strVal(control).trim();
    if (s === '') {
      return { required: true };
    }
    return isValidWebUrl(s) ? null : { [errorKey]: { code: 'VAL_014' } };
  };
}

/**
 * Rich text / Quill: non-empty visible text after stripping HTML (Freelancer `validateQuill`).
 */
export function richTextRequired(errorKey = ValidationErrorKeys.richTextRequired): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = strVal(control);
    const text = raw.replace(/<[^>]*>/g, '').trim();
    return text !== '' ? null : { [errorKey]: { code: 'VAL_002' } };
  };
}
