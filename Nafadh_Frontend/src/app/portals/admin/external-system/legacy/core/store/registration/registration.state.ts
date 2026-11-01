import {
  readRegistrationEmail,
  readRegistrationEmailVerified,
  readRegistrationEmailVerifiedAt,
  readRegistrationMockUserId,
} from '../../auth/registration.storage';

/**
 * Registration session state — captured after a successful OTP + register call,
 * carries the email + verification flag through to the Complete-profile page.
 *
 * Hydrated from sessionStorage so a refresh on `/register/jobseeker/verify-email` keeps state.
 */
export interface RegistrationState {
  /** Email entered on the register form (lowercased). `null` until first registration attempt. */
  email: string | null;
  /** Mock user id returned by `POST /api/v2/registration/jobseeker` (mock backend only). */
  mockUserId: string | null;
  /** True after the user clicks "Verify email" on the email-verification page. */
  emailVerified: boolean;
  /** ISO timestamp when the email was verified. */
  emailVerifiedAtIso: string | null;
}

export const registrationInitialState: RegistrationState = {
  email: readRegistrationEmail(),
  mockUserId: readRegistrationMockUserId(),
  emailVerified: readRegistrationEmailVerified(),
  emailVerifiedAtIso: readRegistrationEmailVerifiedAt(),
};
