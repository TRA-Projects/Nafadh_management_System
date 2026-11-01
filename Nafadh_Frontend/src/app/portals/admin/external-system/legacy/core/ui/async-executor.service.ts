import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';

import { LocaleService } from '../locale/locale.service';
import  { uiAsyncActions } from '../store/ui-async/ui-async.actions';
import { uiAsyncStrings } from '../store/ui-async/ui-async.i18n';

import type { AsyncExecuteOptions } from './ui-async.types';

/**
 * Runs async work and dispatches to the NgRx `uiAsync` slice (progress + last result), similar to
 * the Alpine `errorSuccessHandler().execute` helper.
 */
@Injectable({ providedIn: 'root' })
export class AsyncExecutorService {
  private readonly store = inject(Store);
  private readonly locale = inject(LocaleService);

  async execute<T>(work: () => Promise<T>, options: AsyncExecuteOptions<T> = {}): Promise<T> {
    const {
      showProgress = true,
      progressMessage = '',
      recordSuccess = true,
      successMessage,
      onSuccess,
      onError,
      finalize,
    } = options;

    const s = uiAsyncStrings(this.locale.locale());

    if (showProgress) {
      this.store.dispatch(uiAsyncActions.beginOperation({ message: progressMessage.trim() || s.pleaseWait }));
    }

    try {
      const result = await work();
      if (recordSuccess) {
        this.store.dispatch(
          uiAsyncActions.recordSuccess({ message: successMessage, details: result, defaultDone: s.done })
        );
      }
      onSuccess?.(result);
      return result;
    } catch (error: unknown) {
      this.store.dispatch(uiAsyncActions.recordError({ error, fallbackMessage: s.genericError }));
      onError?.(error);
      throw error;
    } finally {
      if (showProgress) {
        this.store.dispatch(uiAsyncActions.endOperation());
      }
      try {
        await finalize?.();
      } catch (e) {
        console.error('[AsyncExecutor] finalize failed', e);
      }
    }
  }
}
