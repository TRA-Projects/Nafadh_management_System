/// <reference types="@angular/localize" />

/** Map known ASP.NET auth / login `Description` strings to localized copy. */
export function translateAuthApiError(message: string): string {
  const trimmed = (message ?? '').trim();
  if (!trimmed) {
    return message;
  }

  if (/^Email Address or Password is Incorrect\.?$/i.test(trimmed)) {
    return $localize`:@@jobseeker.login.error.invalidCredentials:Email address or password is incorrect.`;
  }
  if (/^Email Address is Incorrect\.?$/i.test(trimmed)) {
    return $localize`:@@jobseeker.login.error.invalidEmail:Email address is incorrect.`;
  }
  if (/^Mobile number is not verified\.?$/i.test(trimmed)) {
    return $localize`:@@jobseeker.login.error.mobileNotVerified:Mobile number is not verified.`;
  }
  if (/^Use PKI to sign in\.?$/i.test(trimmed)) {
    return $localize`:@@jobseeker.login.error.usePki:Use PKI to sign in.`;
  }
  if (/^Waiting for TRA verification\.?$/i.test(trimmed)) {
    return $localize`:@@jobseeker.login.error.waitingTra:Waiting for TRA verification.`;
  }
  if (/^User profile is not linked\.?$/i.test(trimmed)) {
    return $localize`:@@jobseeker.login.error.profileNotLinked:User profile is not linked.`;
  }

  return trimmed;
}
