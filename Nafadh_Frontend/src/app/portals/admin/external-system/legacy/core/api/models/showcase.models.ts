import type { PagedListResponse, PagedQueryParams } from './paged-list.models';

export const SHOWCASE_CATEGORIES = ['Training', 'Equipment', 'Travel'] as const;
export type ShowcaseCategory = (typeof SHOWCASE_CATEGORIES)[number];

export const SHOWCASE_STATUSES = ['Draft', 'Submitted', 'Approved'] as const;
export type ShowcaseStatus = (typeof SHOWCASE_STATUSES)[number];

export interface ShowcaseItemDto {
  Id: number;
  Title_en: string;
  Title_ar: string;
  Category: ShowcaseCategory | string;
  Status: ShowcaseStatus | string;
  ContactEmail: string;
  PhoneNumber: string;
  Amount: number;
  StartDate: string;
  EndDate: string;
  IsUrgent: boolean;
  Description: string;
  CreatedAtUtc: string;
  CanEdit: boolean;
}

export interface UpsertShowcaseItemRequestDto {
  Title_en: string;
  Title_ar: string;
  Category: string;
  Status: string;
  ContactEmail: string;
  PhoneNumber: string;
  Amount: number | null;
  StartDate: string | null;
  EndDate: string | null;
  IsUrgent: boolean;
  Description: string;
}

export interface ShowcaseQuery extends PagedQueryParams {
  category?: string;
  status?: string;
}

export type ShowcasePage = PagedListResponse<ShowcaseItemDto>;
