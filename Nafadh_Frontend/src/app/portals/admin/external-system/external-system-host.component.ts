import { Component, OnDestroy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';

import { installRowActionsMenuOverlay } from './legacy/core/ui/row-actions-menu-overlay';
import { selectUiAsyncInProgress } from './legacy/core/store/ui-async/ui-async.selectors';
import { uiAsyncFeature } from './legacy/core/store/ui-async/ui-async.reducer';
import { UiAsyncToastHostComponent } from './legacy/core/ui/ui-async-toast-host.component';

/**
 * Host for every page under `/admin/external-system/*`.
 *
 * - Its element name (`ext-system-host`) is the prefix used by `public/external-system/css/style.scoped.css`,
 *   so the legacy Tailwind/Vristo rules only apply inside this subtree and never leak into the rest of the portal.
 * - Installs the row-actions menu overlay that the legacy app installed globally in `app.component.ts`.
 * - Renders the global busy overlay and success/error toasts that the legacy `MainLayout` used to provide
 *   (fed by the NgRx `uiAsync` slice through `AsyncExecutorService`).
 */
@Component({
  selector: 'ext-system-host',
  standalone: true,
  imports: [RouterOutlet, UiAsyncToastHostComponent],
  templateUrl: './external-system-host.component.html',
  styleUrl: './external-system-host.component.scss',
})
export class ExternalSystemHostComponent implements OnDestroy {
  private readonly store = inject(Store);
  private readonly disposeRowActionsOverlay = installRowActionsMenuOverlay();

  readonly inProgress = toSignal(this.store.select(selectUiAsyncInProgress), { initialValue: false });
  readonly progressMessage = toSignal(this.store.select(uiAsyncFeature.selectProgressMessage), { initialValue: '' });

  ngOnDestroy(): void {
    this.disposeRowActionsOverlay();
  }
}
