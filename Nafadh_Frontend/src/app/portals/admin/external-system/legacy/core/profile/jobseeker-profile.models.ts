/** `auth/me` + profile completion payloads (PascalCase from NAFADH API). */
export interface ProfileTypeRef {
  Id: number;
  Name?: string;
}

export interface MeResponse {
  ProfileId: number;
  CompanyName: string;
  Address: string | number;
  PhoneNumber: string;
  EmailAddress: string;
  /** Preferred notification language: `en` | `ar`. */
  PreferredLanguage?: string;
  CrNumber: string;
  Website: string;
  About: string;
  MissionVision?: string;
  ServicesOffered: { Id: number }[];
  ProfileImage: string | number | null;
  CvAttachment?: JobSeekerCvAttachment | null;
  VendorType?: ProfileTypeRef;
  /** From `AppUser.EmailConfirmed`. */
  IsEmailVerified?: boolean;
  /** From `Profile.UserProfileCompleted` — false until wizard finish. */
  UserProfileCompleted?: boolean;
}

export interface JobSeekerCvAttachment {
  attachmentId?: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  dataUrl?: string;
}

export interface CityOption {
  Id: number;
  Name_en: string;
  Name_ar: string;
}

/** Bilingual option row for Governorate/Wilayat dropdowns (UAT-07 Phase 6) — structurally identical
 *  to `CityOption` but kept as its own type so callers don't imply "this is specifically a City."
 *  Sourced from `LocationController` (`GetAllGovernorates`/`GetWilayatByGovernorateid`), which
 *  returns raw `Id`/`Name`/`ArabicName` (verified PascalCase at runtime — NOT the lowercase shape
 *  `report-builder-api.service.ts`'s `LocationGovernorateDto` incorrectly assumes). */
export interface LocationOption {
  Id: number;
  Name_en: string;
  Name_ar: string;
}

/**
 * Current/User-owned location (UAT-07 Phase 5/6) — editable by the Jobseeker, entirely separate
 * from the read-only Official/MOL location shown in the profile sidebar
 * (`JobSeekerSidebarSummary.Governorate`/`.Wilayat`). Mirrors the backend
 * `CurrentLocationDto` (`Bidding_Models/Jobseekers/JobseekerProfileGeneralDto.cs`) field-for-field.
 * Governorate/Wilayat are required together; Village/Area is exactly one of a catalog `CityId` or
 * Other/Not-listed free text, never both — see the backend's `ApplyCurrentLocationAsync` for the
 * authoritative validation rules.
 *
 * UAT-07 Phase 6D.2 — bilingual Other/Not-listed (additive, backward compatible):
 * `AddressNameAr`/`AddressNameEn` are the authoritative pair for NEW Other-mode saves and are
 * required together when Other mode is used. `AddressName` is retained only as legacy read/mirror
 * compatibility for records saved before this phase — never the authoritative value for a new save.
 */
export interface CurrentLocationDto {
  GovernorateId: number | null;
  WilayatId: number | null;
  CityId: number | null;
  /** Legacy compatibility only — see the interface doc comment. */
  AddressName: string | null;
  /** New bilingual Other/Not-listed free text — Arabic. Required together with `AddressNameEn`. */
  AddressNameAr: string | null;
  /** New bilingual Other/Not-listed free text — English. Required together with `AddressNameAr`. */
  AddressNameEn: string | null;
  /**
   * READ-ONLY — ignored on write (UAT-07 Final Consolidation). `true` when these values are a real,
   * previously-saved override; `false` means they're an Official/MOL DISPLAY-ONLY fallback (best
   * effort Governorate/Wilayat only — `CityId` stays null) that has never actually been saved. The
   * client must never persist these values off a `false` response unless the user explicitly changes
   * something first.
   */
  HasOverride: boolean;
}

export interface ServiceOffering {
  Id: number;
  Name_en: string;
  Name_ar: string;
}

export interface SocialField {
  id?: number;
  val: string;
}

/** Form state for social URLs (matches API social-profile rows). */
export interface SocialState {
  linkedin: SocialField;
  github: SocialField;
  twitter: SocialField;
  facebook: SocialField;
}

export interface SaveJobSeekerGeneralPayload {
  profileId: number;
  about: string;
  missionVision: string;
  website: string;
  address: string | number;
  companyName: string;
  email: string;
  civilId: string;
  profileImage: string | number | null;
  /** Preferred notification language: `en` | `ar`. */
  preferredLanguage?: string;
  servicesOffered: number[];
  cvAttachment: JobSeekerCvAttachment | null;
  /**
   * UAT-07 Phase 6 — when provided, sent as the backend's structured `CurrentLocation`, which takes
   * full precedence over `address` for this save (see `JobseekerProfileGeneralService.SaveGeneralInfoAsync`).
   * `undefined`/omitted means "not part of this request" — the backend leaves the Jobseeker's
   * existing Current Location untouched. Not yet wired to any UI in this phase.
   */
  currentLocation?: CurrentLocationDto | null;
}

/** Overlay from `GET /api/jobseekers/profile/general-info` (fields may be partial). */
export type SavedGeneralInfoOverlay = Pick<MeResponse, 'CvAttachment' | 'ServicesOffered'> & {
  MissionVision?: string;
  Address?: MeResponse['Address'];
  PreferredLanguage?: string;
  /** UAT-07 Phase 6 — `undefined` when the backend didn't include the key; `null` when the backend
   *  explicitly returned `CurrentLocation: null`. Both mean "no Current Location known yet." */
  CurrentLocation?: CurrentLocationDto | null;
};
