import { readPersistedLocale } from '../../locale/locale-persistence';

export type AppLocale = 'en' | 'ar';

export interface LocaleState {
  locale: AppLocale;
}

export const localeInitialState: LocaleState = {
  locale: readPersistedLocale(),
};
