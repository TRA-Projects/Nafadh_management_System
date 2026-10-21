import { createFeature, createReducer, on } from '@ngrx/store';

import { jobseekerProfileActions } from './jobseeker-profile.actions';
import { jobseekerProfileInitialState } from './jobseeker-profile.state';

export const jobseekerProfileFeature = createFeature({
  name: 'jobseekerProfile',
  reducer: createReducer(
    jobseekerProfileInitialState,
    on(jobseekerProfileActions.cacheLoadedMe, (state, { me }) => ({
      ...state,
      lastMe: me,
      lastLoadedAt: new Date().toISOString(),
    })),
    on(jobseekerProfileActions.clearCache, () => ({ ...jobseekerProfileInitialState }))
  ),
});
