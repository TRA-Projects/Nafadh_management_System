export interface RegisterJobseekerResponse {
  UserId: string;
  MockUserId: string;
  ProfileId: number;
}

export type CivilIdLookupStatus = 'not_found' | 'already_registered' | 'available';

export interface CivilIdLookupResponse {
  Status: CivilIdLookupStatus;
  CivilId: string;
  Name_en?: string;
  Name_ar?: string;
  MobileNumber?: string;
  /** Arabic primary specialization from Nafath education (`NIMR_MOHE_MAJOR_QLFN_DESC` / minor). */
  PrimarySpecification_ar?: string;
}

export interface RequestRegistrationOtpResponse {
  SessionId: string;
  /** Present only when registration SMS is disabled (demo mode). */
  OtpCode?: string;
  ExpiresInSeconds: number;
}

export interface VerifyRegistrationOtpResponse {
  Valid: boolean;
}

export interface VerifyJobseekerEmailResponse {
  Email: string;
  ProfileId: number;
  EmailConfirmed: boolean;
}

/** Request body for `POST /api/v2/auth/register/jobseeker` (PascalCase for API parity). */
export interface RegisterJobseekerDto {
  CivilId: string;
  Email: string;
  Name_en: string;
  Name_ar: string;
  MobileNumber?: string;
  NationalityCode: string;
  PrimarySpecificationId: string;
  SubSpecificationId?: string;
  /** PKI pre-registration JWT when `PKI_ENABLED` = Y. */
  TempToken?: string;
}
