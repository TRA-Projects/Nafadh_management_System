import { createActionGroup, emptyProps, props } from '@ngrx/store';

import type {
  NotificationTemplateDto,
  NotificationTemplateListItemDto,
  NotificationTransactionLogRowDto,
  SkillCategoryDto,
  SkillDto,
  SystemAuditTrailRowDto,
  SystemAuditValueHistoryRowDto,
  SystemConfigValueDto,
  SystemVariableDto,
} from '../../api/models/admin-system.models';
import type { PagedListResponse } from '../../api/models/paged-list.models';

export const adminSystemActions = createActionGroup({
  source: 'Admin System',
  events: {
    'Cache System Variables': props<{ rows: SystemVariableDto[] }>(),
    'Cache System Variables Page': props<{ page: PagedListResponse<SystemVariableDto> }>(),
    'Cache Config Values': props<{ code: string; rows: SystemConfigValueDto[]; total: number; pageIndex: number; pageSize: number }>(),
    'Cache Skill Categories': props<{ rows: SkillCategoryDto[] }>(),
    'Cache Skill Categories Page': props<{ page: PagedListResponse<SkillCategoryDto> }>(),
    'Cache Skills': props<{ rows: SkillDto[] }>(),
    'Cache Skills Page': props<{ page: PagedListResponse<SkillDto> }>(),
    'Cache Basic Skills': props<{ rows: SkillDto[] }>(),
    'Cache Tech Stacks': props<{ rows: SkillDto[] }>(),
    'System Variable Updated': props<{ row: SystemVariableDto }>(),
    'Config Value Upserted': props<{ code: string; row: SystemConfigValueDto }>(),
    'Skill Category Upserted': props<{ row: SkillCategoryDto }>(),
    'Skill Upserted': props<{ row: SkillDto }>(),
    'Cache Notification Templates Page': props<{ page: PagedListResponse<NotificationTemplateListItemDto> }>(),
    'Notification Template Upserted': props<{ row: NotificationTemplateDto }>(),
    'Cache Audit Trail Page': props<{ page: PagedListResponse<SystemAuditTrailRowDto> }>(),
    'Cache Audit Value History Page': props<{ page: PagedListResponse<SystemAuditValueHistoryRowDto> }>(),
    'Cache Notification Transactions Page': props<{ page: PagedListResponse<NotificationTransactionLogRowDto> }>(),
    'Clear Cache': emptyProps(),
  },
});
