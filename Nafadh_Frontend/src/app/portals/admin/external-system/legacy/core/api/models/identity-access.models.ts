import type { PagedListResponse } from './paged-list.models';

export const PAGE_ACTION_FLAGS = {
  View: 1,
  Create: 2,
  Update: 4,
  Approve: 8,
  Award: 16,
} as const;

export const PAGE_DATA_SCOPES = ['mine', 'organization', 'department', 'assigned', 'everything'] as const;
export type PageDataScope = (typeof PAGE_DATA_SCOPES)[number];

export interface IdentityAccessUserRowDto {
  Id: string;
  ProfileId: number | null;
  NameEn: string;
  NameAr: string;
  Email: string;
  UserTypeId: number | null;
  UserTypeCode: string | null;
  UserTypeNameEn: string | null;
  UserTypeNameAr: string | null;
  UserGroupId: number | null;
  UserGroupCode: string | null;
  UserGroupNameEn: string | null;
  UserGroupNameAr: string | null;
  IsActive: boolean;
  IsPrimary: boolean;
  HasRequesterCapability: boolean;
  CanRemove: boolean;
  IsSelf: boolean;
}

export interface IdentityAccessAccountRowDto {
  Id: string;
  UserGroupId: number | null;
  UserGroupCode: string | null;
  UserGroupNameEn: string | null;
  UserGroupNameAr: string | null;
  UserTypeCode: string | null;
  UserTypeNameEn: string | null;
  UserTypeNameAr: string | null;
  IsPrimary: boolean;
  IsCurrent: boolean;
}

export interface IdentityAccessUserGroupDto {
  Id: number;
  UserTypeId: number;
  Code: string;
  NameEn: string;
  NameAr: string;
  SortOrder: number;
  IsActive?: boolean;
  IsProtected?: boolean;
  CanDeactivate?: boolean;
  TemplateRoleId?: string | null;
  TemplateRoleName?: string | null;
  TemplateRoleNameEn?: string | null;
  TemplateRoleNameAr?: string | null;
}

export interface IdentityAccessUserTypeDto {
  Id: number;
  Code: string;
  NameEn: string;
  NameAr: string;
  SortOrder: number;
  HasRequesterCapability: boolean;
  Groups: IdentityAccessUserGroupDto[];
}

export interface IdentityAccessRoleRowDto {
  Id: string;
  Name: string;
  DisplayNameEn?: string | null;
  DisplayNameAr?: string | null;
  UserTypeId: number | null;
  UserTypeCode: string | null;
  UserTypeNameEn: string | null;
  UserTypeNameAr: string | null;
  UserGroupId: number | null;
  UserGroupCode: string | null;
  UserGroupNameEn: string | null;
  UserGroupNameAr: string | null;
  IsTemplate: boolean;
  IsLocked?: boolean;
  CanDelete?: boolean;
  OrganizationId?: number | null;
  OrganizationNameEn?: string | null;
  OrganizationNameAr?: string | null;
  ParentRoleId?: string | null;
}

export interface IdentityAccessAppPageDto {
  Id: number;
  Code: string;
  SystemCode: string;
  Url: string;
  NameEn: string;
  NameAr: string;
  SortOrder: number;
  RequiredActionFlags?: number;
  DefaultDataScope?: string;
}

export interface IdentityAccessPageGrantDto {
  AppPageId: number;
  ActionFlags: number;
  DataScope: string;
}

export interface IdentityAccessRolePagesDto {
  RoleId: string;
  RoleName: string;
  RoleNameEn?: string | null;
  RoleNameAr?: string | null;
  IsLocked?: boolean;
  Pages: IdentityAccessAppPageDto[];
  SelectedPageIds: number[];
  Grants?: IdentityAccessPageGrantDto[];
}

export interface ChangeUserGroupRequestDto {
  UserGroupId: number;
}

export interface CreateAdminUserRequestDto {
  Name: string;
  Email: string;
  Password: string;
  UserGroupId: number;
}

export interface UpdateAdminUserRequestDto {
  Name: string;
  Email: string;
  IsActive: boolean;
}

export interface UpdateRolePagesRequestDto {
  PageIds: number[];
  Grants?: IdentityAccessPageGrantDto[];
}

export interface UpsertUserGroupRequestDto {
  UserTypeId: number;
  Code?: string;
  NameEn: string;
  NameAr: string;
  SortOrder: number;
  IsActive: boolean;
}

export interface CreateCustomRoleRequestDto {
  Name: string;
  ParentRoleId: string;
  /** Optional; API defaults to the caller's organization when omitted. */
  OrganizationId?: number | null;
}

export interface IdentityAccessOrganizationRowDto {
  Id: number;
  NameEn: string | null;
  NameAr: string | null;
  CrNumber: string | null;
}

export interface IdentityAccessPermissionDto {
  Bypass: boolean;
  Pages: IdentityAccessPageGrantViewDto[];
}

export interface IdentityAccessPageGrantViewDto {
  AppPageId: number;
  Code: string;
  Url: string;
  ActionFlags: number;
  DataScope: string;
}

export type IdentityAccessUsersPage = PagedListResponse<IdentityAccessUserRowDto>;
export type IdentityAccessRolesPage = PagedListResponse<IdentityAccessRoleRowDto>;
export type IdentityAccessOrganizationsPage = PagedListResponse<IdentityAccessOrganizationRowDto>;
