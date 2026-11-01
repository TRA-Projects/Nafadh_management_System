import { createActionGroup, emptyProps, props } from '@ngrx/store';

import type { ShowcaseItemDto, ShowcasePage } from '../../api/models/showcase.models';

export const showcaseActions = createActionGroup({
  source: 'Showcase',
  events: {
    'Cache Page': props<{ page: ShowcasePage }>(),
    'Item Upserted': props<{ item: ShowcaseItemDto }>(),
    'Item Removed': props<{ id: number }>(),
    'Clear Cache': emptyProps(),
  },
});
