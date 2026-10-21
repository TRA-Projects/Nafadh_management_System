import type { UiAsyncSnapshot } from '../../ui/ui-async.types';

export interface UiAsyncState {
  pendingDepth: number;
  progressMessage: string;
  lastSnapshot: UiAsyncSnapshot | null;
  showDetails: boolean;
}

export const uiAsyncInitialState: UiAsyncState = {
  pendingDepth: 0,
  progressMessage: '',
  lastSnapshot: null,
  showDetails: false,
};
