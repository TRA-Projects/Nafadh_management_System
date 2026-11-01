import type {
  NotificationTemplateListItemDto,
  NotificationTransactionLogRowDto,
  SkillCategoryDto,
  SkillDto,
  SystemAuditTrailRowDto,
  SystemAuditValueHistoryRowDto,
  SystemConfigValueDto,
  SystemVariableDto,
} from '../../api/models/admin-system.models';
import type { PagedListPageSlice } from '../../api/models/paged-list.models';

export interface AdminSystemConfigValueCache extends PagedListPageSlice<SystemConfigValueDto> {}

export interface AdminSystemState {
  /** Cached GET `/api/jobseekers/admin/system-variables` (legacy full list). */
  systemVariables: SystemVariableDto[] | null;
  systemVariablesPage: PagedListPageSlice<SystemVariableDto> | null;
  /** Cached GET `/api/jobseekers/admin/system-config/values/:code`, keyed by lookup group code. */
  configValuesByCode: Record<string, AdminSystemConfigValueCache | undefined>;
  skillCategories: SkillCategoryDto[] | null;
  skillCategoriesPage: PagedListPageSlice<SkillCategoryDto> | null;
  /** Professional skills lookup rows (merged catalog, kind = Professional). */
  skills: SkillDto[] | null;
  /** Last merged taxonomy page (any kind filter) — taxonomy manage page only. */
  skillsPage: PagedListPageSlice<SkillDto> | null;
  /** Basic (soft) skills lookup rows (merged catalog, kind = Basic). */
  basicSkills: SkillDto[] | null;
  /** Tech stack lookup rows (merged catalog, kind = TechStack). */
  techStacks: SkillDto[] | null;
  notificationTemplatesPage: PagedListPageSlice<NotificationTemplateListItemDto> | null;
  auditTrailPage: PagedListPageSlice<SystemAuditTrailRowDto> | null;
  auditValueHistoryPage: PagedListPageSlice<SystemAuditValueHistoryRowDto> | null;
  notificationTransactionsPage: PagedListPageSlice<NotificationTransactionLogRowDto> | null;
  lastSyncedAt: string | null;
}

export const adminSystemInitialState: AdminSystemState = {
  systemVariables: null,
  systemVariablesPage: null,
  configValuesByCode: {},
  skillCategories: null,
  skillCategoriesPage: null,
  skills: null,
  skillsPage: null,
  basicSkills: null,
  techStacks: null,
  notificationTemplatesPage: null,
  auditTrailPage: null,
  auditValueHistoryPage: null,
  notificationTransactionsPage: null,
  lastSyncedAt: null,
};
