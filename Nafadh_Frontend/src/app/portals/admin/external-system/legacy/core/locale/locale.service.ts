import { Injectable, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';

import { persistLocale, readPersistedLocale } from './locale-persistence';
import { localeActions } from '../store/locale/locale.actions';
import { localeFeature } from '../store/locale/locale.reducer';
import type { AppLocale } from '../store/locale/locale.state';

/** Re-export for callers that import `AppLocale` from here. */
export type { AppLocale } from '../store/locale/locale.state';

/**
 * Facade over the NgRx `locale` slice: single global locale, DevTools-visible, same API for templates.
 * `document.documentElement` `dir` / `lang` stay in sync via `effect`.
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly store = inject(Store);

  readonly locale = toSignal(this.store.select(localeFeature.selectLocale), {
    initialValue: readPersistedLocale() as AppLocale,
  });

  readonly isRtl = computed(() => this.locale() === 'ar');

  constructor() {
    effect(() => {
      const l = this.locale();
      const doc = document.documentElement;
      doc.dir = l === 'ar' ? 'rtl' : 'ltr';
      doc.lang = l === 'ar' ? 'ar' : 'en';
    });
  }

  /**
   * Sets UI language and reloads the page so Angular `$localize` / `loadTranslations()` apply.
   * (Runtime language switch without reload is not supported by `@angular/localize`.)
   */
  setLocale(locale: AppLocale): void {
    persistLocale(locale);
    this.store.dispatch(localeActions.setLocale({ locale }));
    if (typeof location !== 'undefined') {
      // Speed up switching to Arabic: preload the translation chunk before reload so the next boot
      // doesn't wait for network/disk (dev server can be noticeably slow on first load).
      if (locale === 'ar') {
        void import('../../locale/messages.ar.json')
          .catch(() => {
            // ignore; fallback is normal reload which will try to fetch it on startup
          })
          .finally(() => {
            location.reload();
          });
        return;
      }
      location.reload();
    }
  }

  toggle(): void {
    const next: AppLocale = this.locale() === 'en' ? 'ar' : 'en';
    this.setLocale(next);
  }
}
