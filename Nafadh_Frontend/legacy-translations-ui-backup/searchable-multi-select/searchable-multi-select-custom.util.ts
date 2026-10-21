/// <reference types="@angular/localize" />

export const NEW_MULTI_SELECT_ID_PREFIX = '__new__:';

/** `personal-skill` = catalog Kind=Personal. `basic-skill` kept as alias. */
export type CustomPersistMode = 'config' | 'skill' | 'basic-skill' | 'personal-skill' | 'tech';

export function newMultiSelectTempId(label: string): string {
  return `${NEW_MULTI_SELECT_ID_PREFIX}${encodeURIComponent(label.trim())}`;
}

export function isNewMultiSelectTempId(id: number | string): boolean {
  return String(id).startsWith(NEW_MULTI_SELECT_ID_PREFIX);
}

export function labelFromNewMultiSelectTempId(id: number | string): string {
  const raw = String(id);
  if (!raw.startsWith(NEW_MULTI_SELECT_ID_PREFIX)) {
    return '';
  }
  const encoded = raw.slice(NEW_MULTI_SELECT_ID_PREFIX.length);
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

export function normalizeMultiSelectLabel(label: string): string {
  return label.trim().toLowerCase();
}

/** Locale-aware bilingual draft for config ensure (matches config-lookup-autocomplete). */
export function configDraftFromTypedLabel(
  label: string,
  locale: 'en' | 'ar'
): { label_en: string; label_ar: string } {
  const q = label.trim();
  return locale === 'ar' ? { label_en: '', label_ar: q } : { label_en: q, label_ar: '' };
}

/** Locale-aware skill / tech create body. */
export function taxonomyDraftFromTypedLabel(
  label: string,
  locale: 'en' | 'ar'
): { NameEn: string; NameAr: string } {
  const q = label.trim();
  return locale === 'ar' ? { NameEn: '', NameAr: q } : { NameEn: q, NameAr: '' };
}

export function findExactCatalogOptionMatch(
  query: string,
  catalog: Array<{ label: string }>
): { label: string } | undefined {
  const needle = normalizeMultiSelectLabel(query);
  if (!needle) {
    return undefined;
  }
  return catalog.find((row) => normalizeMultiSelectLabel(row.label) === needle);
}

export function addCustomRowLabel(query: string): string {
  return $localize`:@@jobseeker.searchableMultiSelect.addCustom:Add "${query}"`;
}
