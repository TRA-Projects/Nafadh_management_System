/** `GET /api/v2/registration/auth-settings` */
export interface PlatformAuthSettings {
  PkiEnabled: boolean;
  PkiEnabledRaw: string;
  /** When true, staff password login requires SMS OTP. */
  LoginOtpEnabled: boolean;
  LoginOtpEnabledRaw: string;
  RegistrationSmsEnabled: boolean;
  RegistrationSmsEnabledRaw: string;
  RegistrationEmailEnabled: boolean;
  RegistrationEmailEnabledRaw: string;
}
