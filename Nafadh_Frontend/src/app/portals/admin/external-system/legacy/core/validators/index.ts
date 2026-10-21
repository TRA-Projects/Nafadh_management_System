/**
 * App-wide custom validators and helpers.
 *
 * **Import anywhere:**
 * `import { AngularValidators, emailFormat, notEarlierThan } from '@validators';`
 *
 * Use `AngularValidators.required`, `AngularValidators.minLength`, … for built-ins.
 */

export type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
export { FormArray, FormControl, FormGroup, Validators as AngularValidators } from '@angular/forms';

export * from './validation-error-keys';
export * from './string.validators';
export * from './number.validators';
export * from './file.validators';
export * from './array.validators';
export * from './checkbox.validators';
export * from './select.validators';
export * from './cross-field.validators';
export * from './date.validators';
export * from './form-validation.utils';
export * from './validation-messages.i18n';
export * from './validation-message.pipe';
