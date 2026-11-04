
import { Component, OnDestroy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';

import { installRowActionsMenuOverlay } from './legacy/core/ui/row-actions-menu-overlay';
import { selectUiAsyncInProgress } from './legacy/core/store/ui-async/ui-async.selectors';
import { uiAsyncFeature } from './legacy/core/store/ui-async/ui-async.reducer';
import { UiAsyncToastHostComponent } from './legacy/core/ui/ui-async-toast-host.component';

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

  readonly inProgress = this.store.selectSignal(selectUiAsyncInProgress);
  readonly progressMessage = this.store.selectSignal(
    uiAsyncFeature.selectProgressMessage
  );

  ngOnDestroy(): void {
    this.disposeRowActionsOverlay();
  }
}
