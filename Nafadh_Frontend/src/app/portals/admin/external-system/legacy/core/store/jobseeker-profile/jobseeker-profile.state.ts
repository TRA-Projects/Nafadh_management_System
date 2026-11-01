import type { MeResponse } from '../../profile/jobseeker-profile.models';

export interface JobseekerProfileState {
  /** Last successful `getMe()` snapshot (DevTools + future selectors). */
  lastMe: MeResponse | null;
  lastLoadedAt: string | null;
}

export const jobseekerProfileInitialState: JobseekerProfileState = {
  lastMe: null,
  lastLoadedAt: null,
};
