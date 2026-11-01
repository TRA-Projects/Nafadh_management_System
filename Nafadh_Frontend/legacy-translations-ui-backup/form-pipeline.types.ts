import { FormGroup } from '@angular/forms';

import type { AsyncExecuteOptions } from './ui-async.types';

/**
 * Optional second validation pass after built-in sync + `AsyncValidatorFn` complete.
 * Use for composite server checks that are awkward as field-level async validators.
 *
 * Return **`true`** (or `void`) if OK, **`false`** if failed (set control errors before returning).
 */
export type FormPipelineServerValidate = () => Promise<boolean | void>;

export interface FormPipelineOptions<T = unknown> {
  form: FormGroup;
  /** Runs the mutation (HTTP, navigation, etc.) inside {@link AsyncExecutorService.execute}. */
  work: () => Promise<T>;
  /** Passed through to `AsyncExecutorService` (progress, success toast, `onSuccess`, `onError`, …). */
  execute?: AsyncExecuteOptions<T>;
  /** Default `true`: `markAllAsTouched` before validation. */
  markTouched?: boolean;
  /**
   * Extra server validation after Angular async validators finish.
   * Example: `async () => { if (await api.isSlugTaken(...)) { form.get('slug')?.setErrors({...}); return false; } }`
   */
  asyncValidate?: FormPipelineServerValidate;
}

export type FormPipelineResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: 'invalid'; form: FormGroup }
  | { ok: false; reason: 'server_validation'; form: FormGroup }
  | { ok: false; reason: 'submit_error'; error: unknown; form: FormGroup };

export function isFormPipelineSuccess<T>(r: FormPipelineResult<T>): r is { ok: true; value: T } {
  return r.ok === true;
}
