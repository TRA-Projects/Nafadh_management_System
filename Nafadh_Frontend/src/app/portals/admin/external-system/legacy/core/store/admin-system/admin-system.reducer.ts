import { createFeature, createReducer, on } from '@ngrx/store';

import { SkillKind } from '../../api/models/admin-system.models';
import type { NotificationTemplateListItemDto } from '../../api/models/admin-system.models';
import { adminSystemActions } from './admin-system.actions';
import { adminSystemInitialState } from './admin-system.state';

function nowIso(): string {
  return new Date().toISOString();
}

export const adminSystemFeature = createFeature({
  name: 'adminSystem',
  reducer: createReducer(
    adminSystemInitialState,
    on(adminSystemActions.cacheSystemVariables, (state, { rows }) => ({
      ...state,
      systemVariables: rows,
      lastSyncedAt: nowIso(),
    })),
    on(adminSystemActions.cacheSystemVariablesPage, (state, { page }) => ({
      ...state,
      systemVariablesPage: page,
      systemVariables: page.rows,
      lastSyncedAt: nowIso(),
    })),
    on(adminSystemActions.cacheConfigValues, (state, { code, rows, total, pageIndex, pageSize }) => ({
      ...state,
      configValuesByCode: {
        ...state.configValuesByCode,
        [code]: { rows, total, pageIndex, pageSize },
      },
      lastSyncedAt: nowIso(),
    })),
    on(adminSystemActions.cacheSkillCategories, (state, { rows }) => ({
      ...state,
      skillCategories: rows,
      lastSyncedAt: nowIso(),
    })),
    on(adminSystemActions.cacheSkillCategoriesPage, (state, { page }) => ({
      ...state,
      skillCategoriesPage: page,
      skillCategories: page.rows,
      lastSyncedAt: nowIso(),
    })),
    on(adminSystemActions.cacheSkills, (state, { rows }) => ({
      ...state,
      skills: rows,
      lastSyncedAt: nowIso(),
    })),
    // Taxonomy page cache only — rows may mix kinds, so the `skills` lookup cache
    // (professional-only) is populated exclusively by `cacheSkills`.
    on(adminSystemActions.cacheSkillsPage, (state, { page }) => ({
      ...state,
      skillsPage: page,
      lastSyncedAt: nowIso(),
    })),
    on(adminSystemActions.cacheBasicSkills, (state, { rows }) => ({
      ...state,
      basicSkills: rows,
      lastSyncedAt: nowIso(),
    })),
    on(adminSystemActions.cacheTechStacks, (state, { rows }) => ({
      ...state,
      techStacks: rows,
      lastSyncedAt: nowIso(),
    })),
    on(adminSystemActions.cacheNotificationTemplatesPage, (state, { page }) => ({
      ...state,
      notificationTemplatesPage: page,
      lastSyncedAt: nowIso(),
    })),
    on(adminSystemActions.cacheAuditTrailPage, (state, { page }) => ({
      ...state,
      auditTrailPage: page,
      lastSyncedAt: nowIso(),
    })),
    on(adminSystemActions.cacheAuditValueHistoryPage, (state, { page }) => ({
      ...state,
      auditValueHistoryPage: page,
      lastSyncedAt: nowIso(),
    })),
    on(adminSystemActions.cacheNotificationTransactionsPage, (state, { page }) => ({
      ...state,
      notificationTransactionsPage: page,
      lastSyncedAt: nowIso(),
    })),
    on(adminSystemActions.notificationTemplateUpserted, (state, { row }) => {
      const cached = state.notificationTemplatesPage;
      if (!cached) {
        return { ...state, lastSyncedAt: nowIso() };
      }
      const prev = cached.rows ?? [];
      const listItem: NotificationTemplateListItemDto = {
        Id: row.Id,
        ActionCode: row.ActionCode,
        LabelEn: row.LabelEn,
        LabelAr: row.LabelAr,
        IsActive: row.IsActive,
        EmailEnabled: row.EmailEnabled,
        SmsEnabled: row.SmsEnabled,
        SortOrder: row.SortOrder,
      };
      const next = prev.some((t) => t.ActionCode === row.ActionCode)
        ? prev.map((t) => (t.ActionCode === row.ActionCode ? listItem : t))
        : [...prev, listItem];
      return {
        ...state,
        notificationTemplatesPage: { ...cached, rows: next },
        lastSyncedAt: nowIso(),
      };
    }),
    on(adminSystemActions.systemVariableUpdated, (state, { row }) => {
      const prev = state.systemVariables ?? [];
      const next = prev.some((v) => v.VariableKey === row.VariableKey)
        ? prev.map((v) => (v.VariableKey === row.VariableKey ? row : v))
        : [...prev, row];
      return { ...state, systemVariables: next, lastSyncedAt: nowIso() };
    }),
    on(adminSystemActions.configValueUpserted, (state, { code, row }) => {
      const cached = state.configValuesByCode[code];
      if (!cached) {
        return state;
      }
      const prev = cached.rows ?? [];
      const next = prev.some((v) => String(v.id) === String(row.id))
        ? prev.map((v) => (String(v.id) === String(row.id) ? row : v))
        : [...prev, row];
      return {
        ...state,
        configValuesByCode: {
          ...state.configValuesByCode,
          [code]: {
            ...cached,
            rows: next,
            total: Math.max(cached.total, next.length),
          },
        },
        lastSyncedAt: nowIso(),
      };
    }),
    on(adminSystemActions.skillCategoryUpserted, (state, { row }) => {
      const prev = state.skillCategories ?? [];
      const next = prev.some((c) => c.Id === row.Id) ? prev.map((c) => (c.Id === row.Id ? row : c)) : [...prev, row];
      return { ...state, skillCategories: next, lastSyncedAt: nowIso() };
    }),
    on(adminSystemActions.skillUpserted, (state, { row }) => {
      const upsert = (rows: typeof state.skills) => {
        const prev = rows ?? [];
        return prev.some((s) => s.Id === row.Id) ? prev.map((s) => (s.Id === row.Id ? row : s)) : [...prev, row];
      };
      return {
        ...state,
        skills: row.Kind === SkillKind.Professional ? upsert(state.skills) : state.skills,
        basicSkills: row.Kind === SkillKind.Personal ? upsert(state.basicSkills) : state.basicSkills,
        techStacks: row.Kind === SkillKind.TechStack ? upsert(state.techStacks) : state.techStacks,
        lastSyncedAt: nowIso(),
      };
    }),
    on(adminSystemActions.clearCache, () => ({ ...adminSystemInitialState }))
  ),
});
