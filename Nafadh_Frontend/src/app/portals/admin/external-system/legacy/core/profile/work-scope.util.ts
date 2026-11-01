import type { SystemConfigValueDto } from '../api/models/admin-system.models';
import type { ServiceOffering } from './jobseeker-profile.models';

/** Matches backend `ResolveWorkScopeNumericId` — prefers numeric `code`, then numeric `id`. */
export function resolveWorkScopeNumericId(
  row: Pick<SystemConfigValueDto, 'id' | 'code'>
): number {
  const code = String(row.code ?? '').trim();
  if (code && /^\d+$/.test(code)) {
    return Number(code);
  }
  const idText = String(row.id ?? '').trim();
  if (idText && /^\d+$/.test(idText)) {
    return Number(idText);
  }
  return 0;
}

export function mapWorkScopeConfigRows(rows: SystemConfigValueDto[]): ServiceOffering[] {
  const seen = new Set<number>();
  const result: ServiceOffering[] = [];
  for (const row of rows ?? []) {
    const id = resolveWorkScopeNumericId(row);
    if (id <= 0 || seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push({
      Id: id,
      Name_en: row.label_en ?? '',
      Name_ar: row.label_ar ?? '',
    });
  }
  return result;
}

/** Id stored on `ServicesOffered` after ensure / multi-select persist. */
export function configValuePersistedSelectId(row: SystemConfigValueDto): number | string {
  const numeric = resolveWorkScopeNumericId(row);
  if (numeric > 0) {
    return numeric;
  }
  return row.id;
}
