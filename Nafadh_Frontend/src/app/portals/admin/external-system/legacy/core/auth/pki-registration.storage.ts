/** Session keys for PKI → jobseeker registration handoff (mirrors Freelancer sessionStorage). */

export const PKI_TEMP_TOKEN_KEY = 'jobseekerPkiTempToken';
export const PKI_CIVIL_ID_KEY = 'jobseekerPkiCivilId';
export const PKI_MOBILE_KEY = 'jobseekerPkiMobile';

export interface PkiRegistrationContext {
  tempToken: string;
  /** Plain civil id from PKI (for the registration form). */
  civilId: string;
  /** Plain mobile from PKI when available (card PKI may omit). */
  mobile: string;
}

export function writePkiRegistrationContext(ctx: PkiRegistrationContext): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.setItem(PKI_TEMP_TOKEN_KEY, ctx.tempToken);
  sessionStorage.setItem(PKI_CIVIL_ID_KEY, ctx.civilId);
  sessionStorage.setItem(PKI_MOBILE_KEY, ctx.mobile ?? '');
}

export function readPkiRegistrationContext(): PkiRegistrationContext | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  const tempToken = (sessionStorage.getItem(PKI_TEMP_TOKEN_KEY) ?? '').trim();
  const civilId = (sessionStorage.getItem(PKI_CIVIL_ID_KEY) ?? '').trim();
  if (!tempToken || !civilId) {
    return null;
  }
  return {
    tempToken,
    civilId,
    mobile: (sessionStorage.getItem(PKI_MOBILE_KEY) ?? '').trim(),
  };
}

export function clearPkiRegistrationContext(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.removeItem(PKI_TEMP_TOKEN_KEY);
  sessionStorage.removeItem(PKI_CIVIL_ID_KEY);
  sessionStorage.removeItem(PKI_MOBILE_KEY);
}
