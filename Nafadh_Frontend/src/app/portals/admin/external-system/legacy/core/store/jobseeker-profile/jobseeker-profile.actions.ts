import { createActionGroup, emptyProps, props } from '@ngrx/store';

import type { MeResponse } from '../../profile/jobseeker-profile.models';

export const jobseekerProfileActions = createActionGroup({
  source: 'Jobseeker Profile',
  events: {
    'Cache Loaded Me': props<{ me: MeResponse }>(),
    'Clear Cache': emptyProps(),
  },
});
