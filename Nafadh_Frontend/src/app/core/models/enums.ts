// Mirrors Nafadh_Backend/Enums/NFD_Enums.cs exactly — the backend serializes
// enums as strings (JsonStringEnumConverter), so these string unions match the
// literal C# enum member names, in the same declared order.

export type UserStatus = 'Active' | 'Inactive' | 'Suspended' | 'PendingVerification';
// Matches the exact RoleName strings seeded in NFD_Roles — note the company
// portal's role is literally named "CompanySupervisor" in the database, not
// "Company" (confirmed against DataSeed_Script.sql's Roles insert).
export type RoleName = 'Admin' | 'Trainer' | 'CompanySupervisor' | 'Trainee';

export type CompanyStatus = 'PendingApproval' | 'Approved' | 'Suspended' | 'Rejected';
export type TrainerStatus = 'Active' | 'Inactive' | 'Suspended';

// Canonical 3-value status (post-upgrade) — see NFD_Enums.cs
export type TraineeStatus = 'NotAssigned' | 'InTraining' | 'Completed';
export type VerificationStatus = 'Pending' | 'Verified' | 'Rejected';

export type TrackStatus = 'Active' | 'Archived';
export type ProgramStatus = 'Draft' | 'Published' | 'Archived';
export type BatchStatus = 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';
export type EnrollmentCompletionStatus = 'InProgress' | 'Completed' | 'Dropped' | 'Failed';
export type ModuleProgressStatus = 'NotStarted' | 'InProgress' | 'Completed';
export type SessionStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'Postponed';

// Stored set includes Excused; the daily-attendance-taking UI restricts the
// manually-pickable options to the first three (see ATTENDANCE_PICKABLE_STATUSES).
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';
export const ATTENDANCE_PICKABLE_STATUSES: AttendanceStatus[] = ['Present', 'Late', 'Absent'];

export type ExcuseStatus = 'Pending' | 'Approved' | 'Rejected';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskStatus = 'Open' | 'Closed' | 'Overdue';
export type SubmissionStatus = 'Submitted' | 'UnderReview' | 'Graded' | 'ReturnedForRevision' | 'Late';
export type ProjectStatus = 'Planned' | 'InProgress' | 'Completed' | 'Cancelled';
export type ProjectMemberRole = 'Lead' | 'Contributor';

export type EvaluationType = 'Technical' | 'Behavioral' | 'CompanyEvaluation' | 'Final' | 'TrainerPerformance';
export type EvaluationPeriod = 'Weekly' | 'Monthly' | 'Midterm' | 'Final' | 'AdHoc';

export type WarningType = 'Attendance' | 'Performance' | 'Behavioral' | 'Other';
export type WarningLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type WarningStatus = 'Open' | 'UnderReview' | 'Resolved' | 'Escalated';
export type WarningScope = 'Company' | 'Trainee';

export type SupportTicketStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';
export type ConversationType = 'CompanyThread' | 'TraineeComplaint' | 'Other';

export type AnnouncementScopeType = 'Platform' | 'Company' | 'Batch';
export type MessageStatus = 'Sent' | 'Delivered' | 'Read';
export type CertificateType = 'Completion' | 'Recommendation' | 'Excellence';
export type ReportType = 'Attendance' | 'Performance' | 'Financial' | 'Enrollment' | 'Custom';
export type PaymentStatus = 'Pending' | 'PartiallyPaid' | 'Paid' | 'Overdue' | 'Cancelled';
export type PaymentScheduleStatus = 'Pending' | 'Paid' | 'Overdue';
export type FileType = 'Pdf' | 'Video' | 'Image' | 'Document' | 'Link' | 'Other';
export type SupervisorStatus = 'Active' | 'Inactive' | 'Suspended';

export type FeedbackType = 'TrainerRating' | 'BatchExperienceRating';
export type BadgeConditionType =
  | 'ModulesCompletedInPeriod'
  | 'AttendanceStreak'
  | 'HighScoreCount'
  | 'ProjectCompletion'
  | 'ProgramCompletion';

// Arabic display-label lookups shared across all portals (kept here so every
// portal's page renders the exact same label for the exact same status).
export const TRAINEE_STATUS_LABELS: Record<TraineeStatus, string> = {
  NotAssigned: 'لم يُوزَّع بعد',
  InTraining: 'قيد التدريب',
  Completed: 'مكتمل',
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  Present: 'حاضر',
  Late: 'متأخر',
  Absent: 'غائب',
  Excused: 'معذور',
};

export const WARNING_LEVEL_LABELS: Record<WarningLevel, string> = {
  Low: 'منخفض',
  Medium: 'متوسط',
  High: 'مرتفع',
  Critical: 'حرج',
};
