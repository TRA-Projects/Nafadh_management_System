import { Injectable, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';

import { persistLocale, readPersistedLocale } from './locale-persistence';
import { localeActions } from '../store/locale/locale.actions';
import { localeFeature } from '../store/locale/locale.reducer';
import type { AppLocale } from '../store/locale/locale.state';

export type { AppLocale } from '../store/locale/locale.state';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly store = inject(Store);

  readonly locale = toSignal(this.store.select(localeFeature.selectLocale), {
    initialValue: 'ar' as AppLocale,
  });

  readonly isRtl = computed(() => this.locale() === 'ar');

  constructor() {
    if (readPersistedLocale() !== 'ar') {
      persistLocale('ar');
      this.store.dispatch(localeActions.setLocale({ locale: 'ar' }));
      if (typeof window !== 'undefined' && !sessionStorage.getItem('__nafadh_ar_boot')) {
        sessionStorage.setItem('__nafadh_ar_boot', '1');
        void import('../../locale/messages.ar.json')
          .catch(() => {})
          .finally(() => {
            location.reload();
          });
        return;
      }
    }

    effect(() => {
      const l = this.locale();
      const doc = document.documentElement;
      doc.dir = l === 'ar' ? 'rtl' : 'ltr';
      doc.lang = l === 'ar' ? 'ar' : 'en';
    });
  }

  setLocale(locale: AppLocale): void {
    const targetLocale: AppLocale = locale || 'ar';
    persistLocale(targetLocale);
    this.store.dispatch(localeActions.setLocale({ locale: targetLocale }));
    if (typeof location !== 'undefined') {
      if (targetLocale === 'ar') {
        void import('../../locale/messages.ar.json')
          .catch(() => {})
          .finally(() => {
            location.reload();
          });
        return;
      }
      location.reload();
    }
  }

  toggle(): void {
    this.setLocale('ar');
  }
}