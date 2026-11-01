/**
 * Read NAFADH-style JWT payload (middle segment). `VendorType` is a string claim in platform JWTs.
 */
export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Returns JWT `ProfileId` claim, or `null` if missing. */
export function profileIdFromAccessToken(token: string): number | null {
  const p = parseJwtPayload(token);
  if (!p) {
    return null;
  }
  const raw = p['ProfileId'] ?? p['profileId'];
  const pid = Number(raw);
  return Number.isFinite(pid) && pid > 0 ? pid : null;
}

/** Returns JWT `VendorType` / backend ProfileType as a string, or `null` if missing. */
export function vendorTypeFromAccessToken(token: string): string | null {
  const p = parseJwtPayload(token);
  if (!p) {
    return null;
  }
  const v = p['VendorType'] ?? p['vendorType'];
  if (v == null) {
    return null;
  }
  return String(v);
}

/**
 * Maps backend ProfileType to JobseekerModule nav role.
 * FreeLancer (`1`) and JobSeeker (`8`) share the same job seeker landing page.
 */
export function navVendorTypeFromProfileType(raw: number | string | null | undefined): string | null {
  if (raw == null || raw === '') {
    return null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return String(raw);
  }
  if (n === 0) {
    return '0';
  }
  if (n === 1 || n === 8) {
    return '1';
  }
  // 2 = SME, 4 = Operator, 5 = company user (OUser), 6 = Staff — operator / company nav.
  if (n === 2 || n === 4 || n === 5 || n === 6) {
    return String(n);
  }
  return String(n);
}
