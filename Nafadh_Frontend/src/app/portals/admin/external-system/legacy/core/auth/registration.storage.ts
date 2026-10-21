/**
 * SessionStorage helpers for the in-progress jobseeker registration flow (between OTP success and
 * profile-completion finish). Survives a page refresh on `/register/jobseeker/verify-email` so the
 * user can continue without restarting registration.
 */

const REGISTRATION_EMAIL_KEY = 'jobseeker_registration_email';
const REGISTRATION_MOCK_USER_ID_KEY = 'jobseeker_registration_mock_user_id';
const REGISTRATION_EMAIL_VERIFIED_KEY = 'jobseeker_registration_email_verified';
const REGISTRATION_EMAIL_VERIFIED_AT_KEY = 'jobseeker_registration_email_verified_at';

function safeSession(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function readRegistrationEmail(): string | null {
  return safeSession()?.getItem(REGISTRATION_EMAIL_KEY) ?? null;
}

export function readRegistrationMockUserId(): string | null {
  return safeSession()?.getItem(REGISTRATION_MOCK_USER_ID_KEY) ?? null;
}

export function readRegistrationEmailVerified(): boolean {
  return safeSession()?.getItem(REGISTRATION_EMAIL_VERIFIED_KEY) === '1';
}

export function readRegistrationEmailVerifiedAt(): string | null {
  return safeSession()?.getItem(REGISTRATION_EMAIL_VERIFIED_AT_KEY) ?? null;
}

export function writeRegistrationContext(email: string, mockUserId: string | null): void {
  const s = safeSession();
  if (!s) return;
  s.setItem(REGISTRATION_EMAIL_KEY, email);
  if (mockUserId) {
    s.setItem(REGISTRATION_MOCK_USER_ID_KEY, mockUserId);
  } else {
    s.removeItem(REGISTRATION_MOCK_USER_ID_KEY);
  }
  s.removeItem(REGISTRATION_EMAIL_VERIFIED_KEY);
  s.removeItem(REGISTRATION_EMAIL_VERIFIED_AT_KEY);
}

export function writeRegistrationEmailVerified(verifiedAtIso: string): void {
  const s = safeSession();
  if (!s) return;
  s.setItem(REGISTRATION_EMAIL_VERIFIED_KEY, '1');
  s.setItem(REGISTRATION_EMAIL_VERIFIED_AT_KEY, verifiedAtIso);
}

export function clearRegistrationStorage(): void {
  const s = safeSession();
  if (!s) return;
  s.removeItem(REGISTRATION_EMAIL_KEY);
  s.removeItem(REGISTRATION_MOCK_USER_ID_KEY);
  s.removeItem(REGISTRATION_EMAIL_VERIFIED_KEY);
  s.removeItem(REGISTRATION_EMAIL_VERIFIED_AT_KEY);
}
