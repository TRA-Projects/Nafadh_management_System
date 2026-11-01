import {
  canShowNav,
  isSystemAdminFromAccessToken,
  normalizePermissions,
  pageUrlMatches,
} from './identity-access-nav';

describe('identity-access-nav', () => {
  it('canShowNav_AlwaysTrue_VendorTypeGatesLayout', () => {
    expect(canShowNav('/admin/users', { Bypass: true, Pages: [] })).toBeTrue();
    expect(canShowNav('/admin/roles', { Bypass: false, Pages: [] })).toBeTrue();
    expect(canShowNav('/admin/template-roles', null)).toBeTrue();
  });

  it('canShowNav_EmptyGrants_StillShowsIdentityPages', () => {
    expect(canShowNav('/admin/users', { Bypass: false, Pages: [] })).toBeTrue();
    expect(canShowNav('/admin/dashboard', { Bypass: false, Pages: [] })).toBeTrue();
  });

  it('normalizePermissions_CamelCase_AndSystemAdminJwt_SetsBypass', () => {
    const header = btoa(JSON.stringify({ alg: 'none' }));
    const payload = btoa(JSON.stringify({ UserType: 'System', UserGroup: 'SystemAdmin' }));
    const token = `${header}.${payload}.x`;

    const normalized = normalizePermissions({ bypass: false, pages: [{ url: '/admin/users' }] }, token);
    expect(normalized?.Bypass).toBeTrue();
    expect(isSystemAdminFromAccessToken(token)).toBeTrue();
    expect(pageUrlMatches('/admin/users', '/admin/users')).toBeTrue();
  });
});
