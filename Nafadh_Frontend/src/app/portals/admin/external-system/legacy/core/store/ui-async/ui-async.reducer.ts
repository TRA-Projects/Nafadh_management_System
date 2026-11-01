import { createFeature, createReducer, on } from '@ngrx/store';

import { uiAsyncActions } from './ui-async.actions';
import { uiAsyncInitialState } from './ui-async.state';
import {
  buildErrorSnapshot,
  buildManualSnapshot,
  buildSuccessSnapshot,
  defaultProgressLabel,
} from './ui-async.utils';

export const uiAsyncFeature = createFeature({
  name: 'uiAsync',
  reducer: createReducer(
    uiAsyncInitialState,
    on(uiAsyncActions.beginOperation, (state, { message }) => {
      const wasIdle = state.pendingDepth === 0;
      const nextDepth = state.pendingDepth + 1;
      let progressMessage = state.progressMessage;
      if (wasIdle || (message && message.trim())) {
        progressMessage = message?.trim() ? message.trim() : defaultProgressLabel();
      }
      return { ...state, pendingDepth: nextDepth, progressMessage };
    }),
    on(uiAsyncActions.endOperation, (state) => {
      const nextDepth = Math.max(0, state.pendingDepth - 1);
      const progressMessage = nextDepth === 0 ? '' : state.progressMessage;
      return { ...state, pendingDepth: nextDepth, progressMessage };
    }),
    on(uiAsyncActions.resetPending, (state) => ({
      ...state,
      pendingDepth: 0,
      progressMessage: '',
    })),
    on(uiAsyncActions.clearSnapshot, (state) => ({
      ...state,
      lastSnapshot: null,
      showDetails: false,
    })),
    on(uiAsyncActions.setShowDetails, (state, { show }) => ({ ...state, showDetails: show })),
    on(uiAsyncActions.recordSuccess, (state, { message, details, defaultDone }) => ({
      ...state,
      lastSnapshot: buildSuccessSnapshot(message, details, defaultDone),
    })),
    on(uiAsyncActions.recordError, (state, { error, fallbackMessage }) => ({
      ...state,
      lastSnapshot: buildErrorSnapshot(error, fallbackMessage),
    })),
    on(uiAsyncActions.setSnapshot, (state, { kind, message, details, code }) => {
      const snap = buildManualSnapshot(kind, message, details, code);
      return {
        ...state,
        lastSnapshot: snap,
        showDetails: snap === null ? false : state.showDetails,
      };
    })
  ),
});
