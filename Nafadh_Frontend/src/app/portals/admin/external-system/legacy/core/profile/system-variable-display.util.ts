import type { SystemVariableDto } from '../api/models/admin-system.models';
import { isYnEnabledValue } from '../auth/platform-auth.constants';

/** Read-only display name for a system variable in the active locale. */
export function systemVariableName(row: SystemVariableDto, locale: 'en' | 'ar'): string {
  const en = (row.VariableNameEn ?? row.VariableName ?? '').trim();
  const ar = (row.VariableNameAr ?? en).trim();
  return locale === 'ar' ? ar || en : en || ar;
}

/** Read-only description for a system variable in the active locale. */
export function systemVariableDescription(row: SystemVariableDto, locale: 'en' | 'ar'): string {
  const en = (row.DescriptionEn ?? row.Description ?? '').trim();
  const ar = (row.DescriptionAr ?? en).trim();
  return locale === 'ar' ? ar || en : en || ar;
}

/** String system variables stored as `Y` / `N` (e.g. registration toggles). */
export function isYnStringSystemVariable(row: SystemVariableDto): boolean {
  if (row.ValueType !== 'String') {
    return false;
  }
  const normalized = String(row.Value ?? '')
    .trim()
    .toUpperCase();
  return normalized === 'Y' || normalized === 'N';
}

/** Boolean or Y/N string variables that use the yn-switch UI. */
export function isToggleSystemVariable(row: SystemVariableDto): boolean {
  if (row.ValueType === 'Boolean') {
    return true;
  }
  return isYnStringSystemVariable(row);
}

export function ynValueFromEnabled(enabled: boolean): 'Y' | 'N' {
  return enabled ? 'Y' : 'N';
}

export function ynEnabledFromValue(raw: string | number | boolean | null | undefined): boolean {
  return isYnEnabledValue(raw);
}
