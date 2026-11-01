import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  CityOption,
  LocationOption,
  MeResponse,
  SavedGeneralInfoOverlay,
  SaveJobSeekerGeneralPayload,
  ServiceOffering,
  SocialState,
} from './jobseeker-profile.models';

/**
 * Injectable boundary for job seeker complete profile (general + social + avatar).
 * Swap implementations for mocks, admin “view as user”, or tests.
 */
export interface JobSeekerProfileActions {
  getMe(): Observable<MeResponse>;
  /** Read-only profile summary for a given job seeker (operator/admin). */
  getProfileById(profileId: number): Observable<MeResponse>;
  getCities(): Observable<CityOption[]>;
  /** UAT-07 Phase 6 — Current Location catalog lookups (`LocationController`, not a new backend
   *  endpoint). Distinct from `getCities()`, which stays the flat all-cities list backing the
   *  legacy `Address` field during this transitional phase. */
  getGovernorates(): Observable<LocationOption[]>;
  getWilayatsByGovernorate(governorateId: number): Observable<LocationOption[]>;
  getCitiesByWilayat(wilayatId: number): Observable<LocationOption[]>;
  getServices(): Observable<ServiceOffering[]>;
  getSocial(profileId: number): Observable<SocialState>;
  /** Image URL or data URL suitable for `<img [src]>`. */
  getProfileImage(imageId: string | number): Observable<string>;
  uploadAvatar(file: File): Observable<string>;
  saveGeneralInfo(payload: SaveJobSeekerGeneralPayload): Observable<unknown>;
  /** CV + work scope saved via `PUT /api/jobseekers/profile/general-info` (overlay after v2 `auth/me`). */
  getSavedGeneralInfo(profileId: number): Observable<SavedGeneralInfoOverlay | null>;
  saveSocial(profileId: number, social: SocialState): Observable<unknown>;
  updateSocial(profileId: number, social: SocialState): Observable<unknown>;
}

export const JOBSEEKER_PROFILE_ACTIONS = new InjectionToken<JobSeekerProfileActions>(
  'JOBSEEKER_PROFILE_ACTIONS'
);
