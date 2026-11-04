/* =========================================================
   System Variables
========================================================= */

export interface SystemVariableDto {
  Code: string;
  VariableKey: string;
  VariableName: string;
  VariableNameEn?: string;
  VariableNameAr?: string;
  ValueType: 'Boolean' | 'Integer' | 'String' | 'Time' | 'Json';
  Value: string | number | boolean;
  Description?: string;
  DescriptionEn?: string;
  DescriptionAr?: string;
}

/* =========================================================
   System Configuration
========================================================= */

export interface SystemConfigGroupDto {
  code: string;
  label_en: string;
  label_ar: string;
  IsActive: boolean;
  IsReadOnly: boolean;
  /** Nafadh enum group: labels editable, stored activation preserved (workflow depends on every value). */
  IsLabelsOnly?: boolean;
  canEditLabels?: boolean;
  canChangeActive?: boolean;
  activationKeys?: readonly string[];
  canCreate?: boolean;
  /** Legacy equivalent of disallowing new keys for Nafadh groups. */
  IsFixedKeys?: boolean;
}

export interface SystemConfigValueDto {
  isActive?: boolean;
  id: string | number;
  code?: string;
  label_en: string;
  label_ar: string;
  IsActive?: boolean;
  subReasonDropdown?: boolean;
  parentReasonId?: string | number | null;
}

export interface SystemConfigValuesPageDto {
  rows: SystemConfigValueDto[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface CreateSystemConfigValueDto {
  code: string;
  label_en: string;
  label_ar: string;
  IsActive: boolean;
  subReasonDropdown?: boolean;
  parentReasonId?: string | number | null;
}

export interface UpdateSystemConfigValueDto {
  label_en: string;
  label_ar: string;
  IsActive?: boolean;
  subReasonDropdown?: boolean;
  parentReasonId?: string | number | null;
}

/* =========================================================
   Skills
========================================================= */

export interface SkillCategoryDto {
  Id: number;
  NameEn: string;
  NameAr: string;
  SortOrder: number;
  IsActive: boolean;
}

export const SkillKind = {
  Professional: 1,
  Basic: 2,
  Personal: 3,
  TechStack: 4,
} as const;

export type SkillKind =
  (typeof SkillKind)[keyof typeof SkillKind];

export interface SkillDto {
  Id: number;
  CategoryId: number | null;
  Kind: SkillKind;
  NameEn: string;
  NameAr: string;
  IsActive: boolean;
}

export interface TechStackDto {
  Id: number;
  NameEn: string;
  NameAr: string;
  IsActive: boolean;
}

/* =========================================================
   Existing Jobseekers Notification Templates
   Keep these because existing Jobseekers APIs use them.
========================================================= */

export interface NotificationTemplateListItemDto {
  Id: number;
  ActionCode: string;
  LabelEn: string;
  LabelAr: string;
  IsActive: boolean;
  EmailEnabled: boolean;
  SmsEnabled: boolean;
  SortOrder: number;
}

export interface NotificationTemplateDto
  extends NotificationTemplateListItemDto {
  EmailSubjectEn: string;
  EmailSubjectAr: string;
  EmailBodyEn: string;
  EmailBodyAr: string;
  SmsBodyEn: string;
  SmsBodyAr: string;
}

export interface UpdateNotificationTemplateDto {
  LabelEn: string;
  LabelAr: string;
  EmailSubjectEn: string;
  EmailSubjectAr: string;
  EmailBodyEn: string;
  EmailBodyAr: string;
  SmsBodyEn: string;
  SmsBodyAr: string;
  IsActive: boolean;
  EmailEnabled: boolean;
  SmsEnabled: boolean;
}

export interface NotificationPlaceholderDto {
  Token: string;
  LabelEn: string;
  LabelAr: string;
  SampleValue: string;
}

export interface NotificationTemplatePlaceholdersDto {
  ActionCode: string;
  Placeholders: NotificationPlaceholderDto[];
}

export interface RenderedNotificationChannelDto {
  Subject: string | null;
  Body: string | null;
}

export interface RenderedNotificationDto {
  ActionCode: string;
  IsActive: boolean;
  Email: RenderedNotificationChannelDto | null;
  Sms: RenderedNotificationChannelDto | null;
}

/* =========================================================
   Nafadh Backend Notification Templates
   API: /api/NotificationTemplate
========================================================= */

export type NafadhNotificationTemplateType =
  | 'Email'
  | 'SMS'
  | 'Push';

export interface NafadhNotificationTemplateDto {
  Id: number;
  Code: string;
  Name: string;
  PortalCode: string;
  Type: string;
  Subject: string | null;
  Body: string;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string | null;
}

export interface CreateNafadhNotificationTemplateDto {
  Code: string;
  Name: string;
  PortalCode: string;
  Type: string;
  Subject: string | null;
  Body: string;
  IsActive: boolean;
}

export interface UpdateNafadhNotificationTemplateDto {
  Code: string;
  Name: string;
  PortalCode: string;
  Type: string;
  Subject: string | null;
  Body: string;
  IsActive: boolean;
}

export interface UpdateNafadhNotificationTemplateStatusDto {
  IsActive: boolean;
}

export interface TestNafadhNotificationEmailDto {
  Email: string;
  TraineeName: string;
  BatchName: string;
  ProgramName: string;
}

/* =========================================================
   Evaluation Programs and Modules
========================================================= */

export interface EvaluationProgramOption {
  ProgramId: number;
  Title: string;
}

export interface EvaluationModuleOption {
  ModuleId: number;
  ProgramId: number;
  Title: string;
  OrderIndex: number;
  AvailableFrom?: string | null;
  AvailableTo?: string | null;
  IsArchived?: boolean;
  PrerequisiteModuleId?: number | null;
}

/* =========================================================
   Evaluation Templates
   API: /api/EvaluationTemplate
========================================================= */

export interface EvaluationTemplateDto {
  TemplateId: number;
  Type: string;
  ModuleId: number | null;
  Stage: string | null;
  CreatedByUserId: string;
}

export interface EvaluationTemplateDetailsDto
  extends EvaluationTemplateDto {
  Criteria: EvaluationCriterionDto[];
}

export interface CreateEvaluationTemplateDto {
  Type: string;
  ModuleId: number | null;
  Stage: string | null;
  CreatedByUserId: string;
}

export interface UpdateEvaluationTemplateDto {
  Type: string;
  ModuleId: number | null;
  Stage: string | null;
  CreatedByUserId: string;
}

/* =========================================================
   Evaluation Criteria
   API: /api/EvaluationCriterion
========================================================= */

export interface EvaluationCriterionDto {
  CriteriaId: number;
  TemplateId: number;
  Name: string;
  Weight: number;
  MaxPoints: number;
}

export interface EvaluationCriterionInputDto {
  TemplateId: number;
  Name: string;
  Weight: number;
  MaxPoints: number;
}

export interface EvaluationWeightsCheckDto {
  TemplateId: number;
  IsValid: boolean;
}

/* =========================================================
   System Audit Trail
========================================================= */

export interface SystemAuditTrailRowDto {
  Id: number;
  Module: string;
  EntityType: string;
  EntityReference: string;
  Field: string;
  OldValue: string | null;
  NewValue: string | null;
  Action: string;
  Source: string;
  UpdatedByUserId: string | null;
  UpdatedDate: string;
}

export interface SystemAuditValueHistoryRowDto {
  Module: string;
  EntityType: string;
  EntityReference: string;
  Field: string;
  Value: string;
  ValidFrom: string;
  ValidTo: string | null;
  UpdatedByUserId: string | null;
  Source: string;
}

export interface SystemAuditTrailQuery {
  pageIndex: number;
  pageSize: number;
  module?: string;
  entityType?: string;
  entityReference?: string;
  field?: string;
  action?: string;
  source?: string;
  updatedByUserId?: string;
  updatedFrom?: string;
  updatedTo?: string;
  value?: string;
}

export interface SystemAuditValueHistoryQuery {
  pageIndex: number;
  pageSize: number;
  module?: string;
  entityType?: string;
  entityReference?: string;
  field?: string;
  value?: string;
  rangeFrom?: string;
  rangeTo?: string;
}

/* =========================================================
   Notification Transaction Logs
========================================================= */

export interface NotificationTransactionLogRowDto {
  Id: number;
  ChannelType: string;
  Receiver: string;
  Subject: string | null;
  MessageBody: string | null;
  PreferredLanguage: string | null;
  ActionCode: string | null;
  ActionLabelEn?: string | null;
  ActionLabelAr?: string | null;
  ProfileId: number | null;
  IsSuccess: boolean;
  FailureReason: string | null;
  CreatedAtUtc: string;
}

export interface NotificationTransactionLogQuery {
  pageIndex: number;
  pageSize: number;
  channelType?: string;
  receiver?: string;
  actionCode?: string;
  isSuccess?: '' | 'true' | 'false';
  createdFrom?: string;
  createdTo?: string;
}