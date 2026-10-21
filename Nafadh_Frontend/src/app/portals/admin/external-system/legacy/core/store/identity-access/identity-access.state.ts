import type {
  IdentityAccessRolePagesDto,
  IdentityAccessRoleRowDto,
  IdentityAccessUserRowDto,
  IdentityAccessUserTypeDto,
} from '../../api/models/identity-access.models';
import type { PagedListPageSlice } from '../../api/models/paged-list.models';

export interface IdentityAccessState {
  usersPage: PagedListPageSlice<IdentityAccessUserRowDto> | null;
  rolesPage: PagedListPageSlice<IdentityAccessRoleRowDto> | null;
  templateRolesPage: PagedListPageSlice<IdentityAccessRoleRowDto> | null;
  groups: IdentityAccessUserTypeDto[] | null;
  rolePages: IdentityAccessRolePagesDto | null;
  lastSyncedAt: string | null;
}

export const identityAccessInitialState: IdentityAccessState = {
  usersPage: null,
  rolesPage: null,
  templateRolesPage: null,
  groups: null,
  rolePages: null,
  lastSyncedAt: null,
};
