/** Synced with `main.ts` (Angular `$localize` / `loadTranslations`) and NgRx `locale` initial state. */
export const JOBSEEKER_LOCALE_STORAGE_KEY = 'jobseeker_locale';

export type PersistedLocale = 'en' | 'ar';

export function readPersistedLocale(): PersistedLocale {
  try {
    // Prefer localStorage so language persists across tabs/sessions.
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(JOBSEEKER_LOCALE_STORAGE_KEY) === 'ar' ? 'ar' : 'en';
    }
  } catch {
    // ignore
  }
  try {
    // Fallback for environments where localStorage is blocked.
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(JOBSEEKER_LOCALE_STORAGE_KEY) === 'ar' ? 'ar' : 'en';
    }
  } catch {
    // ignore
  }
  return 'en';
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
