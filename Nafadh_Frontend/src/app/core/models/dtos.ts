// Mirrors the real backend's DTOs exactly (field names/casing match the C#
// classes as serialized by System.Text.Json's default camelCase policy).
// Where a DTO wasn't touched in the Phase-2 backend upgrade and its exact
// shape wasn't re-verified this session (Program/Track/Session/Certificate/
// TrainingMaterial), fields are marked optional so the UI degrades gracefully
// rather than breaking if a field is named slightly differently.

import {
  AnnouncementScopeType, AttendanceStatus, BadgeConditionType, BatchStatus, CertificateType,
  CompanyStatus, ConversationType, EnrollmentCompletionStatus, EvaluationPeriod, EvaluationType,
  ExcuseStatus, FeedbackType, MessageStatus, ModuleProgressStatus, ProjectStatus, RoleName,
  SubmissionStatus, SupportTicketStatus, TaskPriority, TaskStatus, TraineeStatus, TrainerStatus,
  VerificationStatus, WarningLevel, WarningScope, WarningStatus, WarningType,
} from './enums';
// ---- DTOs ----
// ---- Auth ----
export interface LoginResponseDto {
  token: string;
  expiresAtUtc: string;
  userId: number;
  fullName: string;
  email: string;
  roleId: number;
  roleName: RoleName;
}

export interface UserResponseDto {
  userId: number;
  fullName: string;
  email: string;
  phone?: string;
  roleId: number;
  roleName: RoleName;
  status: string;
  createdAt: string;
}

export interface RoleDto {
  roleId: number;
  roleName: string;
  permissions?: PermissionDto[];
}

export interface PermissionDto {
  permissionId: number;
  name: string;
  description?: string;
}

// ---- Trainee ----
export interface TraineeListItemDto {
  traineeId: number;
  fullName?: string;
  university?: string;
  major?: string;
  status: TraineeStatus;
  verificationStatus: VerificationStatus;
  companyId?: number;
  companyName?: string;
}

export interface TraineeProfileDto {
  traineeId: number;
  fullName?: string;
  email?: string;
  nationalId: number;
  university?: string;
  major?: string;
  academicLevel?: string;
  skills?: string;
  resumeUrl?: string;
  gitHubUrl?: string;
  linkedInUrl?: string;
  status: TraineeStatus;
  verificationStatus: VerificationStatus;
  companyId?: number;
  companyName?: string;
}

export interface TraineeDashboardSummaryDto {
  traineeId: number;
  fullName?: string;
  status: TraineeStatus;
  companyName?: string;
  enrollmentsCount: number;
  completedModulesCount: number;
  totalModulesCount: number;
  moduleProgressPercentage: number;
  totalSessionsCount: number;
  attendedSessionsCount: number;
  attendanceRate: number;
  submissionsCount: number;
  pendingSubmissionsCount: number;
  activeProjectsCount: number;
}

// ---- Company ----
export interface CompanyDto {
  companyId: number;
  companyName: string;
  commercialRegister?: string;
  workField?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  capacity: number;
  status: CompanyStatus;
  approvalDate?: string;
  userId?: number;
}

export interface CompanyBranchDto {
  branchId: number;
  location: string;
  contactPoint?: string;
  companyId: number;
}

export interface CompanySupervisorDto {
  supervisorId: number;
  id?: number;
  fullName?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  status?: string;
  userId: number;
  companyId: number;
}

export interface CompanyCapacityDto {
  total?: number;
  used?: number;
  remaining?: number;
  [key: string]: unknown;
}

// ---- Trainer ----
export interface TrainerDto {
  trainerId: number;
  fullName?: string;
  specialty?: string;
  experienceYears: number;
  biography?: string;
  cvUrl?: string;
  status: TrainerStatus;
  userId: number;
}

export interface TrainerBatchDto {
  batchId: number;
  batchName?: string;
  startDate?: string;
  endDate?: string;
  status: BatchStatus;
}

// ---- Academic structure ----
export interface TrackDto {
  trackId: number;
  name?: string;
  description?: string;
  status?: string;
}

export interface ProgramDto {
  programId: number;
  title?: string;
  name?: string;
  description?: string;
  trackId?: number;
  durationHours?: number;
  price?: number;
  status?: string;
}

export interface BatchDto {
  batchId: number;
  programId: number;
  batchName: string;
  startDate: string;
  endDate: string;
  capacity: number;
  status: BatchStatus;
}

export interface BatchTraineeDto {
  traineeId: number;
  fullName: string;
  completionStatus?: EnrollmentCompletionStatus;
}

export interface BatchCapacityDto {
  batchId: number;
  capacity: number;
  enrolledCount: number;
  availableSeats: number;
}

export interface ModuleDto {
  moduleId: number;
  programId: number;
  title: string;
  orderIndex: number;
  availableFrom?: string;
  availableTo?: string;
  isArchived: boolean;
  prerequisiteModuleId?: number;
}

export interface LessonDto {
  lessonId: number;
  moduleId: number;
  title?: string;
  contentBody?: string;
  orderIndex?: number;
}

export interface TraineeModuleProgressDto {
  progressId: number;
  status: ModuleProgressStatus;
  completedAt?: string;
  traineeId: number;
  moduleId: number;
  moduleTitle?: string;
}

export interface SessionDto {
  sessionId: number;
  title?: string;
  topic?: string;
  meetingLink?: string;
  scheduledAt?: string;
  status?: string;
  batchId?: number;
}

// ---- Enrollment ----
export interface EnrollmentDto {
  enrollmentId: number;
  enrollmentDate: string;
  completionStatus: string;
  batchId: number;
  batchName: string;
  traineeId: number;
  traineeName: string;
  companyId: number;
  companyName: string;
  departmentId?: number;
  departmentName?: string;
  supervisorId?: number;
  supervisorName?: string;
}

export interface ProgressSummaryDto {
  enrollmentId: number;
  totalModules: number;
  completedModules: number;
  progressPercentage: number;
}

// ---- Attendance ----
export interface DailyAttendanceDto {
  dailyAttendanceId: number;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  isLate: boolean;
  note?: string;
  enrollmentId: number;
  traineeName?: string;
}

export interface ExcuseDto {
  excuseId: number;
  reason: string;
  proofUrl?: string;
  status: ExcuseStatus;
  dailyAttendanceId: number;
  reviewedByUserId?: number;
}

// ---- Tasks / Submissions / Projects ----
export interface TaskDto {
  taskId: number;
  title: string;
  description?: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  batchId: number;
  createdByUserId: number;
}

export interface SubmissionDto {
  submissionId: number;
  fileUrl?: string;
  submittedAt: string;
  status: SubmissionStatus;
  grade?: string;
  feedback?: string;
  taskId: number;
  traineeId: number;
  traineeName?: string;
  taskTitle?: string;
}

export interface ProjectDto {
  projectId: number;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  programId: number;
}

export interface ProjectMemberDto {
  id: number;
  role: string;
  projectId: number;
  traineeId: number;
  projectTitle?: string;
}

// ---- Evaluations (Phase-2 upgraded shape) ----
export interface EvaluationTemplateDto {
  templateId: number;
  type: EvaluationType;
  moduleId?: number;
  stage?: number;
  createdByUserId: number;
}

export interface EvaluationTemplateDetailDto extends EvaluationTemplateDto {
  criteria: EvaluationCriterionDto[];
}

export interface EvaluationCriterionDto {
  criteriaId: number;
  templateId: number;
  name: string;
  weight: number;
  maxPoints: number;
}

export interface EvaluationCriterionScoreDto {
  criteriaId: number;
  criterionName?: string;
  score: number;
  maxPoints: number;
  weight: number;
}

export interface EvaluationDto {
  evaluationId: number;
  enrollmentId: number;
  trainerId?: number;
  templateId: number;
  score: number;
  notes?: string;
  criteriaBreakdown: EvaluationCriterionScoreDto[];
}

export interface EvaluationBucketRollupDto {
  technical?: number;
  behavioral?: number;
  final?: number;
  companyEvaluation?: number;
  trainerPerformance?: number;
}

// ---- Certificates ----
export interface CertificateDto {
  certificateId: number;
  type: CertificateType;
  issueDate: string;
  fileUrl?: string;
  enrollmentId: number;
  traineeName?: string;
  programName?: string;
}

// ---- Warnings (polymorphic) ----
export interface WarningDto {
  warningId: number;
  scope: WarningScope;
  enrollmentId?: number;
  companyId?: number;
  targetName?: string;
  type: WarningType;
  level: WarningLevel;
  evidence?: string;
  status: WarningStatus;
  resolution?: string;
  issuedDate: string;
  raisedByUserId: number;
  raisedByName?: string;
}

// ---- Conversations ----
export interface ConversationListItemDto {
  conversationId: number;
  type: ConversationType;
  category?: string;
  subject: string;
  status: SupportTicketStatus;
  lastMessagePreview?: string;
  lastMessageDate?: string;
  unreadCount: number;
  startedByName?: string;
}

export interface ConversationMessageDto {
  messageId: number;
  content: string;
  sentDate: string;
  status: MessageStatus;
  senderId: number;
  senderName?: string;
  receiverId?: number;
  ticketId?: number;
}

export interface ConversationDetailDto extends ConversationListItemDto {
  messages: ConversationMessageDto[];
}

// ---- Announcements ----
export interface AnnouncementDto {
  announcementId: number;
  scopeType: AnnouncementScopeType;
  scopeId?: number;
  message: string;
  date: string;
  createdByUserId: number;
}

// ---- Notifications ----
export interface NotificationDto {
  notificationId: number;
  title: string;
  message: string;
  relatedEntity?: string;
  isRead: boolean;
  createdAt: string;
}

// ---- Feedback ----
export interface FeedbackCriterionDto {
  criterionId: number;
  appliesTo: FeedbackType;
  name: string;
  orderIndex: number;
}

export interface FeedbackScoreInputDto {
  criterionId: number;
  score: number;
}

export interface FeedbackSummaryDto {
  averageOverall: number;
  perCriterion: { criterionId: number; name?: string; average: number }[];
  comments: { comment: string; date: string }[];
  responseCount: number;
}

export interface FeedbackPendingDto {
  trainerRatingPending: boolean;
  batchRatingPending: boolean;
}

// ---- Badges ----
export interface BadgeDto {
  badgeId: number;
  name: string;
  description: string;
  icon: string;
  conditionType: BadgeConditionType;
  conditionValue: number;
}

export interface TraineeBadgeDto {
  traineeBadgeId: number;
  traineeId: number;
  badgeId: number;
  earnedAt: string;
  badge?: BadgeDto;
}

// ---- Audit ----
export interface AuditLogDto {
  logId?: number;
  id?: number;
  action: string;
  entityName?: string;
  entityId?: number;
  details?: string;
  timestamp?: string;
  createdAt?: string;
  userId?: number;
  userName?: string;
}

// ---- Report analytics ----
export interface ChartPointDto {
  label: string;
  value: number;
}

export interface DashboardChartsDto {
  batchesByYear: ChartPointDto[];
  tracksDistribution: ChartPointDto[];
}

export interface BatchPerformanceRowDto {
  traineeId: number;
  traineeName?: string;
  major?: string;
  attendanceRate: number;
  technicalScore: number;
  behavioralScore: number;
  finalScore: number;
  level: string;
}

export interface BatchPerformanceReportDto {
  batchId: number;
  batchName?: string;
  programName?: string;
  companyName?: string;
  avgAttendance: number;
  successRate: number;
  rows: BatchPerformanceRowDto[];
}

export interface AttendanceReportRowDto {
  traineeId: number;
  traineeName?: string;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  excusedDays: number;
  attendanceRate: number;
}

export interface AttendanceReportDto {
  batchId?: number;
  batchName?: string;
  periodStart?: string;
  periodEnd?: string;
  overallAttendanceRate: number;
  rows: AttendanceReportRowDto[];
}

export interface TrainerKpisDto {
  attendanceRate: number;
  taskCompletionRate: number;
  avgTechnicalGrade: number;
}