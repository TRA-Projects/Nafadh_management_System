export const NAFATH_VALIDITY_CHECK_CODES = ['NONE', 'EXPIRY_DATE', 'ACTIVE_FLAG', 'BOTH'] as const;
export type NafathValidityCheckCode = (typeof NAFATH_VALIDITY_CHECK_CODES)[number];

export const DEFAULT_NAFATH_VALIDITY_CHECK: NafathValidityCheckCode = 'BOTH';

const ALIASES: Record<string, NafathValidityCheckCode> = {
  NONE: 'NONE',
  OFF: 'NONE',
  SKIP: 'NONE',
  EXPIRY_DATE: 'EXPIRY_DATE',
  DATE: 'EXPIRY_DATE',
  EXPIRY: 'EXPIRY_DATE',
  ACTIVE_FLAG: 'ACTIVE_FLAG',
  FLAG: 'ACTIVE_FLAG',
  BOTH: 'BOTH',
  ALL: 'BOTH',
};

export function parseNafathValidityCheck(raw: string | null | undefined): NafathValidityCheckCode {
  const key = String(raw ?? '')
    .trim()
    .toUpperCase();
  return ALIASES[key] ?? DEFAULT_NAFATH_VALIDITY_CHECK;
}

export function canonicalizeNafathValidityCheck(raw: string | null | undefined): string | null {
  const key = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (!key) {
    return DEFAULT_NAFATH_VALIDITY_CHECK;
  }
  return ALIASES[key] ?? null;
}
