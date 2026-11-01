import { HttpClient } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { forkJoin, Observable, of } from 'rxjs';

import { catchError, map, switchMap } from 'rxjs/operators';



import { ApiPaths } from '../api-paths';

import type { JobSeekerProfileActions } from '../../profile/jobseeker-profile-actions.token';

import type {

  CityOption,

  CurrentLocationDto,

  LocationOption,

  MeResponse,

  SavedGeneralInfoOverlay,

  SaveJobSeekerGeneralPayload,

  ServiceOffering,

  SocialState,

} from '../../profile/jobseeker-profile.models';

import {

  emptySocial,

  socialArrayToState,

  type SocialProfileRow,

  unwrapData,

  type ApiData,

} from '../../profile/jobseeker-profile-api';



/** One row for POST/PUT `social-profile` (PascalCase to match NAFADH APIs). */

interface SocialProfileWriteDto {

  ProfileId: number;

  SocialProfileUrl: string;

  SocialProfileName: string;

  SocialProfileType: string;

  Id?: number;

}



/** HTTP implementation of {@link JobSeekerProfileActions} (paths in {@link ApiPaths}). */

@Injectable({ providedIn: 'root' })

export class JobseekerProfileApiService implements JobSeekerProfileActions {

  private readonly http = inject(HttpClient);



  getMe(): Observable<MeResponse> {
    return this.http
      .get<ApiData<MeResponse> | MeResponse>(ApiPaths.authMe)
      .pipe(map(unwrapData), map((me) => this.normalizeMeResponse(me)));
  }

  getProfileById(profileId: number): Observable<MeResponse> {
    return this.http
      .get<ApiData<MeResponse> | MeResponse>(ApiPaths.authProfileById(profileId))
      .pipe(map(unwrapData), map((me) => this.normalizeMeResponse(me)));
  }



  getCities(): Observable<CityOption[]> {

    return this.http

      .get<ApiData<unknown> | unknown>(ApiPaths.v2ProfileCities)

      .pipe(map(unwrapData), map((raw) => this.mapCityRows(raw)));

  }

  /**
   * UAT-07 Phase 6 — Current Location catalog lookups. `LocationController` (not a new backend
   * endpoint) returns a bare array, not the `{Code,Data}` envelope — `unwrapData` is a safe no-op
   * pass-through for a bare array (only unwraps when `'Data' in body`), so it's still used here for
   * consistency with every other method in this file. Not yet called from any UI/state in this phase.
   */
  getGovernorates(): Observable<LocationOption[]> {
    return this.http
      .get<ApiData<unknown> | unknown>(ApiPaths.locationGovernorates)
      .pipe(map(unwrapData), map((raw) => this.mapLocationOptionRows(raw)));
  }

  /**
   * Every Wilayat in Oman. Built from the existing governorate and wilayat-by-governorate
   * routes so the job-post dropdown does not depend on a separate list endpoint.
   */
  getAllWilayats(): Observable<LocationOption[]> {
    return this.getGovernorates().pipe(
      switchMap((governorates) => {
        if (governorates.length === 0) {
          return of([] as LocationOption[]);
        }
        return forkJoin(
          governorates.map((governorate) =>
            this.getWilayatsByGovernorate(governorate.Id).pipe(catchError(() => of([] as LocationOption[]))),
          ),
        ).pipe(
          map((groups) => {
            const byId = new Map<number, LocationOption>();
            for (const group of groups) {
              for (const row of group) {
                byId.set(row.Id, row);
              }
            }
            return [...byId.values()];
          }),
        );
      }),
    );
  }

  getWilayatsByGovernorate(governorateId: number): Observable<LocationOption[]> {
    return this.http
      .get<ApiData<unknown> | unknown>(ApiPaths.locationWilayatsByGovernorate(governorateId))
      .pipe(map(unwrapData), map((raw) => this.mapLocationOptionRows(raw)));
  }

  getCitiesByWilayat(wilayatId: number): Observable<LocationOption[]> {
    return this.http
      .get<ApiData<unknown> | unknown>(ApiPaths.locationCitiesByWilayat(wilayatId))
      .pipe(map(unwrapData), map((raw) => this.mapLocationOptionRows(raw)));
  }



  getServices(): Observable<ServiceOffering[]> {

    return this.http

      .get<ApiData<unknown> | unknown>(ApiPaths.profileServiceOffering)

      .pipe(map(unwrapData), map((raw) => this.mapServiceRows(raw)));

  }



  getSocial(profileId: number): Observable<SocialState> {

    return this.http.get<ApiData<unknown> | unknown>(ApiPaths.v2ProfileSocial(profileId)).pipe(

      map(unwrapData),

      map((raw) => {

        if (Array.isArray(raw) && raw.length > 0) {

          return socialArrayToState(raw as SocialProfileRow[]);

        }

        return emptySocial();

      })

    );

  }



  getProfileImage(imageId: string | number): Observable<string> {

    return this.http

      .get<ApiData<string> | string>(ApiPaths.v2ProfileImage(imageId))

      .pipe(map(unwrapData));

  }



  uploadAvatar(file: File): Observable<string> {

    const fd = new FormData();

    fd.append('file', file);

    return this.http.post<ApiData<string> | string>(ApiPaths.v2ProfileUploadAvatar, fd).pipe(

      map(unwrapData),

      map((v) => (typeof v === 'string' ? v : String(v)))

    );

  }



  saveGeneralInfo(payload: SaveJobSeekerGeneralPayload): Observable<unknown> {

    const body: Record<string, unknown> = {

      ProfileId: payload.profileId,

      About: payload.about,

      Website: payload.website,

      Address: payload.address,

      MissionVision: payload.missionVision,

      CompanyName: payload.companyName,

      EmailAddress: payload.email,

      PreferredLanguage: payload.preferredLanguage === 'ar' ? 'ar' : 'en',

      CrNumber: payload.civilId,

      ProfileImage: payload.profileImage,

      ServicesOffered: payload.servicesOffered.map((id) => ({ Id: id })),

      CvAttachment: payload.cvAttachment,

    };

    // UAT-07 Phase 6: only send CurrentLocation when the caller explicitly provided it (even
    // `null`) — omitting the key entirely (the `undefined` case, current behavior for every
    // existing caller since none pass this field yet) means "not part of this request," matching
    // the backend's `body.CurrentLocation == null` handling in `SaveGeneralInfoAsync`. Never
    // fabricated here.
    if (payload.currentLocation !== undefined) {

      body['CurrentLocation'] = payload.currentLocation

        ? ({

            GovernorateId: payload.currentLocation.GovernorateId,

            WilayatId: payload.currentLocation.WilayatId,

            CityId: payload.currentLocation.CityId,

            AddressName: payload.currentLocation.AddressName,

            AddressNameAr: payload.currentLocation.AddressNameAr,

            AddressNameEn: payload.currentLocation.AddressNameEn,

            // Read-only on the backend (ignored by ApplyCurrentLocationAsync) — included only
            // because `CurrentLocationDto` requires it structurally; never meaningful on write.
            HasOverride: payload.currentLocation.HasOverride,

          } satisfies CurrentLocationDto)

        : null;

    }

    return this.http.put(ApiPaths.profileGeneralInfo, body);

  }



  /** Saved CV + work scope overlay until general-info is persisted on v2 `auth/me`. */

  getSavedGeneralInfo(profileId: number): Observable<SavedGeneralInfoOverlay | null> {

    return this.http

      .get<ApiData<Record<string, unknown>> | Record<string, unknown> | null>(

        ApiPaths.profileGeneralInfoByProfileId(profileId)

      )

      .pipe(

        map(unwrapData),

        map((raw) => {

          if (!raw || typeof raw !== 'object') {

            return null;

          }

          const row = raw as Record<string, unknown>;

          const servicesRaw = row['ServicesOffered'];

          const servicesOffered = Array.isArray(servicesRaw)

            ? servicesRaw

                .map((s) => {

                  const item = s as Record<string, unknown>;

                  const id = Number(item['Id'] ?? 0);

                  return Number.isFinite(id) && id > 0 ? { Id: id } : null;

                })

                .filter((x): x is { Id: number } => x != null)

            : [];

          const cvRaw = row['CvAttachment'];

          const cvAttachment = this.mapCvAttachment(cvRaw);

          const missionVision =

            typeof row['MissionVision'] === 'string' ? String(row['MissionVision']) : undefined;

          const addressRaw = row['Address'];

          const address =

            addressRaw != null && addressRaw !== '' ? String(addressRaw) : undefined;

          const hasServicesKey = Array.isArray(servicesRaw);

          const preferredLanguageRaw = row['PreferredLanguage'];
          const preferredLanguage =
            typeof preferredLanguageRaw === 'string' && preferredLanguageRaw.trim().toLowerCase() === 'ar'
              ? 'ar'
              : typeof preferredLanguageRaw === 'string' && preferredLanguageRaw.trim()
                ? 'en'
                : undefined;

          // UAT-07 Phase 6: `undefined` when the key is absent (older/unrelated response shape),
          // `null` when the backend explicitly returned `CurrentLocation: null`. Neither crashes —
          // `mapCurrentLocation` returns the same value it was given in both cases.
          const currentLocation = this.mapCurrentLocation(row['CurrentLocation']);

          if (
            !cvAttachment &&
            !hasServicesKey &&
            !missionVision &&
            address == null &&
            preferredLanguage == null &&
            currentLocation == null
          ) {

            return null;

          }

          return {
            CvAttachment: cvAttachment ?? null,
            ServicesOffered: hasServicesKey ? servicesOffered : [],
            MissionVision: missionVision,
            Address: address,
            PreferredLanguage: preferredLanguage,
            CurrentLocation: currentLocation,
          };

        })

      );

  }



  saveSocial(profileId: number, social: SocialState): Observable<unknown> {

    const SocialProfiles = this.buildSocialProfileRows(profileId, social, false);

    return this.http.post(ApiPaths.v2ProfileSocialRoot, { ProfileId: profileId, SocialProfiles });

  }



  updateSocial(profileId: number, social: SocialState): Observable<unknown> {

    const SocialProfiles = this.buildSocialProfileRows(profileId, social, true);

    return this.http.put(ApiPaths.v2ProfileSocialRoot, { ProfileId: profileId, SocialProfiles });

  }



  /**

   * @param includeRowIds When true, existing row `Id` is sent (PUT updates).

   */

  private buildSocialProfileRows(

    profileId: number,

    social: SocialState,

    includeRowIds: boolean

  ): SocialProfileWriteDto[] {

    return (Object.keys(social) as (keyof SocialState)[]).map((name) => {

      const f = social[name];

      const row: SocialProfileWriteDto = {

        ProfileId: profileId,

        SocialProfileUrl: f.val ?? '',

        SocialProfileName: name,

        SocialProfileType: name,

      };

      if (includeRowIds && f.id != null) {

        row.Id = f.id;

      }

      return row;

    });

  }



  /** Ensure CV (and related) fields are camelCase-normalized for the profile UI. */
  private normalizeMeResponse(me: MeResponse | null | undefined): MeResponse {
    if (me == null || typeof me !== 'object') {
      throw new Error('Profile response was empty.');
    }
    const row = me as MeResponse & Record<string, unknown>;
    const cvRaw = row.CvAttachment ?? row['cvAttachment'] ?? null;
    return {
      ...me,
      CvAttachment: this.mapCvAttachment(cvRaw),
    };
  }

  private mapCvAttachment(raw: unknown): MeResponse['CvAttachment'] | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    const row = raw as Record<string, unknown>;
    const attachmentId = Number(row['attachmentId'] ?? row['AttachmentId'] ?? 0);
    const fileName = String(row['fileName'] ?? row['FileName'] ?? '').trim();
    if (!fileName && !(attachmentId > 0)) {
      return null;
    }
    return {
      attachmentId: attachmentId > 0 ? attachmentId : undefined,
      fileName: fileName || 'attachment',
      fileType: String(row['fileType'] ?? row['FileType'] ?? 'application/octet-stream'),
      fileSize: Number(row['fileSize'] ?? row['FileSize'] ?? 0),
      dataUrl:
        typeof row['dataUrl'] === 'string'
          ? row['dataUrl']
          : typeof row['DataUrl'] === 'string'
            ? row['DataUrl']
            : undefined,
    };
  }

  /**
   * UAT-07 Phase 6 — maps the raw `CurrentLocation` value from `GET general-info`. Never throws:
   * `undefined` (key absent) stays `undefined`; `null`/a non-object stays `null`; a real object is
   * coerced field-by-field so a malformed individual field (e.g. a non-numeric id) degrades to
   * `null` for that field rather than crashing the whole overlay.
   */
  private mapCurrentLocation(raw: unknown): CurrentLocationDto | null | undefined {
    if (raw === undefined) {
      return undefined;
    }
    if (raw === null || typeof raw !== 'object') {
      return null;
    }
    const row = raw as Record<string, unknown>;
    const toNullableNumber = (v: unknown): number | null => {
      if (v == null) {
        return null;
      }
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const toNullableString = (v: unknown): string | null => {
      if (v == null) {
        return null;
      }
      const s = String(v).trim();
      return s ? s : null;
    };
    return {
      GovernorateId: toNullableNumber(row['GovernorateId']),
      WilayatId: toNullableNumber(row['WilayatId']),
      CityId: toNullableNumber(row['CityId']),
      AddressName: toNullableString(row['AddressName']),
      // UAT-07 Phase 6D.2: bilingual Other/Not-listed pair. Backend returns null for both on a
      // legacy record saved before this phase (never fabricated from AddressName) — coerced the
      // same null-safe way as every other field here.
      AddressNameAr: toNullableString(row['AddressNameAr']),
      AddressNameEn: toNullableString(row['AddressNameEn']),
      // UAT-07 Final Consolidation: read-only signal from the backend — coerced to a strict boolean
      // (missing/falsy key on an old backend build defaults to false, i.e. "treat as not an override,"
      // the safe default that never risks accidentally persisting a fallback display value).
      HasOverride: row['HasOverride'] === true,
    };
  }

  private mapCityRows(raw: unknown): CityOption[] {

    const arr = Array.isArray(raw) ? raw : [];

    return arr.map((x: Record<string, unknown>) => ({

      Id: Number(x['Id']),

      Name_en: String(x['Name_en'] ?? x['Name'] ?? ''),

      Name_ar: String(x['Name_ar'] ?? x['ArabicName'] ?? ''),

    }));

  }



  /** Maps `LocationController` `{Id, Name, ArabicName}` rows (PascalCase or camelCase). */
  private mapLocationOptionRows(raw: unknown): LocationOption[] {
    const arr = locationRowsFromBody(raw);
    return arr
      .map((x) => ({
        Id: Number(x['Id'] ?? x['id']),
        Name_en: String(x['Name_en'] ?? x['Name'] ?? x['name'] ?? ''),
        Name_ar: String(x['Name_ar'] ?? x['ArabicName'] ?? x['arabicName'] ?? ''),
      }))
      .filter((row) => Number.isFinite(row.Id) && row.Id > 0);
  }

  private mapServiceRows(raw: unknown): ServiceOffering[] {
    const arr = Array.isArray(raw) ? raw : [];
    return arr.map((x: Record<string, unknown>) => ({
      Id: Number(x['Id']),
      Name_en: String(x['Name_en'] ?? x['Name'] ?? ''),
      Name_ar: String(x['Name_ar'] ?? x['ArabicName'] ?? ''),
    }));
  }
}

function locationRowsFromBody(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    return raw.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object');
  }
  if (raw && typeof raw === 'object') {
    const rec = raw as Record<string, unknown>;
    const inner = rec['Data'] ?? rec['data'];
    if (Array.isArray(inner)) {
      return inner.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object');
    }
  }
  return [];
}


