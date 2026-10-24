import {
  HttpEvent,
  HttpHandlerFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

const NAFADH_SNAPSHOT_URL = 'https://localhost:7082/api/NafadhIdentityBridge/snapshot';
const NAFADH_USER_TYPE_ID = 9000;
const NAFADH_GROUP_BASE_ID = 9000;
const NAFADH_ORG_BASE_ID = 90000;

interface NafadhSnapshot {
  roles: Array<{
    roleId: number;
    roleName: string;
    usersCount: number;
    permissionsCount: number;
  }>;
  users: Array<{
    userId: number;
    fullName: string;
    email: string;
    phone: string;
    roleId: number;
    roleName: string;
    status: string;
    companyId: number | null;
    companyName: string;
  }>;
  permissions: Array<{
    permissionId: number;
    permissionKey: string;
    description: string;
  }>;
  rolePermissions: Array<{
    roleId: number;
    permissionId: number;
  }>;
  companies: Array<{
    companyId: number;
    companyName: string;
    commercialRegister: string;
    workField: string;
    status: string;
  }>;
  departments: Array<{
    departmentId: number;
    companyId: number;
    departmentName: string;
    companyName: string;
    membersCount: number;
  }>;
  supervisors: Array<{
    supervisorId: number;
    companyId: number;
    department: string;
    position: string;
    status: string;
    companyName: string;
  }>;
}

let cachedSnapshot: NafadhSnapshot | null = null;
let cachedSnapshotAt = 0;
let inflightSnapshot: Promise<NafadhSnapshot | null> | null = null;
let detectedFirstPageIndex: 0 | 1 | null = null;
let lastEnvelopeKey: 'Data' | 'data' | null = 'Data';

const ROLE_AR_MAP: Record<string, string> = {
  admin: 'مدير النظام',
  superadmin: 'المدير العام',
  authority: 'الجهة المشرفة',
  company: 'شركة تدريبية',
  supervisor: 'مشرف شركة',
  companysupervisor: 'مشرف شركة',
  trainer: 'مدرب',
  trainee: 'متدرب',
};

function translateRoleAr(roleName: string): string {
  const clean = (roleName || '').trim();
  if (!clean) return 'مستخدم نفاذ';
  const key = clean.toLowerCase().replace(/[\s_-]+/g, '');
  return ROLE_AR_MAP[key] || clean;
}

function toCode(text: string, fallback: string): string {
  const cleaned = (text || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || fallback;
}

function isStatusActive(status: string | null | undefined): boolean {
  const s = String(status ?? 'Active').trim().toLowerCase();
  if (!s) return true;
  if (['inactive', 'disabled', 'suspended', 'rejected', 'blocked', 'deleted', '0', 'false'].includes(s)) {
    return false;
  }
  return true;
}

function fetchNafadhSnapshot(nafadhToken: string | null): Promise<NafadhSnapshot | null> {
  const now = Date.now();
  if (cachedSnapshot && now - cachedSnapshotAt < 15_000) {
    return Promise.resolve(cachedSnapshot);
  }
  if (inflightSnapshot) {
    return inflightSnapshot;
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (nafadhToken) {
    headers['Authorization'] = `Bearer ${nafadhToken}`;
  }

  inflightSnapshot = fetch(NAFADH_SNAPSHOT_URL, { method: 'GET', headers })
    .then(async (res) => {
      if (!res.ok) return cachedSnapshot;
      const json = (await res.json()) as any;
      const snap: NafadhSnapshot = (json?.Data ?? json?.data ?? json) as NafadhSnapshot;
      if (snap && Array.isArray(snap.users) && Array.isArray(snap.roles)) {
        cachedSnapshot = snap;
        cachedSnapshotAt = Date.now();
        return snap;
      }
      return cachedSnapshot;
    })
    .catch(() => cachedSnapshot)
    .finally(() => {
      inflightSnapshot = null;
    });

  return inflightSnapshot;
}

function interleave<T>(first: T[], second: T[]): T[] {
  const out: T[] = [];
  const max = Math.max(first.length, second.length);
  for (let i = 0; i < max; i++) {
    if (i < first.length) out.push(first[i]);
    if (i < second.length) out.push(second[i]);
  }
  return out;
}

function adaptCase(item: Record<string, any>, sample?: Record<string, any> | null): Record<string, any> {
  if (!sample || typeof sample !== 'object') return item;
  const usesCamel =
    ('id' in sample && !('Id' in sample)) ||
    ('nameEn' in sample && !('NameEn' in sample));
  if (!usesCamel) return item;

  const converted: Record<string, any> = {};
  for (const [k, v] of Object.entries(item)) {
    const camelKey = k.charAt(0).toLowerCase() + k.slice(1);
    converted[camelKey] = Array.isArray(v)
      ? v.map((child) =>
        child && typeof child === 'object' ? adaptCase(child, sample['groups']?.[0] ?? sample) : child,
        )
      : v;
  }
  return converted;
}

function wrapSyntheticBody(payload: any): any {
  if (lastEnvelopeKey === 'Data') return { Data: payload, IsSuccess: true };
  if (lastEnvelopeKey === 'data') return { data: payload, isSuccess: true };
  return payload;
}

function buildNafadhGroups(snap: NafadhSnapshot, includeInactive: boolean) {
  const roles = snap.roles.length
    ? snap.roles
    : [{ roleId: 1, roleName: 'User', usersCount: snap.users.length, permissionsCount: 0 }];

  const groups = roles.map((r, idx) => {
    const roleAr = translateRoleAr(r.roleName);
    const roleEn = r.roleName || `Role ${r.roleId}`;
    const groupId = NAFADH_GROUP_BASE_ID + r.roleId;
    return {
      Id: groupId,
      UserTypeId: NAFADH_USER_TYPE_ID,
      Code: `NFD_${toCode(roleEn, String(r.roleId))}`,
      NameEn: `${roleEn} (Nafadh)`,
      NameAr: `${roleAr} (نفاذ)`,
      SortOrder: idx + 1,
      IsActive: true,
      IsSystem: true,
      IsProtected: true,
      CanDeactivate: false,
      CanEdit: false,
      TemplateRoleId: `nafadh-tpl-${r.roleId}`,
      UsersCount: r.usersCount,
      CustomRolesCount: 0,
    };
  });

  const filteredGroups = includeInactive ? groups : groups.filter((g) => g.IsActive);

  return {
    userType: {
      Id: NAFADH_USER_TYPE_ID,
      Code: 'NAFADH',
      NameEn: 'Nafadh Platform',
      NameAr: 'منصة نفاذ',
      SortOrder: 900,
      IsActive: true,
      HasRequesterCapability: false,
      Groups: filteredGroups,
    },
    groups: filteredGroups,
  };
}

function buildNafadhUsers(
  snap: NafadhSnapshot,
  filters: {
    q: string;
    userTypeId: number | null;
    userGroupId: number | null;
    isActive: boolean | null;
  },
) {
  const roleMap = new Map(snap.roles.map((r) => [r.roleId, r]));

  return snap.users
    .map((u) => {
      const roleObj = roleMap.get(u.roleId);
      const rawRoleName = u.roleName || roleObj?.roleName || 'Member';
      const roleAr = translateRoleAr(rawRoleName);
      const groupId = NAFADH_GROUP_BASE_ID + (u.roleId || 1);
      const active = isStatusActive(u.status);
      const displayName = (u.fullName || u.email || `User #${u.userId}`).trim();
      const orgNameAr = u.companyName ? `${u.companyName} (نفاذ)` : 'منصة نفاذ';
      const orgNameEn = u.companyName ? `${u.companyName} (Nafadh)` : 'Nafadh Platform';

      return {
        Id: `nafadh-user-${u.userId}`,
        ProfileId: u.userId,
        UserName: u.email || `nafadh_${u.userId}`,
        NameEn: displayName,
        NameAr: displayName,
        Email: u.email || '',
        PhoneNumber: u.phone || null,
        OrganizationId: u.companyId ? NAFADH_ORG_BASE_ID + u.companyId : null,
        OrganizationNameEn: orgNameEn,
        OrganizationNameAr: orgNameAr,
        UserTypeId: NAFADH_USER_TYPE_ID,
        UserTypeCode: 'NAFADH',
        UserTypeNameEn: 'Nafadh Platform',
        UserTypeNameAr: 'منصة نفاذ',
        UserGroupId: groupId,
        UserGroupCode: `NFD_${toCode(rawRoleName, String(u.roleId || 1))}`,
        UserGroupNameEn: `${rawRoleName} (Nafadh)`,
        UserGroupNameAr: `${roleAr} (نفاذ)`,
        RoleIds: [`nafadh-tpl-${u.roleId || 1}`],
        RoleNamesEn: [`${rawRoleName} (Nafadh)`],
        RoleNamesAr: [`${roleAr} (نفاذ)`],
        IsActive: active,
        IsPrimary: true,
        HasRequesterCapability: false,
        CanRemove: false,
        CanEdit: false,
        CanDeactivate: false,
        IsSelf: false,
      };
    })
    .filter((row) => {
      if (filters.userTypeId != null && filters.userTypeId > 0 && row.UserTypeId !== filters.userTypeId) {
        return false;
      }
      if (filters.userGroupId != null && filters.userGroupId > 0 && row.UserGroupId !== filters.userGroupId) {
        return false;
      }
      if (filters.isActive !== null && row.IsActive !== filters.isActive) {
        return false;
      }
      if (filters.q) {
        const needle = filters.q.toLowerCase();
        const hay = `${row.NameAr} ${row.NameEn} ${row.Email} ${row.PhoneNumber ?? ''} ${row.UserGroupNameAr} ${row.UserGroupNameEn} ${row.OrganizationNameAr}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
}

function buildNafadhRoles(
  snap: NafadhSnapshot,
  filters: {
    templatesOnly: boolean;
    q: string;
    userTypeId: number | null;
    userGroupId: number | null;
    organizationId: number | null;
  },
) {
  let rows: Array<Record<string, any>> = [];

  if (filters.templatesOnly) {
    // قوالب الأدوار من جدول NFD_Roles
    rows = snap.roles.map((r) => {
      const roleAr = translateRoleAr(r.roleName);
      const roleEn = r.roleName || `Role ${r.roleId}`;
      const groupId = NAFADH_GROUP_BASE_ID + r.roleId;

      return {
        Id: `nafadh-tpl-${r.roleId}`,
        Name: `NFD_${toCode(roleEn, String(r.roleId))}`,
        DisplayNameEn: `${roleEn} (Nafadh)`,
        DisplayNameAr: `${roleAr} (نفاذ)`,
        NameEn: `${roleEn} (Nafadh)`,
        NameAr: `${roleAr} (نفاذ)`,
        IsActive: true,
        IsTemplate: true,
        UserTypeId: NAFADH_USER_TYPE_ID,
        UserTypeCode: 'NAFADH',
        UserTypeNameEn: 'Nafadh Platform',
        UserTypeNameAr: 'منصة نفاذ',
        UserGroupId: groupId,
        UserGroupCode: `NFD_${toCode(roleEn, String(r.roleId))}`,
        UserGroupNameEn: `${roleEn} (Nafadh)`,
        UserGroupNameAr: `${roleAr} (نفاذ)`,
        OrganizationId: null,
        OrganizationNameEn: null,
        OrganizationNameAr: null,
        ParentRoleId: null,
        ParentRoleName: null,
        UsersCount: r.usersCount,
        UserCount: r.usersCount,
        AssignedUsersCount: r.usersCount,
        PagesCount: r.permissionsCount,
        PageCount: r.permissionsCount,
        AssignedPagesCount: r.permissionsCount,
        IsLocked: true,
        CanDelete: false,
        CanEdit: false,
      };
    });
  } else {
    // الأدوار المخصصة من الأقسام (NFD_Departments) + مناصب المشرفين (NFD_CompanySupervisors) + الشركات (NFD_Companies)
    const companyRole =
      snap.roles.find((r) => /company|supervisor/i.test(r.roleName)) ?? snap.roles[0];
    const defaultRoleId = companyRole?.roleId ?? 1;
    const defaultRoleEn = companyRole?.roleName ?? 'Company';
    const defaultRoleAr = translateRoleAr(defaultRoleEn);
    const defaultGroupId = NAFADH_GROUP_BASE_ID + defaultRoleId;

    for (const d of snap.departments) {
      const compName = d.companyName || `شركة #${d.companyId}`;
      rows.push({
        Id: `nafadh-dept-${d.departmentId}`,
        Name: `NFD_DEPT_${d.departmentId}`,
        DisplayNameEn: `${d.departmentName} - ${compName} (Nafadh)`,
        DisplayNameAr: `قسم ${d.departmentName} - ${compName} (نفاذ)`,
        NameEn: `${d.departmentName} - ${compName} (Nafadh)`,
        NameAr: `قسم ${d.departmentName} - ${compName} (نفاذ)`,
        IsActive: true,
        IsTemplate: false,
        UserTypeId: NAFADH_USER_TYPE_ID,
        UserTypeCode: 'NAFADH',
        UserTypeNameEn: 'Nafadh Platform',
        UserTypeNameAr: 'منصة نفاذ',
        UserGroupId: defaultGroupId,
        UserGroupCode: `NFD_${toCode(defaultRoleEn, String(defaultRoleId))}`,
        UserGroupNameEn: `${defaultRoleEn} (Nafadh)`,
        UserGroupNameAr: `${defaultRoleAr} (نفاذ)`,
        OrganizationId: NAFADH_ORG_BASE_ID + d.companyId,
        OrganizationNameEn: compName,
        OrganizationNameAr: compName,
        ParentRoleId: `nafadh-tpl-${defaultRoleId}`,
        ParentRoleName: `${defaultRoleAr} (نفاذ)`,
        UsersCount: d.membersCount,
        UserCount: d.membersCount,
        AssignedUsersCount: d.membersCount,
        PagesCount: companyRole?.permissionsCount ?? 0,
        PageCount: companyRole?.permissionsCount ?? 0,
        AssignedPagesCount: companyRole?.permissionsCount ?? 0,
        IsLocked: true,
        CanDelete: false,
        CanEdit: false,
      });
    }

    const seenPositions = new Set<string>();
    for (const s of snap.supervisors) {
      const label = (s.position || s.department || 'مشرف تدريب').trim();
      const dedupKey = `${s.companyId}:${label.toLowerCase()}`;
      if (seenPositions.has(dedupKey)) continue;
      seenPositions.add(dedupKey);

      const compName = s.companyName || `شركة #${s.companyId}`;
      rows.push({
        Id: `nafadh-sup-${s.supervisorId}`,
        Name: `NFD_SUP_${s.supervisorId}`,
        DisplayNameEn: `${label} - ${compName} (Nafadh)`,
        DisplayNameAr: `${label} - ${compName} (نفاذ)`,
        NameEn: `${label} - ${compName} (Nafadh)`,
        NameAr: `${label} - ${compName} (نفاذ)`,
        IsActive: isStatusActive(s.status),
        IsTemplate: false,
        UserTypeId: NAFADH_USER_TYPE_ID,
        UserTypeCode: 'NAFADH',
        UserTypeNameEn: 'Nafadh Platform',
        UserTypeNameAr: 'منصة نفاذ',
        UserGroupId: defaultGroupId,
        UserGroupCode: `NFD_${toCode(defaultRoleEn, String(defaultRoleId))}`,
        UserGroupNameEn: `${defaultRoleEn} (Nafadh)`,
        UserGroupNameAr: `${defaultRoleAr} (نفاذ)`,
        OrganizationId: NAFADH_ORG_BASE_ID + s.companyId,
        OrganizationNameEn: compName,
        OrganizationNameAr: compName,
        ParentRoleId: `nafadh-tpl-${defaultRoleId}`,
        ParentRoleName: `${defaultRoleAr} (نفاذ)`,
        UsersCount: 1,
        UserCount: 1,
        AssignedUsersCount: 1,
        PagesCount: companyRole?.permissionsCount ?? 0,
        PageCount: companyRole?.permissionsCount ?? 0,
        AssignedPagesCount: companyRole?.permissionsCount ?? 0,
        IsLocked: true,
        CanDelete: false,
        CanEdit: false,
      });
    }

    // إضافة أدوار الجهات/الشركات المعتمدة في نفاذ لضمان ظهور جميع جهات نفاذ في الأدوار المخصصة
    for (const c of snap.companies) {
      rows.push({
        Id: `nafadh-comp-role-${c.companyId}`,
        Name: `NFD_COMP_${c.companyId}`,
        DisplayNameEn: `Company Admin - ${c.companyName} (Nafadh)`,
        DisplayNameAr: `مسؤول جهة: ${c.companyName} (نفاذ)`,
        NameEn: `Company Admin - ${c.companyName} (Nafadh)`,
        NameAr: `مسؤول جهة: ${c.companyName} (نفاذ)`,
        IsActive: isStatusActive(c.status),
        IsTemplate: false,
        UserTypeId: NAFADH_USER_TYPE_ID,
        UserTypeCode: 'NAFADH',
        UserTypeNameEn: 'Nafadh Platform',
        UserTypeNameAr: 'منصة نفاذ',
        UserGroupId: defaultGroupId,
        UserGroupCode: `NFD_${toCode(defaultRoleEn, String(defaultRoleId))}`,
        UserGroupNameEn: `${defaultRoleEn} (Nafadh)`,
        UserGroupNameAr: `${defaultRoleAr} (نفاذ)`,
        OrganizationId: NAFADH_ORG_BASE_ID + c.companyId,
        OrganizationNameEn: c.companyName,
        OrganizationNameAr: c.companyName,
        ParentRoleId: `nafadh-tpl-${defaultRoleId}`,
        ParentRoleName: `${defaultRoleAr} (نفاذ)`,
        UsersCount: 1,
        UserCount: 1,
        AssignedUsersCount: 1,
        PagesCount: companyRole?.permissionsCount ?? 0,
        PageCount: companyRole?.permissionsCount ?? 0,
        AssignedPagesCount: companyRole?.permissionsCount ?? 0,
        IsLocked: true,
        CanDelete: false,
        CanEdit: false,
      });
    }
  }

  return rows.filter((row) => {
    if (filters.userTypeId != null && filters.userTypeId > 0 && row['UserTypeId'] !== filters.userTypeId) {
      return false;
    }
    if (filters.userGroupId != null && filters.userGroupId > 0 && row['UserGroupId'] !== filters.userGroupId) {
      return false;
    }
    if (
      filters.organizationId != null &&
      filters.organizationId > 0 &&
      row['OrganizationId'] !== filters.organizationId
    ) {
      return false;
    }
    if (filters.q) {
      const needle = filters.q.toLowerCase();
      const hay = `${row['DisplayNameAr']} ${row['DisplayNameEn']} ${row['Name']} ${row['OrganizationNameAr'] ?? ''} ${row['UserGroupNameAr']}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

function buildNafadhAppPages(snap: NafadhSnapshot) {
  return snap.permissions.map((p, idx) => ({
    Id: 9000 + p.permissionId,
    Code: `NFD_${toCode(p.permissionKey, String(p.permissionId))}`,
    SystemCode: 'NAFADH',
    Url: `/nafadh/${(p.permissionKey || '').toLowerCase()}`,
    NameEn: `${p.permissionKey} (Nafadh)`,
    NameAr: `${p.description || p.permissionKey} (نفاذ)`,
    SortOrder: 900 + idx,
    RequiredActionFlags: 1,
    DefaultDataScope: 1,
    IsActive: true,
  }));
}

function buildNafadhRolePagesDto(snap: NafadhSnapshot, roleOrGroupIdentifier: string) {
  let numericRoleId = 1;
  const tplMatch = roleOrGroupIdentifier.match(/nafadh-tpl-(\d+)/i);
  const grpMatch = roleOrGroupIdentifier.match(/^9(\d{3,})$/);
  if (tplMatch) {
    numericRoleId = Number(tplMatch[1]);
  } else if (grpMatch) {
    numericRoleId = Number(roleOrGroupIdentifier) - NAFADH_GROUP_BASE_ID;
  } else {
    numericRoleId = snap.roles[0]?.roleId ?? 1;
  }

  const role = snap.roles.find((r) => r.roleId === numericRoleId) ?? snap.roles[0];
  const roleEn = role?.roleName ?? 'Nafadh Role';
  const roleAr = translateRoleAr(roleEn);
  const assignedSet = new Set(
    snap.rolePermissions.filter((rp) => rp.roleId === numericRoleId).map((rp) => rp.permissionId),
  );

  const pages = snap.permissions
    .filter((p) => assignedSet.size === 0 || assignedSet.has(p.permissionId))
    .map((p) => ({
      AppPageId: 9000 + p.permissionId,
      PageId: 9000 + p.permissionId,
      Id: 9000 + p.permissionId,
      Code: `NFD_${toCode(p.permissionKey, String(p.permissionId))}`,
      SystemCode: 'NAFADH',
      Url: `/nafadh/${(p.permissionKey || '').toLowerCase()}`,
      NameEn: `${p.permissionKey} (Nafadh)`,
      NameAr: `${p.description || p.permissionKey} (نفاذ)`,
      ActionFlags: 1,
      DataScope: 1,
      IsAssigned: true,
    }));

  return {
    RoleId: roleOrGroupIdentifier,
    RoleName: roleEn,
    DisplayNameEn: `${roleEn} (Nafadh)`,
    DisplayNameAr: `${roleAr} (نفاذ)`,
    IsTemplate: roleOrGroupIdentifier.includes('tpl'),
    IsLocked: true,
    Pages: pages,
    AssignedPages: pages,
  };
}

function buildNafadhOrganizations(snap: NafadhSnapshot, q: string) {
  return snap.companies
    .map((c) => ({
      Id: NAFADH_ORG_BASE_ID + c.companyId,
      Code: c.commercialRegister || `NFD-ORG-${c.companyId}`,
      CrNumber: c.commercialRegister || '',
      NameEn: `${c.companyName} (Nafadh)`,
      NameAr: `${c.companyName} (نفاذ)`,
      IsActive: isStatusActive(c.status),
    }))
    .filter((org) => {
      if (!q) return true;
      const needle = q.toLowerCase();
      return `${org.NameAr} ${org.NameEn} ${org.Code}`.toLowerCase().includes(needle);
    });
}

function extractPagedEnvelope(body: any) {
  let envelopeKey: 'Data' | 'data' | null = null;
  let inner = body;
  if (body && typeof body === 'object') {
    if ('Data' in body && body.Data && typeof body.Data === 'object') {
      envelopeKey = 'Data';
      lastEnvelopeKey = 'Data';
      inner = body.Data;
    } else if ('data' in body && body.data && typeof body.data === 'object') {
      envelopeKey = 'data';
      lastEnvelopeKey = 'data';
      inner = body.data;
    }
  }

  const rowsKey =
    inner && typeof inner === 'object'
      ? 'rows' in inner
        ? 'rows'
        : 'Rows' in inner
          ? 'Rows'
          : 'items' in inner
            ? 'items'
            : 'rows'
      : 'rows';
  const totalKey =
    inner && typeof inner === 'object' && 'Total' in inner && !('total' in inner) ? 'Total' : 'total';
  const pageIndexKey =
    inner && typeof inner === 'object' && 'PageIndex' in inner && !('pageIndex' in inner)
      ? 'PageIndex'
      : 'pageIndex';
  const pageSizeKey =
    inner && typeof inner === 'object' && 'PageSize' in inner && !('pageSize' in inner)
      ? 'PageSize'
      : 'pageSize';

  const rows: any[] = Array.isArray(inner?.[rowsKey]) ? inner[rowsKey] : [];
  const total = typeof inner?.[totalKey] === 'number' ? inner[totalKey] : rows.length;

  return { envelopeKey, inner, rowsKey, totalKey, pageIndexKey, pageSizeKey, rows, total };
}

function resolveZeroBasedPage(requestedPageIndex: number): {
  firstPageParam: number;
  zeroBasedPage: number;
} {
  if (requestedPageIndex === 0) {
    detectedFirstPageIndex = 0;
  } else if (detectedFirstPageIndex === null) {
    detectedFirstPageIndex = requestedPageIndex === 1 ? 1 : 0;
  }
  const base = detectedFirstPageIndex ?? 0;
  return {
    firstPageParam: base,
    zeroBasedPage: Math.max(0, requestedPageIndex - base),
  };
}

export function handleNafadhIdentityMerge(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  nafadhToken: string | null,
): Observable<HttpEvent<unknown>> {
  if (req.method.toUpperCase() !== 'GET') {
    return next(req);
  }

  const cleanPath = req.url.replace(/^https?:\/\/[^/]+/i, '').split('?')[0].replace(/\/+$/, '');

  // 1) صلاحيات دور أو مجموعة تابعة لنفاذ مباشرة دون إرسالها لـ 58888
  const nafadhRolePagesMatch = cleanPath.match(/\/roles\/(nafadh-[^/]+)\/pages$/i);
  const nafadhGroupPagesMatch = cleanPath.match(/\/(?:user-)?groups\/(9\d{3,})\/pages$/i);
  if (nafadhRolePagesMatch || nafadhGroupPagesMatch) {
    const targetId = (nafadhRolePagesMatch?.[1] ?? nafadhGroupPagesMatch?.[1])!;
    return from(fetchNafadhSnapshot(nafadhToken)).pipe(
      map((snap) => {
        const dto = snap
          ? buildNafadhRolePagesDto(snap, targetId)
          : { RoleId: targetId, Pages: [], AssignedPages: [] };
        return new HttpResponse({ status: 200, body: wrapSyntheticBody(dto) });
      }),
    );
  }

  const isUsersList = /\/(?:identity[^/]*|admin)\/users$/i.test(cleanPath);
  const isRolesList =
    /\/(?:identity[^/]*|admin)\/(?:roles|role-templates|custom-roles)$/i.test(cleanPath) ||
    /\/roles\/(?:templates|custom)$/i.test(cleanPath);
  const isGroupsList = /\/(?:identity[^/]*|admin)\/(?:user-)?groups$/i.test(cleanPath);
  const isPagesCatalog = /\/(?:identity[^/]*)\/pages$/i.test(cleanPath);
  const isOrganizationsList = /\/(?:identity[^/]*)\/organizations$/i.test(cleanPath);

  if (!isUsersList && !isRolesList && !isGroupsList && !isPagesCatalog && !isOrganizationsList) {
    return next(req);
  }

  // 2) المجموعات (المجموعات + القوائم المنسدلة للفلترة)
  if (isGroupsList) {
    const includeInactive = req.params.get('includeInactive') === 'true';
    return from(fetchNafadhSnapshot(nafadhToken)).pipe(
      switchMap((snap) =>
        next(req).pipe(
          map((event) => {
            if (!(event instanceof HttpResponse) || !snap) return event;
            const body: any = event.body;
            let envKey: 'Data' | 'data' | null = null;
            let payload = body;
            if (body && typeof body === 'object') {
              if ('Data' in body) {
                envKey = 'Data';
                lastEnvelopeKey = 'Data';
                payload = body.Data;
              } else if ('data' in body) {
                envKey = 'data';
                lastEnvelopeKey = 'data';
                payload = body.data;
              }
            }

            const { userType, groups } = buildNafadhGroups(snap, includeInactive);
            let mergedPayload = payload;

            if (Array.isArray(payload)) {
              const sample = payload[0];
              const isNestedByType =
                !sample || 'Groups' in sample || 'groups' in sample;
              if (isNestedByType) {
                const adaptedType = adaptCase(userType, sample);
                mergedPayload = [
                  ...payload.filter((t: any) => (t?.Id ?? t?.id) !== NAFADH_USER_TYPE_ID),
                  adaptedType,
                ];
              } else {
                const adaptedGroups = groups.map((g) => adaptCase(g, sample));
                mergedPayload = [
                  ...payload.filter((g: any) => Number(g?.Id ?? g?.id ?? 0) < NAFADH_GROUP_BASE_ID),
                  ...adaptedGroups,
                ];
              }
            }

            const newBody = envKey ? { ...body, [envKey]: mergedPayload } : mergedPayload;
            return event.clone({ body: newBody });
          }),
          catchError((err) => {
            if (!snap) throw err;
            const { userType } = buildNafadhGroups(snap, includeInactive);
            return of(new HttpResponse({ status: 200, body: wrapSyntheticBody([userType]) }));
          }),
        ),
      ),
    );
  }

  // 3) كتالوج الصفحات العام (Pages)
  if (isPagesCatalog) {
    return from(fetchNafadhSnapshot(nafadhToken)).pipe(
      switchMap((snap) =>
        next(req).pipe(
          map((event) => {
            if (!(event instanceof HttpResponse) || !snap) return event;
            const body: any = event.body;
            const envKey =
              body && typeof body === 'object'
                ? 'Data' in body
                  ? 'Data'
                  : 'data' in body
                    ? 'data'
                    : null
                : null;
            const list = envKey ? body[envKey] : body;
            if (!Array.isArray(list)) return event;
            const nafadhPages = buildNafadhAppPages(snap).map((p) => adaptCase(p, list[0]));
            const merged = [...list, ...nafadhPages];
            return event.clone({ body: envKey ? { ...body, [envKey]: merged } : merged });
          }),
        ),
      ),
    );
  }

  // 4) القوائم المرقمة: المستخدمون / قوالب الأدوار / الأدوار المخصصة / الجهات
  const requestedPageIndex = Number(req.params.get('pageIndex') ?? 0);
  const requestedPageSize = Number(req.params.get('pageSize') ?? 5) || 5;
  const q = (req.params.get('q') ?? '').trim();
  const userTypeId = req.params.has('userTypeId') ? Number(req.params.get('userTypeId')) : null;
  const userGroupId = req.params.has('userGroupId') ? Number(req.params.get('userGroupId')) : null;
  const organizationId = req.params.has('organizationId')
    ? Number(req.params.get('organizationId'))
    : null;
  const isActiveParam = req.params.get('isActive');
  const isActive =
    isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : null;

  const { firstPageParam, zeroBasedPage } = resolveZeroBasedPage(requestedPageIndex);

  const isExclusivelyNafadhFilter =
    userTypeId === NAFADH_USER_TYPE_ID ||
    (userGroupId !== null && userGroupId >= NAFADH_GROUP_BASE_ID) ||
    (organizationId !== null && organizationId >= NAFADH_ORG_BASE_ID);

  return from(fetchNafadhSnapshot(nafadhToken)).pipe(
    switchMap((snap) => {
      const computeNafadhList = (sampleRow?: any): any[] => {
        if (!snap) return [];
        if (isUsersList) {
          return buildNafadhUsers(snap, { q, userTypeId, userGroupId, isActive }).map((r) =>
            adaptCase(r, sampleRow),
          );
        }
        if (isOrganizationsList) {
          return buildNafadhOrganizations(snap, q).map((r) => adaptCase(r, sampleRow));
        }
        // قوالب الأدوار مقابل الأدوار المخصصة
        let templatesOnly = false;
        if (req.params.has('templatesOnly')) {
          templatesOnly = req.params.get('templatesOnly') === 'true';
        } else if (req.params.has('isTemplate')) {
          templatesOnly = req.params.get('isTemplate') === 'true';
        } else if (/template/i.test(cleanPath)) {
          templatesOnly = true;
        } else if (sampleRow && ('IsTemplate' in sampleRow || 'isTemplate' in sampleRow)) {
          templatesOnly = Boolean(sampleRow.IsTemplate ?? sampleRow.isTemplate);
        }

        return buildNafadhRoles(snap, {
          templatesOnly,
          q,
          userTypeId,
          userGroupId,
          organizationId,
        }).map((r) => adaptCase(r, sampleRow));
      };

      // إذا اختار المستخدم فلتر خاص بـ "منصة نفاذ" فقط، نرجع بيانات نفاذ فوراً دون إزعاج 58888
      if (isExclusivelyNafadhFilter) {
        const nafadhOnly = computeNafadhList();
        const start = zeroBasedPage * requestedPageSize;
        const slice = nafadhOnly.slice(start, start + requestedPageSize);
        const pagePayload = {
          rows: slice,
          total: nafadhOnly.length,
          pageIndex: requestedPageIndex,
          pageSize: requestedPageSize,
        };
        return of(new HttpResponse({ status: 200, body: wrapSyntheticBody(pagePayload) }));
      }

      // جلب حتى 100 سجل من Bidding_API لدمج وترتيب الصفوف من الداتابيس الاثنين بدقة عبر كل الصفحات
      const expandedReq = req.clone({
        params: req.params
          .set('pageIndex', String(firstPageParam))
          .set('pageSize', '100'),
      });

      return next(expandedReq).pipe(
        map((event) => {
          if (!(event instanceof HttpResponse)) return event;
          const {
            envelopeKey,
            inner,
            rowsKey,
            totalKey,
            pageIndexKey,
            pageSizeKey,
            rows: biddingRows,
            total: biddingTotal,
          } = extractPagedEnvelope(event.body);

          const nafadhRows = computeNafadhList(biddingRows[0]);
          const combined = interleave(biddingRows, nafadhRows);
          const mergedTotal = Math.max(combined.length, biddingTotal + nafadhRows.length);

          const start = zeroBasedPage * requestedPageSize;
          const pagedSlice = combined.slice(start, start + requestedPageSize);

          const updatedInner = {
            ...(inner && typeof inner === 'object' ? inner : {}),
            [rowsKey]: pagedSlice,
            [totalKey]: mergedTotal,
            [pageIndexKey]: requestedPageIndex,
            [pageSizeKey]: requestedPageSize,
          };

          const updatedBody = envelopeKey
            ? { ...(event.body as Record<string, any>), [envelopeKey]: updatedInner }
            : updatedInner;

          return event.clone({ body: updatedBody });
        }),
        catchError((err) => {
          if (!snap) throw err;
          const fallbackRows = computeNafadhList();
          const start = zeroBasedPage * requestedPageSize;
          const pagePayload = {
            rows: fallbackRows.slice(start, start + requestedPageSize),
            total: fallbackRows.length,
            pageIndex: requestedPageIndex,
            pageSize: requestedPageSize,
          };
          return of(new HttpResponse({ status: 200, body: wrapSyntheticBody(pagePayload) }));
        }),
      );
    }),
  );
}