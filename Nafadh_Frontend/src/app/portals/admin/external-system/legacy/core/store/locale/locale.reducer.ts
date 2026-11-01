import { createFeature, createReducer, on } from '@ngrx/store';

import { localeActions } from './locale.actions';
import { localeInitialState, type AppLocale } from './locale.state';

export const localeFeature = createFeature({
  name: 'locale',
  reducer: createReducer(
    localeInitialState,
    on(localeActions.setLocale, (state, { locale }) => ({ ...state, locale })),
    on(localeActions.toggleLocale, (state) => {
      const next: AppLocale = state.locale === 'en' ? 'ar' : 'en';
      return { ...state, locale: next };
    })
  ),
});
