/** Admin → System configuration variable codes (shared with backend `SystemVariableCodes`). */
export const SYSTEM_VARIABLE_CODES = {
  ALLOW_USER_RATING: 'ALLOW_USER_RATING',
  SELF_RATING_WEIGHT: 'SELF_RATING_WEIGHT',
  PERIODIC_EVAL_MIN_PERIOD_DAYS: 'PERIODIC_EVAL_MIN_PERIOD_DAYS',
  PERIODIC_EVAL_AUTO_FILL_DATES: 'PERIODIC_EVAL_AUTO_FILL_DATES',
  PERIODIC_EVAL_ALLOW_FUTURE_DATES: 'PERIODIC_EVAL_ALLOW_FUTURE_DATES',
  MATCH_NOTIFICATION_THRESHOLD: 'MATCH_NOTIFICATION_THRESHOLD',
  DEFAULT_LOCALE: 'DEFAULT_LOCALE',
  PKI_ENABLED: 'PKI_ENABLED',
  LOGIN_OTP_ENABLED: 'LOGIN_OTP_ENABLED',
  REGISTRATION_SMS_ENABLED: 'REGISTRATION_SMS_ENABLED',
  REGISTRATION_EMAIL_ENABLED: 'REGISTRATION_EMAIL_ENABLED',
  NAFATH_REGISTRATION_CHECK_ENABLED: 'NAFATH_REGISTRATION_CHECK_ENABLED',
  NAFATH_USE_MOCK: 'NAFATH_USE_MOCK',
  NAFATH_VALIDITY_CHECK: 'NAFATH_VALIDITY_CHECK',
  TRA_LICENSES_USE_MOCK: 'TRA_LICENSES_USE_MOCK',
  ATTACHMENT_ALLOWED_EXTENSIONS: 'ATTACHMENT_ALLOWED_EXTENSIONS',
  ATTACHMENT_MAX_SIZE_MB: 'ATTACHMENT_MAX_SIZE_MB',
  JOB_APPLICATION_UNDERTAKING_EN: 'JOB_APPLICATION_UNDERTAKING_EN',
  JOB_APPLICATION_UNDERTAKING_AR: 'JOB_APPLICATION_UNDERTAKING_AR',
  SCHEDULING_DAY_END_TIME: 'SCHEDULING_DAY_END_TIME',
  EDUCATION_DEGREE_RANKS: 'EDUCATION_DEGREE_RANKS',
} as const;

/** @deprecated Use {@link SYSTEM_VARIABLE_CODES} */
export const SYSTEM_VARIABLE_KEYS = SYSTEM_VARIABLE_CODES;

/** Toggle system variables: `Y`/`N`, or boolean `true`/`false`/`1`. */
export function isYnEnabledValue(raw: string | number | boolean | null | undefined): boolean {
  if (typeof raw === 'boolean') {
    return raw;
  }
  const normalized = String(raw ?? '')
    .trim()
    .toUpperCase();
  return normalized === 'Y' || normalized === 'TRUE' || normalized === '1';
}

/** @deprecated Use {@link isYnEnabledValue} */
export function isPkiEnabledValue(raw: string | number | boolean | null | undefined): boolean {
  return isYnEnabledValue(raw);
}

/** MVC PKI gateway path (`freelancerMvcOrigin` + this path). */
export function buildPkiSsoPath(module: 'JobSeeker' | 'Freelancer' = 'JobSeeker'): string {
  return `/Integrations/RedirectToPkiSso?module=${encodeURIComponent(module)}`;
}
