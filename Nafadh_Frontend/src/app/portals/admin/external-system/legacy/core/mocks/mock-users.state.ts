import type { RegisterJobseekerDto } from '../api/models/jobseeker-registration.models';
import type { MockUserRow } from '../auth/mock-user.types';
import { MOCK_USER_ID_STORAGE_KEY } from '../auth/mock-user.storage';
import { resolvePublicUrl } from '../public-url';

let seeded = false;
let users: MockUserRow[] = [];
let nextSyntheticProfileId = 500;
let seedInFlight: Promise<void> | null = null;

/** Loads seed from `/assets/mocks/mock-users.json` once (mock backend only). */
export async function ensureMockUsersSeeded(): Promise<void> {
  if (seeded) {
    return;
  }
  if (seedInFlight) {
    await seedInFlight;
    return;
  }

  const timeoutMs = 4000;
  seedInFlight = (async () => {
    try {
      const fetchPromise = fetch(resolvePublicUrl('/assets/mocks/mock-users.json'));
      const timeoutPromise = new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error('mock users seed timeout')), timeoutMs);
      });
      const r = (await Promise.race([fetchPromise, timeoutPromise])) as Response;
      if (!r.ok) {
        users = [];
        return;
      }
      const j = (await r.json()) as { users: MockUserRow[] };
      users = [...(j.users ?? [])];
      const maxPid = users.reduce((m, u) => {
        const pid = Number((u.profile as { profileId?: unknown })?.profileId);
        return Number.isFinite(pid) ? Math.max(m, pid) : m;
      }, 0);
      nextSyntheticProfileId = Math.max(nextSyntheticProfileId, maxPid + 1);
    } catch (error) {
      console.warn('[MockUsers] seed failed; falling back to empty list', error);
      users = [];
    } finally {
      seeded = true;
      seedInFlight = null;
    }
  })();

  await seedInFlight;
}

export function getMockUsers(): MockUserRow[] {
  return users;
}

export function getMockCompanyOwners(): { ProfileId: number; Name: string; NameAr: string }[] {
  return users
    .filter((u) => u.vendorTypeId === 2 || u.vendorTypeId === 4)
    .map((u) => {
      const p = u.profile as {
        profileId?: unknown;
        organizationName?: unknown;
        organizationNameAr?: unknown;
        displayName?: unknown;
      };
      const profileId = Number(p.profileId ?? 0);
      const name = String(p.organizationName ?? p.displayName ?? u.displayName);
      const nameAr = String(p.organizationNameAr ?? name);
      return { ProfileId: profileId, Name: name, NameAr: nameAr };
    })
    .filter((x) => Number.isFinite(x.ProfileId) && x.ProfileId > 0);
}

/** Mock login aliases (e.g. `operator@mock` → canonical seed email). */
export function resolveMockLoginEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const aliases: Record<string, string> = {
    'operator@mock': 'operator@mock.local',
    'admin@mock': 'admin@mock.local',
    'jobseeker@mock': 'jobseeker@mock.local',
  };
  return aliases[normalized] ?? normalized;
}

export function findMockUserById(id: string | null): MockUserRow | undefined {
  if (!id) {
    return undefined;
  }
  return users.find((u) => u.id === id);
}

/** Same key as {@link AuthService} `VENDOR_TYPE_KEY` — used for mock operator scoping when persona id is missing. */
const MOCK_SESSION_VENDOR_TYPE_KEY = 'jobseeker_vendor_type';

/** Operator nav (`vendorType` 2 or 4) from session storage (mock login or persisted JWT vendor type). */
export function isMockOperatorVendorTypeSession(): boolean {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }
  const vt = sessionStorage.getItem(MOCK_SESSION_VENDOR_TYPE_KEY);
  return vt === '2' || vt === '4';
}

/**
 * When the mock session is an operator (`vendorTypeId` 2 or 4), returns that user's company `profileId`
 * for job-owner scoping. Admin / job seeker sessions return `null`.
 */
export function getMockSessionOperatorOwnerProfileId(): number | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  const mockId = sessionStorage.getItem(MOCK_USER_ID_STORAGE_KEY);
  const u = findMockUserById(mockId);
  if (!u) {
    return null;
  }
  const vt = u.vendorTypeId;
  if (vt !== 2 && vt !== 4) {
    return null;
  }
  const pid = Number((u.profile as { profileId?: unknown }).profileId ?? 0);
  return Number.isFinite(pid) && pid > 0 ? pid : null;
}

/** Platform admin mock session (`vendorTypeId` 0), matching {@link AuthService.isAdminNav}. */
export function isMockSessionAdminNav(): boolean {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }
  const u = findMockUserById(sessionStorage.getItem(MOCK_USER_ID_STORAGE_KEY));
  return u?.vendorTypeId === 0;
}

export function findMockUserByProfileId(profileId: number): MockUserRow | undefined {
  return users.find((u) => Number((u.profile as { profileId?: unknown }).profileId ?? 0) === profileId);
}

export function registerMockJobseeker(row: MockUserRow): { ok: true } | { ok: false; reason: 'duplicate_email' } {
  const email = row.email.trim().toLowerCase();
  if (users.some((u) => u.email.trim().toLowerCase() === email)) {
    return { ok: false, reason: 'duplicate_email' };
  }
  users.push(row);
  return { ok: true };
}

export function allocateMockJobseekerProfileId(): number {
  return nextSyntheticProfileId++;
}

export function updateMockUserProfileCompletionPending(userId: string, pending: boolean): void {
  const u = users.find((x) => x.id === userId);
  if (u) {
    u.profileCompletionPending = pending;
  }
}

export function patchMockUserProfile(profileId: number, patch: Record<string, unknown>): boolean {
  const u = findMockUserByProfileId(profileId);
  if (!u) {
    return false;
  }
  u.profile = {
    ...u.profile,
    ...patch,
  };
  return true;
}

export function parseRegisterJobseekerBody(body: unknown): RegisterJobseekerDto | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const b = body as Record<string, unknown>;
  const email = String(b['Email'] ?? '').trim();
  if (!email) {
    return null;
  }
  return {
    CivilId: String(b['CivilId'] ?? b['CivilID'] ?? '').trim(),
    Email: email,
    Name_en: String(b['Name_en'] ?? b['NameEn'] ?? '').trim(),
    Name_ar: String(b['Name_ar'] ?? b['NameAr'] ?? '').trim(),
    MobileNumber: String(b['MobileNumber'] ?? '').trim() || undefined,
    NationalityCode: String(b['NationalityCode'] ?? b['CountryCode'] ?? '').trim(),
    PrimarySpecificationId: String(b['PrimarySpecificationId'] ?? '').trim(),
    SubSpecificationId: String(b['SubSpecificationId'] ?? '').trim(),
  };
}

export function buildMockUserRowFromRegistration(dto: RegisterJobseekerDto): MockUserRow {
  const displayName = dto.Name_en.trim() || dto.Name_ar.trim() || dto.Email;
  const profileId = allocateMockJobseekerProfileId();
  return {
    id: `mock-jobseeker-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    email: dto.Email.trim(),
    displayName,
    role: 'jobSeeker',
    vendorTypeId: 1,
    profileTypeId: 8,
    profileCompletionPending: true,
    profile: {
      profileId,
      displayName,
      locale: 'en',
      vendorTypeId: 1,
      profileTypeId: 8,
      headline: 'Job seeker',
      phone: dto.MobileNumber ?? '',
      countryCode: dto.NationalityCode,
      registrationCityId: 1,
      primarySpecificationId: dto.PrimarySpecificationId,
      subSpecificationId: dto.SubSpecificationId,
      About: '<p></p>',
      Website: 'https://example.com',
      CrNumber: dto.CivilId,
    },
  };
}
