/** Shared paging query params for server-driven lists. */
export interface PagedQueryParams {
  pageIndex: number;
  pageSize: number;
  q?: string;
}

/** Shared server-paged list response (`Data` payload shape). */
export interface PagedListResponse<T> {
  rows: T[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export const PAGE_SIZE_OPTIONS = [5, 10, 15] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 5;
export const MAX_PAGE_SIZE = 100;

/** NgRx cache slice for a single paged list (same shape as API response). */
export type PagedListPageSlice<T> = PagedListResponse<T>;

export type CredentialDefinitionStatusTab = 'all' | 'Draft' | 'PendingScheduling' | 'Active' | 'Completed';

export type CredentialEnrollmentStatusTab = 'all' | 'Pending' | 'In Progress' | 'Completed' | 'Draft' | 'Scheduled';

/** Credential hub: filter enrollments by linked definition kind. */
export type CredentialEnrollmentKindTab = 'all' | 'evaluation' | 'exam' | 'course';

/** Server filter for admin/operator interview records list. */
export type InterviewRecordStatusTab = 'all' | 'Pending' | 'Completed' | 'Cancelled';

/** Lifecycle bucket filter for job seeker interviews list (maps to record status buckets). */
export type JobseekerInterviewLifecycleTab = 'all' | 'Draft' | 'PendingInterview' | 'Completed';
