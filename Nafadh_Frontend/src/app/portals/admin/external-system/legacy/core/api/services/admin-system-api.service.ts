import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { ApiPaths } from '../api-paths';
import { unwrapData, type ApiData } from '../../profile/jobseeker-profile-api';
import { adminSystemActions } from '../../store/admin-system/admin-system.actions';
import type { PagedListResponse, PagedQueryParams } from '../models/paged-list.models';
import type {
  CreateSystemConfigValueDto,
  NotificationPlaceholderDto,
  NotificationTemplateDto,
  NotificationTemplateListItemDto,
  NotificationTemplatePlaceholdersDto,
  RenderedNotificationDto,
  SkillCategoryDto,
  SkillDto,
  SystemConfigValueDto,
  SystemVariableDto,
  NotificationTransactionLogQuery,
  NotificationTransactionLogRowDto,
  SystemAuditTrailQuery,
  SystemAuditTrailRowDto,
  SystemAuditValueHistoryQuery,
  SystemAuditValueHistoryRowDto,
  TechStackDto,
  UpdateNotificationTemplateDto,
  UpdateSystemConfigValueDto,
} from '../models/admin-system.models';
import { SkillKind } from '../models/admin-system.models';
export type {
  CreateSystemConfigValueDto,
  NotificationPlaceholderDto,
  NotificationTemplateDto,
  NotificationTemplateListItemDto,
  NotificationTemplatePlaceholdersDto,
  RenderedNotificationDto,
  SkillCategoryDto,
  SkillDto,
  SystemVariableDto,
  SystemConfigValueDto,
  SystemAuditTrailRowDto,
  SystemAuditValueHistoryRowDto,
  NotificationTransactionLogQuery,
  NotificationTransactionLogRowDto,
  TechStackDto,
  UpdateNotificationTemplateDto,
  UpdateSystemConfigValueDto,
} from '../models/admin-system.models';
export { SkillKind } from '../models/admin-system.models';
export type { PagedListResponse, PagedQueryParams } from '../models/paged-list.models';

@Injectable({ providedIn: 'root' })
export class AdminSystemApiService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(Store);

  getSystemVariablesPage(params: PagedQueryParams & { q?: string }) {
    let hp = this.pageParams(params);
    if (params.q?.trim()) {
      hp = hp.set('q', params.q.trim());
    }
    return this.http
      .get<ApiData<PagedListResponse<SystemVariableDto>> | { Data: PagedListResponse<SystemVariableDto> }>(
        ApiPaths.adminSystemVariables,
        { params: hp }
      )
      .pipe(
        map(unwrapData),
        tap((page) => this.store.dispatch(adminSystemActions.cacheSystemVariablesPage({ page })))
      );
  }

  getSystemVariables() {
    return this.http
      .get<ApiData<PagedListResponse<SystemVariableDto>> | { Data: PagedListResponse<SystemVariableDto> }>(
        ApiPaths.adminSystemVariables
      )
      .pipe(map(unwrapData), map((page) => page.rows));
  }

  updateSystemVariable(variableKey: string, value: string | number | boolean) {
    return this.http
      .put<ApiData<SystemVariableDto> | { Data: SystemVariableDto }>(ApiPaths.adminSystemVariable(variableKey), {
        Value: value,
      })
      .pipe(
        map(unwrapData),
        tap((row) => this.store.dispatch(adminSystemActions.systemVariableUpdated({ row })))
      );
  }

  /** Active rows only, unless `includeInactive` (constants admin lists). */
  getValues(code: string, includeInactive = false) {
    return this.fetchConfigValuesPage(code, 0, 0, null, includeInactive).pipe(map((page) => page.rows));
  }

  getConfig(code: string) {
    return this.getValues(code);
  }

  searchConfigValues(code: string, query: string) {
    const params = new HttpParams().set('q', query);
    return this.http
      .get<ApiData<SystemConfigValueDto[]> | { Data: SystemConfigValueDto[] } | SystemConfigValueDto[]>(
        ApiPaths.adminSystemConfigValuesSearch(code),
        { params }
      )
      .pipe(map(unwrapData), map((rows) => (Array.isArray(rows) ? rows : [])));
  }

  ensureConfigValue(
    code: string,
    draft: Pick<SystemConfigValueDto, 'label_en' | 'label_ar' | 'parentReasonId'> & { IsActive?: boolean }
  ) {
    return this.http
      .post<ApiData<SystemConfigValueDto> | { Data: SystemConfigValueDto }>(
        ApiPaths.adminSystemConfigValuesEnsure(code),
        draft
      )
      .pipe(
        map(unwrapData),
        tap((row) => this.store.dispatch(adminSystemActions.configValueUpserted({ code, row })))
      );
  }

  getConfigValuesPage(
    code: string,
    pageIndex: number,
    pageSize: number,
    parentReasonId?: string | number | null,
    includeInactive = false
  ): Observable<PagedListResponse<SystemConfigValueDto>> {
    return this.fetchConfigValuesPage(code, pageIndex, pageSize, parentReasonId, includeInactive).pipe(
      tap((page) => this.store.dispatch(adminSystemActions.cacheConfigValues({ code, ...page })))
    );
  }

  private fetchConfigValuesPage(
    code: string,
    pageIndex: number,
    pageSize: number,
    parentReasonId?: string | number | null,
    includeInactive = false
  ): Observable<PagedListResponse<SystemConfigValueDto>> {
    let hp = this.pageParams({ pageIndex, pageSize });
    if (parentReasonId != null && parentReasonId !== '') {
      hp = hp.set('parentReasonId', String(parentReasonId));
    }
    if (includeInactive) {
      hp = hp.set('includeInactive', 'true');
    }
    return this.http
      .get<ApiData<PagedListResponse<SystemConfigValueDto>> | { Data: PagedListResponse<SystemConfigValueDto> }>(
        ApiPaths.adminSystemConfigValues(code),
        { params: hp }
      )
      .pipe(map(unwrapData));
  }

  createConfigValue(code: string, body: CreateSystemConfigValueDto) {
    return this.http
      .post<ApiData<SystemConfigValueDto> | { Data: SystemConfigValueDto }>(ApiPaths.adminSystemConfigValues(code), body)
      .pipe(
        map(unwrapData),
        tap((row) => this.store.dispatch(adminSystemActions.configValueUpserted({ code, row })))
      );
  }

  updateConfigValue(code: string, id: string | number, body: UpdateSystemConfigValueDto) {
    return this.http
      .put<ApiData<SystemConfigValueDto> | { Data: SystemConfigValueDto }>(ApiPaths.adminSystemConfigValue(code, id), body)
      .pipe(
        map(unwrapData),
        tap((row) => this.store.dispatch(adminSystemActions.configValueUpserted({ code, row })))
      );
  }

  getSkillCategoriesPage(params: PagedQueryParams & { q?: string }) {
    return this.http
      .get<ApiData<PagedListResponse<SkillCategoryDto>> | { Data: PagedListResponse<SkillCategoryDto> }>(
        ApiPaths.adminSkillCategories,
        { params: this.pageParams(params) }
      )
      .pipe(map(unwrapData));
  }

  getSkillCategories() {
    return this.http
      .get<ApiData<PagedListResponse<SkillCategoryDto>> | { Data: PagedListResponse<SkillCategoryDto> }>(
        ApiPaths.adminSkillCategories
      )
      .pipe(
        map(unwrapData),
        map((page) => page.rows),
        tap((rows) => this.store.dispatch(adminSystemActions.cacheSkillCategories({ rows })))
      );
  }

  createSkillCategory(body: Omit<SkillCategoryDto, 'Id'>) {
    return this.http
      .post<ApiData<SkillCategoryDto> | { Data: SkillCategoryDto }>(ApiPaths.adminSkillCategories, body)
      .pipe(
        map(unwrapData),
        tap((row) => this.store.dispatch(adminSystemActions.skillCategoryUpserted({ row })))
      );
  }

  updateSkillCategory(id: number, body: Partial<SkillCategoryDto>) {
    return this.http
      .put<ApiData<SkillCategoryDto> | { Data: SkillCategoryDto }>(`${ApiPaths.adminSkillCategories}/${id}`, body)
      .pipe(
        map(unwrapData),
        tap((row) => this.store.dispatch(adminSystemActions.skillCategoryUpserted({ row })))
      );
  }

  /** Merged skills taxonomy page — `kind` filters Professional / Basic / Personal; omit for all kinds. */
  getSkillsPage(params: PagedQueryParams & { q?: string; categoryId?: number | null; kind?: SkillKind | null }) {
    return this.http
      .get<ApiData<PagedListResponse<SkillDto>> | { Data: PagedListResponse<SkillDto> }>(ApiPaths.adminSkills, {
        params: this.pageParams(params, params.categoryId, params.kind),
      })
      .pipe(map(unwrapData));
  }

  /** Professional skills lookup (default kind for legacy consumers). */
  getSkills() {
    return this.fetchSkillRows(SkillKind.Professional).pipe(
      tap((rows) => this.store.dispatch(adminSystemActions.cacheSkills({ rows })))
    );
  }

  /** Soft / personal skills lookup (catalog Kind = Personal). */
  getBasicSkills() {
    return this.fetchSkillRows(SkillKind.Personal).pipe(
      tap((rows) => this.store.dispatch(adminSystemActions.cacheBasicSkills({ rows })))
    );
  }

  private fetchSkillRows(kind: SkillKind): Observable<SkillDto[]> {
    return this.http
      .get<ApiData<PagedListResponse<SkillDto>> | { Data: PagedListResponse<SkillDto> }>(ApiPaths.adminSkills, {
        params: this.pageParams({}, null, kind),
      })
      .pipe(
        map(unwrapData),
        map((page) => page.rows)
      );
  }

  createSkill(body: Omit<SkillDto, 'Id'>) {
    const payload: Omit<SkillDto, 'Id'> = {
      ...body,
      Kind: body.Kind ?? SkillKind.Professional,
      CategoryId: body.Kind === SkillKind.TechStack ? null : (body.CategoryId ?? 1),
    };
    return this.http
      .post<ApiData<SkillDto> | { Data: SkillDto }>(ApiPaths.adminSkills, payload)
      .pipe(
        map(unwrapData),
        tap((row) => this.store.dispatch(adminSystemActions.skillUpserted({ row })))
      );
  }

  updateSkill(id: number, body: Partial<SkillDto>) {
    return this.http
      .put<ApiData<SkillDto> | { Data: SkillDto }>(`${ApiPaths.adminSkills}/${id}`, body)
      .pipe(
        map(unwrapData),
        tap((row) => this.store.dispatch(adminSystemActions.skillUpserted({ row })))
      );
  }

  /** Tech stacks lookup from the merged catalog (kind = TechStack). */
  getTechStacks(): Observable<TechStackDto[]> {
    return this.fetchSkillRows(SkillKind.TechStack).pipe(
      tap((rows) => this.store.dispatch(adminSystemActions.cacheTechStacks({ rows })))
    );
  }

  getNotificationTemplatesPage(params: PagedQueryParams & { q?: string }) {
    let hp = this.pageParams(params);
    if (params.q?.trim()) {
      hp = hp.set('q', params.q.trim());
    }
    return this.http
      .get<ApiData<PagedListResponse<NotificationTemplateListItemDto>> | { Data: PagedListResponse<NotificationTemplateListItemDto> }>(
        ApiPaths.adminNotificationTemplates,
        { params: hp }
      )
      .pipe(
        map(unwrapData),
        tap((page) => this.store.dispatch(adminSystemActions.cacheNotificationTemplatesPage({ page })))
      );
  }

  getNotificationTemplate(actionCode: string) {
    return this.http
      .get<ApiData<NotificationTemplateDto> | { Data: NotificationTemplateDto }>(
        ApiPaths.adminNotificationTemplate(actionCode)
      )
      .pipe(map(unwrapData));
  }

  getNotificationTemplatePlaceholders(actionCode: string) {
    return this.http
      .get<ApiData<NotificationTemplatePlaceholdersDto> | { Data: NotificationTemplatePlaceholdersDto }>(
        ApiPaths.adminNotificationTemplatePlaceholders(actionCode)
      )
      .pipe(map(unwrapData));
  }

  updateNotificationTemplate(actionCode: string, body: UpdateNotificationTemplateDto) {
    return this.http
      .put<ApiData<NotificationTemplateDto> | { Data: NotificationTemplateDto }>(
        ApiPaths.adminNotificationTemplate(actionCode),
        body
      )
      .pipe(
        map(unwrapData),
        tap((row) => this.store.dispatch(adminSystemActions.notificationTemplateUpserted({ row })))
      );
  }

  previewNotificationTemplate(actionCode: string, locale: 'en' | 'ar') {
    const params = new HttpParams().set('locale', locale);
    return this.http
      .get<ApiData<RenderedNotificationDto> | { Data: RenderedNotificationDto }>(
        ApiPaths.adminNotificationTemplatePreview(actionCode),
        { params }
      )
      .pipe(map(unwrapData));
  }

  getAuditTrailPage(params: SystemAuditTrailQuery) {
    let hp = this.pageParams(params);
    const setIf = (key: string, value: string | undefined) => {
      if (value?.trim()) {
        hp = hp.set(key, value.trim());
      }
    };
    setIf('module', params.module);
    setIf('entityType', params.entityType);
    setIf('entityReference', params.entityReference);
    setIf('field', params.field);
    setIf('action', params.action);
    setIf('source', params.source);
    setIf('updatedByUserId', params.updatedByUserId);
    setIf('updatedFrom', params.updatedFrom);
    setIf('updatedTo', params.updatedTo);
    setIf('value', params.value);
    return this.http
      .get<ApiData<PagedListResponse<SystemAuditTrailRowDto>> | { Data: PagedListResponse<SystemAuditTrailRowDto> }>(
        ApiPaths.adminAuditTrail,
        { params: hp }
      )
      .pipe(map(unwrapData));
  }

  getAuditValueHistoryPage(params: SystemAuditValueHistoryQuery) {
    let hp = this.pageParams(params);
    const setIf = (key: string, value: string | undefined) => {
      if (value?.trim()) {
        hp = hp.set(key, value.trim());
      }
    };
    setIf('module', params.module);
    setIf('entityType', params.entityType);
    setIf('entityReference', params.entityReference);
    setIf('field', params.field);
    setIf('value', params.value);
    setIf('rangeFrom', params.rangeFrom);
    setIf('rangeTo', params.rangeTo);
    return this.http
      .get<
        | ApiData<PagedListResponse<SystemAuditValueHistoryRowDto>>
        | { Data: PagedListResponse<SystemAuditValueHistoryRowDto> }
      >(ApiPaths.adminAuditValueHistory, { params: hp })
      .pipe(map(unwrapData));
  }

  getNotificationTransactionsPage(params: NotificationTransactionLogQuery) {
    let hp = this.pageParams(params);
    const setIf = (key: string, value: string | undefined) => {
      if (value?.trim()) {
        hp = hp.set(key, value.trim());
      }
    };
    setIf('channelType', params.channelType);
    setIf('receiver', params.receiver);
    setIf('actionCode', params.actionCode);
    setIf('createdFrom', params.createdFrom);
    setIf('createdTo', params.createdTo);
    if (params.isSuccess === 'true' || params.isSuccess === 'false') {
      hp = hp.set('isSuccess', params.isSuccess);
    }
    return this.http
      .get<
        | ApiData<PagedListResponse<NotificationTransactionLogRowDto>>
        | { Data: PagedListResponse<NotificationTransactionLogRowDto> }
      >(ApiPaths.adminNotificationTransactions, { params: hp })
      .pipe(map(unwrapData));
  }

  resendNotificationTransaction(id: number) {
    return this.http
      .post<ApiData<NotificationTransactionLogRowDto> | { Data: NotificationTransactionLogRowDto }>(
        ApiPaths.adminNotificationTransactionResend(id),
        {}
      )
      .pipe(map(unwrapData));
  }

  private pageParams(
    params: Partial<PagedQueryParams> & { q?: string },
    categoryId?: number | null,
    kind?: SkillKind | null
  ): HttpParams {
    let hp = new HttpParams();
    if (params.pageSize != null && params.pageSize > 0 && params.pageIndex != null && params.pageIndex >= 0) {
      hp = hp.set('pageIndex', String(params.pageIndex)).set('pageSize', String(params.pageSize));
    }
    if (params.q?.trim()) {
      hp = hp.set('q', params.q.trim());
    }
    if (categoryId != null && categoryId > 0) {
      hp = hp.set('categoryId', String(categoryId));
    }
    if (kind != null && kind > 0) {
      hp = hp.set('kind', String(kind));
    }
    return hp;
  }
}
