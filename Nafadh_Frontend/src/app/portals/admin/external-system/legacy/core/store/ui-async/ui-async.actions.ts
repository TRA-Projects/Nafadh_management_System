import { createActionGroup, emptyProps, props } from '@ngrx/store';

import type { UiAsyncResultKind } from '../../ui/ui-async.types';

export const uiAsyncActions = createActionGroup({
  source: 'UI Async',
  events: {
    'Begin Operation': props<{ message?: string }>(),
    'End Operation': emptyProps(),
    /** Clears leaked nested progress (e.g. navigate away while a prior execute is still in flight). */
    'Reset Pending': emptyProps(),
    'Clear Snapshot': emptyProps(),
    'Set Show Details': props<{ show: boolean }>(),
    'Record Success': props<{ message?: string; details?: unknown; defaultDone: string }>(),
    'Record Error': props<{ error: unknown; fallbackMessage: string }>(),
    'Set Snapshot': props<{
      kind: UiAsyncResultKind;
      message: string;
      details?: unknown;
      code?: string;
    }>(),
  },
});
