import { createFeature, createReducer, on } from '@ngrx/store';

import { registrationActions } from './registration.actions';
import { registrationInitialState } from './registration.state';

export const registrationFeature = createFeature({
  name: 'registration',
  reducer: createReducer(
    registrationInitialState,
    on(registrationActions.setRegistrationContext, (state, { email, mockUserId }) => ({
      ...state,
      email,
      mockUserId: mockUserId ?? null,
      emailVerified: false,
      emailVerifiedAtIso: null,
    })),
    on(registrationActions.markEmailVerified, (state, { verifiedAtIso }) => ({
      ...state,
      emailVerified: true,
      emailVerifiedAtIso: verifiedAtIso,
    })),
    on(registrationActions.clearRegistration, () => ({
      email: null,
      mockUserId: null,
      emailVerified: false,
      emailVerifiedAtIso: null,
    }))
  ),
});
