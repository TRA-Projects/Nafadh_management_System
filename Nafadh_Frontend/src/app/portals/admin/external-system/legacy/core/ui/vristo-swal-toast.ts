import Swal from 'sweetalert2';
import type { SweetAlertOptions } from 'sweetalert2';

/**
 * Base options from Vristo `components-sweetalert.html` (toast mixin / showAlert type 15):
 * `toast`, `showConfirmButton: false`, `timer: 3000`, `padding: '2em'`.
 * Adds `timerProgressBar` for this app's async UI feedback.
 */
const VRISTO_TOAST_MIXIN_BASE: Pick<
  SweetAlertOptions,
  'toast' | 'showConfirmButton' | 'timer' | 'timerProgressBar' | 'padding'
> = {
  toast: true,
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  padding: '2em',
};

/**
 * Returns a SweetAlert2 instance configured like Vristo's demo toasts (`window.Swal.mixin({...})`).
 * Pass `position` (`top-end` / `top-start`) and optional overrides (e.g. `customClass`, longer `timer`).
 */
export function createVristoToastMixin(
  position: NonNullable<SweetAlertOptions['position']>,
  overrides?: Partial<SweetAlertOptions>
): ReturnType<typeof Swal.mixin> {
  return Swal.mixin({
    ...VRISTO_TOAST_MIXIN_BASE,
    position,
    ...overrides,
  } as SweetAlertOptions);
}
