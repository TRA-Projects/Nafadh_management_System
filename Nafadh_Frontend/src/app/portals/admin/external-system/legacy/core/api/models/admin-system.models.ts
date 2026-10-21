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

export interface SystemConfigValueDto {
  id: string | number;
  code?: string;
  label_en: string;
  label_ar: string;
  IsActive?: boolean;
  /** When true on a main reason row, conduct UI shows a linked sub-reason dropdown. */
  subReasonDropdown?: boolean;
  /** Sub-reason row — id of the parent main reason constant. */
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
  IsActive: boolean;
  subReasonDropdown?: boolean;
  parentReasonId?: string | number | null;
}

export interface SkillCategoryDto {
  Id: number;
  NameEn: string;
  NameAr: string;
  SortOrder: number;
  IsActive: boolean;
}

/** Mirrors backend `CatalogSkillKind` (merged CatalogSkills table discriminator). */
export const SkillKind = {
  Professional: 1,
  Basic: 2,
  Personal: 3,
  TechStack: 4,
} as const;
export type SkillKind = (typeof SkillKind)[keyof typeof SkillKind];

export interface SkillDto {
  Id: number;
  /** Null for tech-stack rows (flat list without categories). */
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

export interface NotificationTemplateDto extends NotificationTemplateListItemDto {
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
