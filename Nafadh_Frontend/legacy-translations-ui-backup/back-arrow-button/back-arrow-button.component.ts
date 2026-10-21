import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { LocaleService } from '../../locale/locale.service';

@Component({
  selector: 'app-back-arrow-button',
  standalone: true,
  templateUrl: './back-arrow-button.component.html',
})
export class BackArrowButtonComponent {
  readonly locale = inject(LocaleService);
  private readonly router = inject(Router);

  /** Navigate to this path when clicked (recommended). */
  readonly to = input<string | null>(null);

  /** When true, only the arrow is shown (label is still used for `aria-label`). */
  readonly iconOnly = input(false);

  /** Accessible label. */
  readonly ariaLabel = input<string>('');

  /** When false, the click stays on the page so the parent can handle it. */
  readonly handlesNavigation = input(true);

  readonly label = computed(() => {
    if (this.ariaLabel().trim()) return this.ariaLabel().trim();
    return this.locale.locale() === 'ar' ? 'رجوع' : 'Back';
  });

  go(): void {
    if (!this.handlesNavigation()) return;
    const to = this.to();
    if (to) {
      void this.router.navigateByUrl(to);
      return;
    }
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  }
}

