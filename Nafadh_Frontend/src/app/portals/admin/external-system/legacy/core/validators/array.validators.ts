import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { ValidationErrorKey, ValidationErrorKeys } from './validation-error-keys';

/** Freelancer `mulltiSelectRequired` / `notEmptyList`. */
export function arrayMinLength(
  minSize: number,
  errorKey: ValidationErrorKey = ValidationErrorKeys.noItemsRequired
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    if (!Array.isArray(v) || v.length < minSize) {
      return { [errorKey]: { code: 'VAL_011', minSize } };
    }
    return null;
  };
}

export function multiSelectRequired(
  errorKey: ValidationErrorKey = ValidationErrorKeys.noItemsRequired
): ValidatorFn {
  return arrayMinLength(1, errorKey);
}
