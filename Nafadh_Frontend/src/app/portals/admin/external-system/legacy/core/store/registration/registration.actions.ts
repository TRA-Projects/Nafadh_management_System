import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const registrationActions = createActionGroup({
  source: 'Registration',
  events: {
    /** Capture email + mock user id right after the OTP+register call succeeds. */
    'Set Registration Context': props<{ email: string; mockUserId: string | null }>(),
    /** Mark the email as verified (after the user clicks "Verify email" on the verify page). */
    'Mark Email Verified': props<{ verifiedAtIso: string }>(),
    /** Wipe registration state (logout / restart registration). */
    'Clear Registration': emptyProps(),
  },
});
