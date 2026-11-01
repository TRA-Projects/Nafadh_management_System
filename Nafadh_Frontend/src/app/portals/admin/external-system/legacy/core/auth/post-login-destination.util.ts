import type { MeResponse } from '../profile/jobseeker-profile.models';
import { extractApiErrorMessage } from '../api/api-error.util';

/** Authenticated profile wizard without MainLayout nav (Freelancer CompleteProfile parity). */
export const COMPLETE_PROFILE_PATH = '/complete-profile';

/** Email verification page (registration + post-login gate). */
export const VERIFY_EMAIL_PATH = '/register/jobseeker/verify-email';

/** Backend / nav profile types that use the job seeker app shell. */
export function isJobSeekerProfileType(vendorId: number | null | undefined): boolean {
  return vendorId === 1 || vendorId === 8;
}

export function isEmailNotVerifiedApiError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const details = (error as { details?: unknown }).details;
    if (details && typeof details === 'object' && 'Code' in details) {
      if (String((details as { Code?: unknown }).Code) === 'EmailNotVerified') {
        return true;
      }
    }
  }
  const msg = (extractApiErrorMessage(error) ?? '').toLowerCase();
  return msg.includes('email is not verified');
}

export function isProfileNotCompletedApiError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const details = (error as { details?: unknown }).details;
    if (details && typeof details === 'object' && 'Code' in details) {
      if (String((details as { Code?: unknown }).Code) === 'ProfileNotCompleted') {
        return true;
      }
    }
  }
  const msg = (extractApiErrorMessage(error) ?? '').toLowerCase();
  return msg.includes('profile is not completed');
}

/** @deprecated Prefer {@link isEmailNotVerifiedApiError}. */
export const isEmailNotVerifiedLoginError = isEmailNotVerifiedApiError;

/**
 * After a successful login + `getMe()`, decide whether the job seeker must finish the wizard.
 * Non-seekers and missing flags are treated as complete (no forced redirect).
 */
export function isJobSeekerProfileIncomplete(profile: MeResponse | null | undefined): boolean {
  if (!profile) {
    return false;
  }
  const vendorId = profile.VendorType?.Id;
  if (vendorId != null && !isJobSeekerProfileType(vendorId)) {
    return false;
  }
  return profile.UserProfileCompleted === false;
}

export function isJobSeekerEmailUnverified(profile: MeResponse | null | undefined): boolean {
  if (!profile) {
    return false;
  }
  const vendorId = profile.VendorType?.Id;
  if (vendorId != null && !isJobSeekerProfileType(vendorId)) {
    return false;
  }
  return profile.IsEmailVerified === false;
}
