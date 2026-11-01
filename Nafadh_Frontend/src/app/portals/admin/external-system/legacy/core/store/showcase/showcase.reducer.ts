import { createFeature, createReducer, on } from '@ngrx/store';

import { showcaseActions } from './showcase.actions';
import { showcaseInitialState } from './showcase.state';

export const showcaseFeature = createFeature({
  name: 'showcase',
  reducer: createReducer(
    showcaseInitialState,
    on(showcaseActions.cachePage, (state, { page }) => ({ ...state, page })),
    on(showcaseActions.itemUpserted, (state, { item }) => ({
      ...state,
      byId: { ...state.byId, [item.Id]: item },
      page: state.page
        ? { ...state.page, rows: state.page.rows.map((r) => (r.Id === item.Id ? item : r)) }
        : state.page,
    })),
    on(showcaseActions.itemRemoved, (state, { id }) => {
      const { [id]: _removed, ...byId } = state.byId;
      return {
        ...state,
        byId,
        page: state.page
          ? { ...state.page, rows: state.page.rows.filter((r) => r.Id !== id), total: Math.max(0, state.page.total - 1) }
          : state.page,
      };
    }),
    on(showcaseActions.clearCache, () => ({ ...showcaseInitialState }))
  ),
});
