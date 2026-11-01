import { createSelector } from '@ngrx/store';

import { uiAsyncFeature } from './ui-async.reducer';

/** True when at least one async operation registered via begin/end is in flight. */
export const selectUiAsyncInProgress = createSelector(
  uiAsyncFeature.selectPendingDepth,
  (depth) => depth > 0
);
