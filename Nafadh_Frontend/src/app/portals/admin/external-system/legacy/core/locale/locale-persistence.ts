/** Synced with `main.ts` (Angular `$localize` / `loadTranslations`) and NgRx `locale` initial state. */
export const JOBSEEKER_LOCALE_STORAGE_KEY = 'jobseeker_locale';

export type PersistedLocale = 'en' | 'ar';

export function readPersistedLocale(): PersistedLocale {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(JOBSEEKER_LOCALE_STORAGE_KEY) !== 'ar') {
      localStorage.setItem(JOBSEEKER_LOCALE_STORAGE_KEY, 'ar');
    }
  } catch {
    // ignore
  }
  return 'ar';
}

export function persistLocale(locale: PersistedLocale): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(JOBSEEKER_LOCALE_STORAGE_KEY, locale);
      return;
    }
  } catch {
    // ignore
  }
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(JOBSEEKER_LOCALE_STORAGE_KEY, locale);
    }
  } catch {
    // ignore
  }
}
