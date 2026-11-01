import { createFeature, createReducer, on } from '@ngrx/store';

import { identityAccessActions } from './identity-access.actions';
import { identityAccessInitialState } from './identity-access.state';

function nowIso(): string {
  return new Date().toISOString();
}

export const identityAccessFeature = createFeature({
  name: 'identityAccess',
  reducer: createReducer(
    identityAccessInitialState,
    on(identityAccessActions.cacheUsersPage, (state, { page }) => ({
      ...state,
      usersPage: page,
      lastSyncedAt: nowIso(),
    })),
    on(identityAccessActions.userGroupChanged, (state, { row }) => {
      const cached = state.usersPage;
      if (!cached) {
        return { ...state, lastSyncedAt: nowIso() };
      }
      return {
        ...state,
        usersPage: {
          ...cached,
          rows: (cached.rows ?? []).map((item) => (item.Id === row.Id ? row : item)),
        },
        lastSyncedAt: nowIso(),
      };
    }),
    on(identityAccessActions.cacheGroups, (state, { groups }) => ({
      ...state,
      groups,
      lastSyncedAt: nowIso(),
    })),
    on(identityAccessActions.cacheRolesPage, (state, { page }) => ({
      ...state,
      rolesPage: page,
      lastSyncedAt: nowIso(),
    })),
    on(identityAccessActions.cacheTemplateRolesPage, (state, { page }) => ({
      ...state,
      templateRolesPage: page,
      lastSyncedAt: nowIso(),
    })),
    on(identityAccessActions.cacheRolePages, (state, { rolePages }) => ({
      ...state,
      rolePages,
      lastSyncedAt: nowIso(),
    })),
    on(identityAccessActions.clearCache, () => ({ ...identityAccessInitialState }))
  ),
});
