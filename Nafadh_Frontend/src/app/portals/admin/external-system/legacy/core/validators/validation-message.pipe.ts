import { Pipe, PipeTransform } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';

import { firstValidationMessage } from './validation-messages.i18n';

/**
 * Shows the first validation message for a control’s current `errors`, or for a raw `ValidationErrors` map.
 *
 * ```html
 * @if (email.invalid && email.touched) {
 *   <span class="text-danger text-sm">{{ email | validationMessage }}</span>
 * }
 * ```
 */
@Pipe({
  name: 'validationMessage',
  standalone: true,
  /** Must be impure: `AbstractControl` reference is stable while `errors` mutates (e.g. cross-field year range). */
  pure: false,
})
export class ValidationMessagePipe implements PipeTransform {
  transform(controlOrErrors: AbstractControl | ValidationErrors | null | undefined): string | null {
    if (!controlOrErrors) {
      return null;
    }
    const errors = isAbstractControl(controlOrErrors) ? controlOrErrors.errors : controlOrErrors;
    return firstValidationMessage(errors);
  }
}

function isAbstractControl(x: unknown): x is AbstractControl {
  return typeof x === 'object' && x !== null && 'errors' in x;
}
