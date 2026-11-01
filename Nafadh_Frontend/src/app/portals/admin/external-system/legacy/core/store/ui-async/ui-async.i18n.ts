import type { AppLocale } from '../locale/locale.state';

/** Default strings for global async UI (overlay, snapshots, confirms); keyed by NgRx `locale` slice. */
export function uiAsyncStrings(locale: AppLocale): {
  pleaseWait: string;
  done: string;
  genericError: string;
  confirmTitle: string;
} {
  return locale === 'ar'
    ? {
        pleaseWait: 'يرجى الانتظار…',
        done: 'تم.',
        genericError: 'حدث خطأ ما.',
        confirmTitle: 'هل أنت متأكد؟',
      }
    : {
        pleaseWait: 'Please wait…',
        done: 'Done.',
        genericError: 'Something went wrong.',
        confirmTitle: 'Are you sure?',
      };
}
