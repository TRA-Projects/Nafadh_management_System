/// <reference types="@angular/localize" />

import { Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';

import { translateAuthApiError } from '../api/auth-api-error.i18n';
import { translateRegistrationApiError } from '../api/registration-api-error.i18n';
import { LocaleService } from '../locale/locale.service';
import { uiAsyncActions } from '../store/ui-async/ui-async.actions';
import { uiAsyncFeature } from '../store/ui-async/ui-async.reducer';
import { createVristoToastMixin } from './vristo-swal-toast';

/**
 * Listens to NgRx `uiAsync.lastSnapshot` app-wide and shows Vristo mixin toasts
 * (same pattern as {@link MainLayoutComponent} before auth routes were split out).
 */
@Component({
  selector: 'app-ui-async-toast-host',
  standalone: true,
  template: '',
})
export class UiAsyncToastHostComponent {
  private readonly store = inject(Store);
  private readonly locale = inject(LocaleService);
  private lastShownSnapshotAt: string | null = null;

  private readonly lastSnapshot = toSignal(this.store.select(uiAsyncFeature.selectLastSnapshot), {
    initialValue: null,
  });

  constructor() {
    effect(() => {
      const snapshot = this.lastSnapshot();
      if (!snapshot) {
        this.lastShownSnapshotAt = null;
        return;
      }
      if (snapshot.at === this.lastShownSnapshotAt) {
        return;
      }
      this.lastShownSnapshotAt = snapshot.at;

      if (snapshot.kind === 'success') {
        void this.showSuccess(snapshot.message);
        return;
      }

      if (snapshot.kind === 'error') {
        void this.showError(snapshot.message);
      }
    });
  }

  private clearSnapshot(): void {
    this.store.dispatch(uiAsyncActions.clearSnapshot());
  }

  private async showSuccess(message: string): Promise<void> {
    const rtl = this.locale.locale() === 'ar';
    const position = rtl ? 'top-start' : 'top-end';
    const toast = createVristoToastMixin(position, {
      customClass: {
        popup: 'swal2-toast color-success',
      },
    });
    await toast.fire({
      icon: 'success',
      title: message,
    });
    this.clearSnapshot();
  }

  private async showError(message: string): Promise<void> {
    const rtl = this.locale.locale() === 'ar';
    const position = rtl ? 'top-start' : 'top-end';
    const toast = createVristoToastMixin(position, {
      timer: 8000,
      showCloseButton: true,
      animation: false,
      customClass: {
        popup: 'swal2-toast color-danger',
      },
    });
    const localized = translateAuthApiError(translateRegistrationApiError(message));
    // Message only — no "Error" title; danger color + icon convey severity (app-wide mixin).
    await toast.fire({
      icon: 'error',
      title: localized,
    });
    this.clearSnapshot();
  }
}
