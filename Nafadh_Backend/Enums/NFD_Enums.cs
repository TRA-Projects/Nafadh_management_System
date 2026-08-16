

namespace Nafadh_Backend.Enums
{
    public enum NFD_UserStatus
    {
        Active, Inactive, Suspended, PendingVerification
    }

    public enum NFD_CompanyStatus
    {
        PendingApproval, Approved, Suspended, Rejected
    }

    public enum NFD_TrainerStatus
    {
        Active, Inactive, Suspended
    }

    public enum NFD_TraineeStatus
    {
        // Finalized canonical status (3 stored values) — "تأخر متكرر" (repeated lateness)
        // is a computed/derived flag, not a stored status, per project decision.
        // NOTE: this replaces the previous Active/Graduated/Dropped/Suspended set.
        // Existing seeded rows are corrected by DataFix_TraineeStatusAndExtras.sql.
        NotAssigned, InTraining, Completed
    }

    public enum NFD_VerificationStatus
    {
        // Bundled verification of national ID + phone + email as one status,
        // rather than three separate flags (per finalized decision).
        Pending, Verified, Rejected
    }

    public enum NFD_TrackStatus
    {
        Active, Archived
    }

    public enum NFD_ProgramStatus
    {
        Draft, Published, Archived
    }

    public enum NFD_BatchStatus
    {
        Upcoming, Ongoing, Completed, Cancelled
    }

    public enum NFD_EnrollmentCompletionStatus
    {
        InProgress, Completed, Dropped, Failed
    }

    public enum NFD_ModuleProgressStatus
    {
        NotStarted, InProgress, Completed
    }

    public enum NFD_SessionStatus
    {
        Scheduled, Completed, Cancelled, Postponed
    }

    public enum NFD_AttendanceStatus
    {
        Present, Absent, Late, Excused
    }

    public enum NFD_ExcuseStatus
    {
        Pending, Approved, Rejected
    }

    public enum NFD_TaskPriority
    {
        Low, Medium, High, Critical
    }

    public enum NFD_TaskStatus
    {
        Open, Closed, Overdue
    }

    public enum NFD_SubmissionStatus
    {
        Submitted, UnderReview, Graded, ReturnedForRevision, Late
    }

    public enum NFD_ProjectStatus
    {
        Planned, InProgress, Completed, Cancelled
    }

    public enum NFD_ProjectMemberRole
    {
        Lead, Contributor
    }

    public enum NFD_EvaluationType
    {
        Technical, Behavioral, CompanyEvaluation, Final, TrainerPerformance
    }

    public enum NFD_EvaluationPeriod
    {
        Weekly, Monthly, Midterm, Final, AdHoc
    }

    public enum NFD_WarningType
    {
        Attendance, Performance, Behavioral, Other
    }

    public enum NFD_WarningLevel
    {
        Low, Medium, High, Critical
    }

    public enum NFD_WarningStatus
    {
        Open, UnderReview, Resolved, Escalated
    }

    public enum NFD_SupportTicketStatus
    {
        Open, InProgress, Resolved, Closed
    }

    public enum NFD_ConversationType
    {
        // Discriminates the two conversation kinds surfaced in the Admin
        // Communications hub. "Other" is a fallback bucket for legacy/edge-case
        // tickets that don't cleanly fit either (e.g. pre-existing seed data),
        // so nothing is force-miscategorized into the wrong tab.
        CompanyThread, TraineeComplaint, Other
    }

    public enum NFD_WarningScope
    {
        // Discriminates whether a Warning targets a Company (compliance-style,
        // CompanyId set, EnrollmentId null) or a Trainee (EnrollmentId set,
        // CompanyId null) — one polymorphic entity per finalized decision.
        Company, Trainee
    }

    public enum NFD_AnnouncementScopeType
    {
        Platform, Company, Batch
    }

    public enum NFD_MessageStatus
    {
        Sent, Delivered, Read
    }

    public enum NFD_CertificateType
    {
        Completion, Recommendation, Excellence
    }

    public enum NFD_ReportType
    {
        Attendance, Performance, Financial, Enrollment, Custom
    }

    public enum NFD_PaymentStatus
    {
        Pending, PartiallyPaid, Paid, Overdue, Cancelled
    }

    public enum NFD_PaymentScheduleStatus
    {
        Pending, Paid, Overdue
    }

    public enum NFD_FileType
    {
        Pdf, Video, Image, Document, Link, Other
    }

    public enum NFD_SupervisorStatus
    {
        Active, Inactive, Suspended
    }

    public enum NFD_FeedbackType
    {
        // Two separate rating flows, each with its own fixed criteria set and
        // its own view — never combined into one score, per finalized decision.
        TrainerRating, BatchExperienceRating
    }

    public enum NFD_BadgeConditionType
    {
        // Fixed, system-wide badge catalog — automatically evaluated and granted
        // server-side (see BadgeEvaluationService), never manually awarded.
        ModulesCompletedInPeriod, AttendanceStreak, HighScoreCount, ProjectCompletion, ProgramCompletion
    }
    //
}