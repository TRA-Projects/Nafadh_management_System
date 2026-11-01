import { AbstractControl, FormArray, FormGroup } from '@angular/forms';
import { filter, take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

/** All controls in the tree (depth-first), including the root. */
export function flattenControls(control: AbstractControl): AbstractControl[] {
  const out: AbstractControl[] = [];
  function walk(c: AbstractControl): void {
    if (c instanceof FormGroup) {
      for (const key of Object.keys(c.controls)) {
        walk(c.get(key)!);
      }
    } else if (c instanceof FormArray) {
      for (let i = 0; i < c.controls.length; i++) {
        walk(c.at(i));
      }
    }
    out.push(c);
  }
  walk(control);
  return out;
}


export async function waitForAllAsyncValidators(control: AbstractControl): Promise<void> {
  await Promise.all(flattenControls(control).map(waitUntilNotPending));
}

function waitUntilNotPending(control: AbstractControl): Promise<void> {
  if (control.status !== 'PENDING') {
    console.log('control is not pending');
    return Promise.resolve();
  }
  return firstValueFrom(control.statusChanges.pipe(filter((s) => s !== 'PENDING'), take(1))).then(() => undefined);
}
