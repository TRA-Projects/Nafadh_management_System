import { Injectable, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { AsyncExecutorService } from './async-executor.service';
import { waitForAllAsyncValidators } from './form-async.utils';
import type { FormPipelineOptions, FormPipelineResult } from './form-pipeline.types';

/**
 * **Validate → (async / backend) → execute** pipeline aligned with Freelancer `validateWithError` + `execute`.
 *
 * 1. Marks touched and runs all validators (including `AsyncValidatorFn` on controls — e.g. HTTP uniqueness).
 * 2. Waits until no control is `PENDING`.
 * 3. Optional `asyncValidate()` for extra server rules (set errors on the form, return `false` to stop).
 * 4. Runs `work()` inside {@link AsyncExecutorService} (progress, success/error UI, callbacks).
 *
 * ```typescript
 * const result = await this.formPipeline.run({
 *   form: this.form,
 *   work: () => firstValueFrom(this.api.save(this.form.getRawValue())),
 *   execute: { successMessage: $localize`:@@...:Saved`, onSuccess: () => this.router.navigate(['..']) },
 *   asyncValidate: async () => {
 *     const ok = await firstValueFrom(this.api.canPost(this.form.value.projectId));
 *     if (!ok) {
 *       this.form.get('title')?.setErrors({ cannotPost: true });
 *       return false;
 *     }
 *   },
 * });
 * if (!isFormPipelineSuccess(result)) return;
 * ```
 */
@Injectable({ providedIn: 'root' })
export class FormPipelineService {
  private readonly executor = inject(AsyncExecutorService);

  async run<T>(options: FormPipelineOptions<T>): Promise<FormPipelineResult<T>> {
    const { form, work, execute: executeOpts = {}, markTouched = true, asyncValidate } = options;

    if (markTouched) {
      form.markAllAsTouched();
    }
    form.updateValueAndValidity({ emitEvent: true });
    await waitForAllAsyncValidators(form);

    if (form.invalid) {
      return { ok: false, reason: 'invalid', form };
    }

    if (asyncValidate) {
      const serverOk = await asyncValidate();
      if (serverOk === false) {
        return { ok: false, reason: 'server_validation', form };
      }
      if (form.invalid) {
        return { ok: false, reason: 'invalid', form };
      }
    }
   

    try {
      const value = await this.executor.execute(work, executeOpts);
      return { ok: true, value };
    } catch (error: unknown) {
      return { ok: false, reason: 'submit_error', error, form };
    }
  }
}
