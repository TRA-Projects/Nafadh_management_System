/// <reference types="@angular/localize" />

import { extractApiErrorCode, extractApiErrorMessage } from './api-error.util';

const PHONE_EXISTS = /^User with phone number '([^']+)' already exists\.?$/i;
const EMAIL_EXISTS = /^User with email '([^']+)' already exists\.?$/i;
const CIVIL_ID_EXISTS = /^User with civil ID '([^']+)' already exists\.?$/i;

/** Backend `Code` values from Nafath JobSeeker integration (`NafathJobSeekerErrorCodes`). */
export const NAFATH_ERROR_CODES = {
  FetchFailed: 'NAFATH_FETCH_FAILED',
  NoData: 'NAFATH_NO_DATA',
  Inactive: 'NAFATH_INACTIVE',
} as const;

/** Map ASP.NET error `Code` / `Description` to localized copy (EN source + AR via messages.ar.json). */
export function translateRegistrationApiError(message: string, code?: string | null): string {
  const normalizedCode = (code ?? '').trim().toUpperCase();
  if (normalizedCode === NAFATH_ERROR_CODES.FetchFailed) {
    return $localize`:@@jobseeker.registration.error.nafathFetchFailed:Failed to fetch jobseekers data.`;
  }
  if (normalizedCode === NAFATH_ERROR_CODES.NoData) {
    return $localize`:@@jobseeker.registration.error.nafathNoData:No jobseeker data found for this civil ID.`;
  }
  if (normalizedCode === NAFATH_ERROR_CODES.Inactive) {
    return translateNafathInactive(message);
  }

  const trimmed = (message ?? '').trim();
  if (!trimmed) {
    return message;
  }

  const phone = PHONE_EXISTS.exec(trimmed);
  if (phone) {
    const value = phone[1];
    return $localize`:@@jobseeker.registration.error.phoneExists:User with phone number '${value}:phone:' already exists.`;
  }

  const email = EMAIL_EXISTS.exec(trimmed);
  if (email) {
    const value = email[1];
    return $localize`:@@jobseeker.registration.error.emailExists:User with email '${value}:email:' already exists.`;
  }

  const civilId = CIVIL_ID_EXISTS.exec(trimmed);
  if (civilId) {
    const value = civilId[1];
    return $localize`:@@jobseeker.registration.error.civilIdExists:User with civil ID '${value}:civilId:' already exists.`;
  }

  // ASP.NET `[EmailAddress]` / DataAnnotations on registration DTOs (toast path).
  if (/^Invalid email format\.?$/i.test(trimmed)) {
    return $localize`:@@validation.invalidEmail:Enter a valid email address`;
  }

  // Fallback when older responses omit Code but keep English Description.
  if (trimmed === 'Failed to fetch jobseekers data.') {
    return $localize`:@@jobseeker.registration.error.nafathFetchFailed:Failed to fetch jobseekers data.`;
  }
  if (trimmed === 'No jobseeker data found for this civil ID.') {
    return $localize`:@@jobseeker.registration.error.nafathNoData:No jobseeker data found for this civil ID.`;
  }
  if (trimmed.startsWith('Civil ID is not registered as an active job seeker.')) {
    return translateNafathInactive(trimmed);
  }

  return trimmed;
}

function displayFound(value: string): string {
  const v = (value ?? '').trim();
  return v ? v : $localize`:@@jobseeker.common.na:—`;
}

function parseNafathInactiveDetail(message: string): {
  flag: string;
  flagOk: boolean;
  expiry: string;
  expiryOk: boolean;
  mode: string;
} | null {
  const idx = (message ?? '').indexOf('|flag=');
  if (idx < 0) {
    return null;
  }
  const map: Record<string, string> = {};
  for (const part of message.slice(idx).split('|')) {
    if (!part) {
      continue;
    }
    const eq = part.indexOf('=');
    if (eq < 0) {
      continue;
    }
    map[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return {
    flag: map['flag'] ?? '',
    flagOk: map['flagOk'] === '1',
    expiry: map['expiry'] ?? '',
    expiryOk: map['expiryOk'] === '1',
    mode: (map['mode'] ?? '').toUpperCase(),
  };
}

function translateNafathInactive(message: string): string {
  const d = parseNafathInactiveDetail(message);
  if (!d) {
    return $localize`:@@jobseeker.registration.error.nafathInactive:Civil ID is not registered as an active job seeker.`;
  }
  const flag = displayFound(d.flag);
  const expiry = displayFound(d.expiry);
  if (d.mode === 'ACTIVE_FLAG') {
    return $localize`:@@jobseeker.registration.error.nafathInactiveFlag:This civil ID is not an active job seeker. Active flag found: ${flag}:flag: (expected Y).`;
  }
  if (d.mode === 'EXPIRY_DATE') {
    return $localize`:@@jobseeker.registration.error.nafathInactiveExpiry:This civil ID is not an active job seeker. Expiry date found: ${expiry}:expiry: (must be after today).`;
  }
  if (!d.flagOk && !d.expiryOk) {
    return $localize`:@@jobseeker.registration.error.nafathInactiveBoth:This civil ID is not an active job seeker. Active flag found: ${flag}:flag: (expected Y). Expiry date found: ${expiry}:expiry: (must be after today).`;
  }
  if (!d.flagOk) {
    return $localize`:@@jobseeker.registration.error.nafathInactiveFlagWithExpiry:This civil ID is not an active job seeker. Active flag found: ${flag}:flag: (expected Y). Expiry date found: ${expiry}:expiry:.`;
  }
  return $localize`:@@jobseeker.registration.error.nafathInactiveExpiryWithFlag:This civil ID is not an active job seeker. Active flag found: ${flag}:flag:. Expiry date found: ${expiry}:expiry: (must be after today).`;
}

/** Extract API error code + message and localize known registration / Nafath errors. */
export function registrationErrorDisplay(err: unknown): string | null {
  const code = extractApiErrorCode(err);
  const raw = extractApiErrorMessage(err);
  if (!raw && !code) {
    return null;
  }
  return translateRegistrationApiError(raw ?? '', code);
}
