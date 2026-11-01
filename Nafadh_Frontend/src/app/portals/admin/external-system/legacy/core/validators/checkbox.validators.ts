import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { ValidationErrorKeys } from './validation-error-keys';

/** Freelancer `requiredChecked`. */
export function requiredTrue(errorKey = ValidationErrorKeys.checkRequired): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    return control.value === true ? null : { [errorKey]: { code: 'VAL_008' } };
  };
}
