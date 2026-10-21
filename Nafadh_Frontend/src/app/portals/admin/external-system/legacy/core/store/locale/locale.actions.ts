import { createActionGroup, emptyProps, props } from '@ngrx/store';

import type { AppLocale } from './locale.state';

export const localeActions = createActionGroup({
  source: 'Locale',
  events: {
    'Set Locale': props<{ locale: AppLocale }>(),
    'Toggle Locale': emptyProps(),
  },
});
