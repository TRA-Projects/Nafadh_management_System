import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { map, tap } from 'rxjs/operators';

import { unwrapData, type ApiData } from '../../profile/jobseeker-profile-api';
import { identityAccessActions } from '../../store/identity-access/identity-access.actions';
import { ApiPaths } from '../api-paths';
import type {
  ChangeUserGroupRequestDto,
  CreateAdminUserRequestDto,
  CreateCustomRoleRequestDto,
  IdentityAccessAppPageDto,
  IdentityAccessOrganizationsPage,
  IdentityAccessRolePagesDto,
  IdentityAccessRoleRowDto,
  IdentityAccessRolesPage,
  IdentityAccessUserGroupDto,
  IdentityAccessUserRowDto,
  IdentityAccessUserTypeDto,
  IdentityAccessUsersPage,
  UpdateAdminUserRequestDto,
  UpdateRolePagesRequestDto,
  UpsertUserGroupRequestDto,
} from '../models/identity-access.models';

@Injectable({ providedIn: 'root' })
export class IdentityAccessApiService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(Store);

  getUsersPage(params: {
    pageIndex: number;
    pageSize: number;
    q?: string;
    userTypeId?: number | null;
    userGroupId?: number | null;
    isActive?: boolean | null;
  }) {
    let httpParams = new HttpParams()
      .set('pageIndex', String(params.pageIndex))
      .set('pageSize', String(params.pageSize));

    const q = (params.q ?? '').trim();
    if (q) {
      httpParams = httpParams.set('q', q);
    }
    if (params.userTypeId != null && params.userTypeId > 0) {
      httpParams = httpParams.set('userTypeId', String(params.userTypeId));
    }
    if (params.userGroupId != null && params.userGroupId > 0) {
      httpParams = httpParams.set('userGroupId', String(params.userGroupId));
    }
    if (params.isActive === true || params.isActive === false) {
      httpParams = httpParams.set('isActive', String(params.isActive));
    }

    return this.http
      .get<ApiData<IdentityAccessUsersPage>>(ApiPaths.adminIdentityUsers, { params: httpParams })
      .pipe(
        map(unwrapData),
        tap((page) => this.store.dispatch(identityAccessActions.cacheUsersPage({ page })))
      );
  }

  changeUserGroup(userId: string, body: ChangeUserGroupRequestDto) {
    return this.http
      .put<ApiData<IdentityAccessUserRowDto>>(ApiPaths.adminIdentityUserGroup(userId), body)
      .pipe(
        map(unwrapData),
        tap((row) => this.store.dispatch(identityAccessActions.userGroupChanged({ row })))
      );
  }

  updateAdminUser(userId: string, body: UpdateAdminUserRequestDto) {
    return this.http
      .put<ApiData<IdentityAccessUserRowDto>>(ApiPaths.adminIdentityUser(userId), body)
      .pipe(
        map(unwrapData),
        tap((row) => this.store.dispatch(identityAccessActions.userGroupChanged({ row })))
      );
  }

  createAdminUser(body: CreateAdminUserRequestDto) {
    return this.http
      .post<ApiData<IdentityAccessUserRowDto>>(ApiPaths.adminIdentityUsers, body)
      .pipe(
        map(unwrapData),
        tap((row) => this.store.dispatch(identityAccessActions.userGroupChanged({ row })))
      );
  }

  addAccount(userId: string, body: ChangeUserGroupRequestDto) {
    return this.http
      .post<ApiData<IdentityAccessUserRowDto>>(ApiPaths.adminIdentityUserAccounts(userId), body)
      .pipe(
        map(unwrapData),
        tap((row) => this.store.dispatch(identityAccessActions.userGroupChanged({ row })))
      );
  }

  removeAccount(userId: string) {
    return this.http
      .delete<ApiData<boolean>>(ApiPaths.adminIdentityUser(userId))
      .pipe(map(unwrapData));
  }

  getGroups(includeInactive = false) {
    return this.http
      .get<ApiData<IdentityAccessUserTypeDto[]>>(ApiPaths.adminIdentityGroups, {
        params: new HttpParams().set('includeInactive', String(includeInactive)),
      })
      .pipe(
        map(unwrapData),
        tap((groups) => this.store.dispatch(identityAccessActions.cacheGroups({ groups: groups ?? [] })))
      );
  }

  createGroup(body: UpsertUserGroupRequestDto) {
    return this.http
      .post<ApiData<IdentityAccessUserGroupDto>>(ApiPaths.adminIdentityGroups, body)
      .pipe(map(unwrapData));
  }

  updateGroup(id: number, body: UpsertUserGroupRequestDto) {
    return this.http
      .put<ApiData<IdentityAccessUserGroupDto>>(ApiPaths.adminIdentityGroup(id), body)
      .pipe(map(unwrapData));
  }

  deactivateGroup(id: number) {
    return this.http.delete<ApiData<boolean>>(ApiPaths.adminIdentityGroup(id)).pipe(map(unwrapData));
  }

  getOrganizationsPage(params: { pageIndex: number; pageSize: number; q?: string }) {
    let httpParams = new HttpParams()
      .set('pageIndex', String(params.pageIndex))
      .set('pageSize', String(params.pageSize));
    const q = (params.q ?? '').trim();
    if (q) {
      httpParams = httpParams.set('q', q);
    }
    return this.http
      .get<ApiData<IdentityAccessOrganizationsPage>>(ApiPaths.adminIdentityOrganizations, {
        params: httpParams,
      })
      .pipe(map(unwrapData));
  }

  getPages() {
    return this.http.get<ApiData<IdentityAccessAppPageDto[]>>(ApiPaths.adminIdentityPages).pipe(map(unwrapData));
  }

  updatePageRequirements(pageId: number, body: { RequiredActionFlags: number; DefaultDataScope: string }) {
    return this.http
      .put<ApiData<IdentityAccessAppPageDto>>(ApiPaths.adminIdentityPageRequirements(pageId), body)
      .pipe(map(unwrapData));
  }

  createRole(body: CreateCustomRoleRequestDto) {
    return this.http
      .post<ApiData<IdentityAccessRoleRowDto>>(ApiPaths.adminIdentityRoles, body)
      .pipe(map(unwrapData));
  }

  deleteRole(roleId: string) {
    return this.http.delete<ApiData<boolean>>(ApiPaths.adminIdentityRole(roleId)).pipe(map(unwrapData));
  }

  getRolesPage(params: {
    pageIndex: number;
    pageSize: number;
    q?: string;
    userTypeId?: number | null;
    userGroupId?: number | null;
    templatesOnly?: boolean | null;
    cache?: boolean;
  }) {
    let httpParams = new HttpParams()
      .set('pageIndex', String(params.pageIndex))
      .set('pageSize', String(params.pageSize));

    const q = (params.q ?? '').trim();
    if (q) {
      httpParams = httpParams.set('q', q);
    }
    if (params.userTypeId != null && params.userTypeId > 0) {
      httpParams = httpParams.set('userTypeId', String(params.userTypeId));
    }
    if (params.userGroupId != null && params.userGroupId > 0) {
      httpParams = httpParams.set('userGroupId', String(params.userGroupId));
    }
    if (params.templatesOnly === true || params.templatesOnly === false) {
      httpParams = httpParams.set('templatesOnly', String(params.templatesOnly));
    }

    return this.http
      .get<ApiData<IdentityAccessRolesPage>>(ApiPaths.adminIdentityRoles, { params: httpParams })
      .pipe(
        map(unwrapData),
        tap((page) => {
          if (params.cache === false) {
            return;
          }
          if (params.templatesOnly === true) {
            this.store.dispatch(identityAccessActions.cacheTemplateRolesPage({ page }));
          } else {
            this.store.dispatch(identityAccessActions.cacheRolesPage({ page }));
          }
        })
      );
  }

  getRolePages(roleId: string) {
    return this.http
      .get<ApiData<IdentityAccessRolePagesDto>>(ApiPaths.adminIdentityRolePages(roleId))
      .pipe(
        map(unwrapData),
        tap((rolePages) => this.store.dispatch(identityAccessActions.cacheRolePages({ rolePages })))
      );
  }

  updateRolePages(roleId: string, body: UpdateRolePagesRequestDto) {
    return this.http
      .put<ApiData<IdentityAccessRolePagesDto>>(ApiPaths.adminIdentityRolePages(roleId), body)
      .pipe(
        map(unwrapData),
        tap((rolePages) => this.store.dispatch(identityAccessActions.cacheRolePages({ rolePages })))
      );
  }
}
