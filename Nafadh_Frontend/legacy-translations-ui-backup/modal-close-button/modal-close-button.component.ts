import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { MODAL_ICON_BUTTON_CLASSES } from './modal-icon-button.classes';

/**
 * Icon-only dismiss control for overlays (modals, drawers). Uses `@@jobseeker.common.close` for `aria-label`.
 */
@Component({
  selector: 'app-modal-close',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [attr.class]="buttonClass()"
      (click)="close.emit()"
      i18n-aria-label="@@jobseeker.common.close"
      aria-label="Close"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  `,
})
export class ModalCloseButtonComponent {
  /** Space-separated Tailwind classes merged onto the button (e.g. absolute positioning). */
  extraClasses = input('');

  readonly close = output<void>();

  readonly buttonClass = computed(() => {
    // Do not add `relative` here: many callers pass `absolute` via extraClasses; both utilities in
    // one string make Tailwind order unpredictable and the close control can stay in-flow (broken).
    const base = `z-20 ${MODAL_ICON_BUTTON_CLASSES}`;
    const extra = this.extraClasses().trim();
    return extra ? `${base} ${extra}` : base;
  });
}
