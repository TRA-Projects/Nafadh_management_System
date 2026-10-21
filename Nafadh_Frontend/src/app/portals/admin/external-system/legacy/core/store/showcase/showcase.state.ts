import type { ShowcaseItemDto, ShowcasePage } from '../../api/models/showcase.models';

export interface ShowcaseState {
  page: ShowcasePage | null;
  byId: Record<number, ShowcaseItemDto>;
}

export const showcaseInitialState: ShowcaseState = {
  page: null,
  byId: {},
};
