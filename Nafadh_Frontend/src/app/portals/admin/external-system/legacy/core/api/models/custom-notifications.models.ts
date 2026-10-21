import type { PagedListResponse } from './paged-list.models';

export type CustomNotificationTargetType = 'User' | 'UserGroup' | 'Organization' | 'AllOrganizations' | 'JobSeekers';

/** Audience narrowing for the "All organizations" / "Job seekers" targets. */
export type CustomNotificationRegistrationFilter = 'All' | 'Registered' | 'NotRegistered';

export const CUSTOM_NOTIFICATION_REGISTRATION_FILTERS: readonly CustomNotificationRegistrationFilter[] = [
  'All',
  'Registered',
  'NotRegistered',
];

export type CustomNotificationStatus = 'Scheduled' | 'Processing' | 'Sent' | 'PartiallyFailed' | 'Failed' | 'Cancelled';

export const CUSTOM_NOTIFICATION_STATUSES: readonly CustomNotificationStatus[] = [
  'Scheduled',
  'Processing',
  'Sent',
  'PartiallyFailed',
  'Failed',
  'Cancelled',
];

export interface CustomNotificationTargetDto {
  TargetType: CustomNotificationTargetType;
  UserId?: string | null;
  UserGroupId?: number | null;
  OrganizationId?: number | null;
  Label?: string | null;
  RegistrationFilter?: CustomNotificationRegistrationFilter | null;
}

export interface UpsertCustomNotificationRequestDto {
  Title_en: string;
  Title_ar: string;
  Body_en: string;
  Body_ar: string;
  SendEmail: boolean;
  SendSms: boolean;
  SendSystem: boolean;
  SendNow: boolean;
  ScheduledAtUtc: string | null;
  Targets: CustomNotificationTargetDto[];
}

export interface CustomNotificationRowDto {
  Id: number;
  Title_en: string;
  Title_ar: string;
  SendEmail: boolean;
  SendSms: boolean;
  SendSystem: boolean;
  ScheduledAtUtc: string;
  Status: CustomNotificationStatus;
  TotalRecipients: number;
  SentCount: number;
  FailedCount: number;
  SkippedCount: number;
  UserTargetCount: number;
  GroupTargetCount: number;
  OrganizationTargetCount: number;
  AllOrganizations: boolean;
  AllOrganizationsFilter?: CustomNotificationRegistrationFilter | null;
  JobSeekersFilter?: CustomNotificationRegistrationFilter | null;
  CanEdit: boolean;
  CreatedAtUtc: string;
  ProcessedAtUtc: string | null;
}

export interface CustomNotificationDto extends CustomNotificationRowDto {
  Body_en: string;
  Body_ar: string;
  Targets: CustomNotificationTargetDto[];
}

export interface CustomNotificationRecipientPreviewDto {
  RegisteredUsers: number;
  EmailOnlyOrganizations: number;
  UnregisteredJobSeekers: number;
  Total: number;
}

export interface CustomNotificationsQuery {
  pageIndex: number;
  pageSize: number;
  q?: string;
  status?: string;
  channel?: string;
}

export interface UserNotificationDto {
  Id: number;
  Title: string;
  Body: string;
  Locale: string;
  IsRead: boolean;
  CreatedAtUtc: string;
  ReadAtUtc: string | null;
}

export interface UserNotificationUnreadCountDto {
  Count: number;
}

export type CustomNotificationsPage = PagedListResponse<CustomNotificationRowDto>;
export type UserNotificationsPage = PagedListResponse<UserNotificationDto>;
