/**
 * Admin system config **lookup group codes** (short keys: up to 2 segments, ~4 chars each).
 *
 * The same string is used everywhere for one catalog:
 * - `AdminSystemApiService.getValues(code)` — full list
 * - `AdminSystemApiService.searchConfigValues(code, query)` — autocomplete
 * - `app-config-lookup-autocomplete` `[configCode]` — which catalog this control uses
 * - Admin → Constants management — CRUD for that group
 */
export const SYSTEM_CONFIG_CODES = {
  EDUCATIONAL_INSTITUTION: 'EDUC_INST',
  QUALIFICATION_DEGREES: 'QUAL_DEGR',
  FIELD_OF_STUDY: 'STDY_FILDS',
  TRAINING_PROGRAM_TYPE: 'TRNG_TYPE',
  /** Job seeker profile — vocational certificate name (اسم الشهادة). */
  CERTIFICATE_NAME: 'CERT_NAME',
  /** Job seeker profile — training provider (مقدم التدريب). */
  TRAINING_PROVIDER: 'TRNG_PROV',
  EDUCATION_LEVEL: 'EDUC_LVL',
  APPLICATION_METHOD: 'APPL_METH',
  OPPORTUNITY_TYPE: 'OPP_TYPE',
  WORK_MODE: 'WORK_MODE',
  TARGET_GENDER: 'TGT_GEND',
  INTERVIEW_MODE: 'INTV_MODE',
  TARGET_APPLICANT: 'TGT_APPL',
  SALARY_DISPLAY: 'SAL_DISP',
  CURRENCY: 'CURR',
  PAY_FREQUENCY: 'PAY_FREQ',
  BENEFIT: 'BENEF',
  /** Offer wage breakdown — allowance type dropdown. */
  ALLOWANCE: 'ALLOW',
  LANGUAGE: 'LANG',
  REQUIRED_DOCUMENT_FILE_TYPE: 'DOC_TYPE',
  INTERVIEW_REJECTION_REASON: 'RJCT_RSN',
  INTERVIEW_REJECTION_SUB_REASON: 'RJCT_SUB',
  /** Interview conduct — no-show / did not attend reason. */
  INTERVIEW_NO_SHOW_REASON: 'NSHW_RSN',
  /** Interview conduct — reschedule reason. */
  INTERVIEW_RESCHEDULE_REASON: 'RSCH_RSN',
  /** Assessment conduct — offering entity name (جهة العرض) with allow-add. */
  OFFER_ENTITY: 'OFFR_ENTY',
  /** Assessment conduct — rejected-offer reason (linked sub via {@link ASSESSMENT_OFFER_REJECTION_SUB_REASON}). */
  ASSESSMENT_OFFER_REJECTION_REASON: 'AOFF_RJCT',
  ASSESSMENT_OFFER_REJECTION_SUB_REASON: 'AOFF_SUB',
  CREDENTIAL_STATUS: 'CRDT_STAT',
  EXAM_TYPE: 'EXAM_TYPE',
  /** Credential course definitions — training provider (value key e.g. nafadh-academy). */
  CREDENTIAL_PROVIDER: 'CRDT_PROV',
  /** Job seeker profile completion — work scopes (نطاقات العمل) on general-info tab.
   * Same catalog as {@link JOB_CATEGORY} (مجال الفرصة) for job post + find. */
  WORK_SCOPE: 'WRK_SCOPE',
  /**
   * Opportunity field (مجال الفرصة) — job posting, job find filters, and profile work scopes.
   * Same system-config group as {@link WORK_SCOPE}.
   */
  JOB_CATEGORY: 'WRK_SCOPE',
  /** Job seeker registration — nationality (value id e.g. OMN). */
  NATIONALITY: 'NAT',
  /** Job seeker registration — primary specification (value id e.g. IT, HL). */
  PRIMARY_SPECIFICATION: 'PRIM_SPEC',
  /** Employment procedures — contract type on offer/contract forms. */
  CONTRACT_TYPE: 'CONT_TYPE',
  /** Employment procedures — candidate offer rejection reasons. */
  OFFER_REJECTION_REASON: 'OFFR_RJCT',
  /** Job seeker ask-to-apply inbox — reason for declining the invitation. */
  ASK_TO_APPLY_REJECTION_REASON: 'ATA_RJCT',
  /** Employment procedures — withdrawal / early-termination reason category. */
  WITHDRAWAL_REASON_CATEGORY: 'WD_RSN',
  /** Assessment and interview conduct — observed behavior (angry, careless, …). */
  BEHAVIOR: 'BEHV',
} as const;

export type SystemConfigCode = (typeof SYSTEM_CONFIG_CODES)[keyof typeof SYSTEM_CONFIG_CODES];
