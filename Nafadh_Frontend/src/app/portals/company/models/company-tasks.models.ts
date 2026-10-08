// Company Portal — Tasks & Projects (course plans).
// Mirror of Nafadh_Backend/DTOs/CoursePlanDTOs.cs. Kept local to the company
// portal so no shared / other-portal model file is touched.

export type PlanApprovalStatus = 'Draft' | 'PendingApproval' | 'Approved' | 'Rejected';
export type PlanExecutionStatus = 'NotStarted' | 'InProgress' | 'OnHold' | 'Completed';
export type PlanItemType = 'Task' | 'Project';
export type PlanProgressStatus = 'NotStarted' | 'InProgress' | 'Completed';
export type PlanPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface CoursePlansCountsDto {
  total: number;
  draft: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  inProgress: number;
  completed: number;
  delayedPlans: number;
}

export interface CoursePlanSummaryDto {
  planId: number;
  companyId: number;
  programId?: number | null;
  companyName: string;
  title: string;
  description?: string | null;
  category?: string | null;
  durationHours: number;
  startDate: string;
  endDate: string;
  approvalStatus: PlanApprovalStatus;
  executionStatus: PlanExecutionStatus;
  stageCount: number;
  itemCount: number;
  completedItems: number;
  progressPercentage: number;
  expectedProgressPercentage: number;
  isDelayed: boolean;
  delayedStages: number;
  createdByName: string;
  createdAt: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  trainers: CoursePlanTrainerOptionDto[];
}

export interface CoursePlansOverviewDto {
  counts: CoursePlansCountsDto;
  plans: CoursePlanSummaryDto[];
}

export interface CoursePlanItemDto {
  itemId: number;
  stageId: number;
  itemType: PlanItemType;
  title: string;
  description?: string | null;
  dueDate: string;
  priority: PlanPriority;
  status: PlanProgressStatus;
  trainerId?: number | null;
  trainerName?: string | null;
  isOverdue: boolean;
}

export interface CoursePlanStageDto {
  stageId: number;
  orderIndex: number;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  trainerId?: number | null;
  trainerName?: string | null;
  trainers: CoursePlanTrainerOptionDto[];
  status: PlanProgressStatus;
  progressPercentage: number;
  isDelayed: boolean;
  itemCount: number;
  completedItems: number;
  items: CoursePlanItemDto[];
}

export interface CoursePlanNoteDto {
  noteId: number;
  stageId?: number | null;
  itemId?: number | null;
  targetTitle?: string | null;
  text: string;
  authorName: string;
  isAuthority: boolean;
  createdAt: string;
}

export interface CoursePlanDetailDto extends CoursePlanSummaryDto {
  startedAt?: string | null;
  completedAt?: string | null;
  canEditStructure: boolean;
  canSubmit: boolean;
  canWithdraw: boolean;
  canDelete: boolean;
  canStart: boolean;
  canTrack: boolean;
  canHold: boolean;
  canResume: boolean;
  stages: CoursePlanStageDto[];
  notes: CoursePlanNoteDto[];
}

export interface CoursePlanTrainerOptionDto {
  trainerId: number;
  fullName: string;
  specialty?: string | null;
}

export interface CoursePlanProgramOptionDto {
  programId: number;
  title: string;
  description?: string | null;
  category?: string | null;
  durationHours: number;
  price: number;
  trackId: number;
  status: string;
}

export interface CoursePlanTrackOptionDto {
  trackId: number;
  name: string;
}

export interface CoursePlanLookupsDto {
  trainers: CoursePlanTrainerOptionDto[];
  programs: CoursePlanProgramOptionDto[];
  tracks: CoursePlanTrackOptionDto[];
  categories: string[];
}

export interface SaveCoursePlanRequest {
  programId?: number | null;
  trackId?: number | null;
  price?: number;
  trainerIds: number[];
  title: string;
  description?: string | null;
  category?: string | null;
  durationHours: number;
  startDate: string;
  endDate: string;
}

export interface SaveCoursePlanStageRequest {
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  trainerId?: number | null;
  trainerIds: number[];
}

export interface SaveCoursePlanItemRequest {
  itemType: PlanItemType;
  title: string;
  description?: string | null;
  dueDate: string;
  priority: PlanPriority;
  trainerId?: number | null;
}

export interface AddCoursePlanNoteRequest {
  text: string;
  stageId?: number | null;
  itemId?: number | null;
}

// ── Arabic labels (single source for list + workspace pages) ──────────

export const APPROVAL_LABELS: Record<PlanApprovalStatus, string> = {
  Draft: 'مسودة',
  PendingApproval: 'بانتظار اعتماد الهيئة',
  Approved: 'معتمدة',
  Rejected: 'مرفوضة — تحتاج تعديلاً',
};

export const EXECUTION_LABELS: Record<PlanExecutionStatus, string> = {
  NotStarted: 'لم يبدأ',
  InProgress: 'قيد التنفيذ',
  OnHold: 'موقوف مؤقتاً',
  Completed: 'مكتمل',
};

export const PROGRESS_LABELS: Record<PlanProgressStatus, string> = {
  NotStarted: 'لم تبدأ',
  InProgress: 'قيد التنفيذ',
  Completed: 'مكتملة',
};

export const PRIORITY_LABELS: Record<PlanPriority, string> = {
  Low: 'منخفضة',
  Medium: 'متوسطة',
  High: 'عالية',
  Critical: 'حرجة',
};

export const ITEM_TYPE_LABELS: Record<PlanItemType, string> = {
  Task: 'مهمة',
  Project: 'مشروع',
};
