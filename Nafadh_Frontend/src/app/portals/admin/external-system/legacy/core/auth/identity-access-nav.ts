import type {
  IdentityAccessPageGrantViewDto,
  IdentityAccessPermissionDto,
} from '../api/models/identity-access.models';
import { parseJwtPayload } from './auth-jwt.util';
import { getAccessToken } from './auth-token.storage';

export function normalizeNavPath(path: string): string {
  const raw = (path ?? '').split('?')[0].trim();
  if (!raw) {
    return '';
  }
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
}

export function pageUrlMatches(grantedUrl: string, requestPath: string): boolean {
  const granted = normalizeNavPath(grantedUrl);
  const request = normalizeNavPath(requestPath);
  if (!granted || !request) {
    return false;
  }
  if (granted.toLowerCase() === request.toLowerCase()) {
    return true;
  }
  const grantedParts = granted.split('/');
  const requestParts = request.split('/');
  if (grantedParts.length !== requestParts.length) {
    return false;
  }
  return grantedParts.every((part, i) => part.startsWith(':') || part.toLowerCase() === requestParts[i].toLowerCase());
}

/** True when JWT says System / SystemAdmin (page-grant bypass). */
export function isSystemAdminFromAccessToken(token: string | null | undefined): boolean {
  if (!token) {
    return false;
  }
  const payload = parseJwtPayload(token);
  if (!payload) {
    return false;
  }
  const userType = String(payload['UserType'] ?? payload['userType'] ?? '').trim();
  const userGroup = String(payload['UserGroup'] ?? payload['userGroup'] ?? '').trim();
  return userType.toLowerCase() === 'system' && userGroup.toLowerCase() === 'systemadmin';
}

function readPageGrant(raw: unknown): IdentityAccessPageGrantViewDto | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const url = String(row['Url'] ?? row['url'] ?? '').trim();
  if (!url) {
    return null;
  }
  return {
    AppPageId: Number(row['AppPageId'] ?? row['appPageId'] ?? 0),
    Code: String(row['Code'] ?? row['code'] ?? ''),
    Url: url,
    ActionFlags: Number(row['ActionFlags'] ?? row['actionFlags'] ?? 0),
    DataScope: String(row['DataScope'] ?? row['dataScope'] ?? ''),
  };
}

/**
 * Normalize permissions payloads (PascalCase or camelCase) and apply SystemAdmin JWT bypass.
 * Returns `null` when the payload is missing/unusable so nav fails open.
 */
export function normalizePermissions(
  raw: unknown,
  accessToken: string | null | undefined = getAccessToken()
): IdentityAccessPermissionDto | null {
  if (isSystemAdminFromAccessToken(accessToken)) {
    const pages =
      raw && typeof raw === 'object'
        ? (((raw as Record<string, unknown>)['Pages'] ??
            (raw as Record<string, unknown>)['pages'] ??
            []) as unknown[])
            .map(readPageGrant)
            .filter((p): p is IdentityAccessPageGrantViewDto => p != null)
        : [];
    return { Bypass: true, Pages: pages };
  }

  if (raw == null || typeof raw !== 'object') {
    return null;
  }

  const obj = raw as Record<string, unknown>;
  const bypass = Boolean(obj['Bypass'] ?? obj['bypass']);
  const pagesRaw = obj['Pages'] ?? obj['pages'];
  const pages = Array.isArray(pagesRaw)
    ? pagesRaw.map(readPageGrant).filter((p): p is IdentityAccessPageGrantViewDto => p != null)
    : [];

  return { Bypass: bypass, Pages: pages };
}

/**
 * Runtime nav uses VendorType (admin / operator / jobseeker layout variants).
 * Identity Access page grants stay in admin user-management but are not enforced here.
 */
export function canShowNav(path: string, permissions: IdentityAccessPermissionDto | null): boolean {
  void path;
  void permissions;
  return true;
}
