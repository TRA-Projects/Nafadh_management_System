import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

/**
 * When control A depends on B (e.g. date range), call from A’s `valueChanges`
 * so B is revalidated without emitting another event storm.
 */
export function updateSiblingValidity(control: AbstractControl, siblingControlName: string): void {
  control.parent?.get(siblingControlName)?.updateValueAndValidity({ emitEvent: false });
}

/** Lists paths of invalid leaf controls (for debugging or summary messages). */
export function collectControlPathsWithErrors(control: AbstractControl, prefix = ''): string[] {
  const out: string[] = [];
  if (control instanceof FormGroup) {
    for (const key of Object.keys(control.controls)) {
      const child = control.get(key)!;
      const p = prefix ? `${prefix}.${key}` : key;
      out.push(...collectControlPathsWithErrors(child, p));
    }
  } else if (control instanceof FormArray) {
    control.controls.forEach((c, i) => {
      out.push(...collectControlPathsWithErrors(c, `${prefix}[${i}]`));
    });
  } else if (control.invalid) {
    out.push(prefix || '(control)');
  }
  return out;
}
