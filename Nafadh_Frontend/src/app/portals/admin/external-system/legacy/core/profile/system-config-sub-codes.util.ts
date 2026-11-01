import { SYSTEM_CONFIG_CODES, type SystemConfigCode } from './system-config-codes';

/**
 * Main config group → sub-values group (linked via `parentReasonId` on sub rows).
 * Add a pair here when a main catalog needs a dependent sub-catalog in forms or admin.
 */
export const MAIN_TO_SUB_CONFIG_CODE: Partial<Record<SystemConfigCode, SystemConfigCode>> = {
  [SYSTEM_CONFIG_CODES.INTERVIEW_REJECTION_REASON]: SYSTEM_CONFIG_CODES.INTERVIEW_REJECTION_SUB_REASON,
  [SYSTEM_CONFIG_CODES.ASSESSMENT_OFFER_REJECTION_REASON]:
    SYSTEM_CONFIG_CODES.ASSESSMENT_OFFER_REJECTION_SUB_REASON,
};

export function subConfigCodeForMain(mainCode: string): SystemConfigCode | null {
  return MAIN_TO_SUB_CONFIG_CODE[mainCode as SystemConfigCode] ?? null;
}

export function mainConfigCodesWithSubCatalog(): SystemConfigCode[] {
  return Object.keys(MAIN_TO_SUB_CONFIG_CODE) as SystemConfigCode[];
}

export function isSubConfigCode(code: string): boolean {
  return (Object.values(MAIN_TO_SUB_CONFIG_CODE) as string[]).includes(code);
}

export function mainConfigHasSubCatalog(code: string): boolean {
  return code in MAIN_TO_SUB_CONFIG_CODE;
}
