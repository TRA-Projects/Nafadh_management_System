using System.ComponentModel.DataAnnotations;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    // ─────────────────────────────────────────────────────────────────────
    // Course plans — Company Portal (tasks & projects) + Authority approval.
    // Additive file: nothing existing is modified.
    // ─────────────────────────────────────────────────────────────────────

    // ── Reads ────────────────────────────────────────────────────────────

    public class CoursePlansOverviewDTO
    {
        public CoursePlansCountsDTO Counts { get; set; } = new();
        public List<CoursePlanSummaryDTO> Plans { get; set; } = new();
    }

    public class CoursePlansCountsDTO
    {
        public int Total { get; set; }
        public int Draft { get; set; }
        public int PendingApproval { get; set; }
        public int Approved { get; set; }
        public int Rejected { get; set; }
        public int InProgress { get; set; }
        public int Completed { get; set; }
        public int DelayedPlans { get; set; }
    }

    public class CoursePlanSummaryDTO
    {
        public int PlanId { get; set; }
        public int CompanyId { get; set; }
        public int? ProgramId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Category { get; set; }
        public decimal DurationHours { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        public NFD_CoursePlanApprovalStatus ApprovalStatus { get; set; }
        public NFD_CoursePlanExecutionStatus ExecutionStatus { get; set; }

        public int StageCount { get; set; }
        public int ItemCount { get; set; }
        public int CompletedItems { get; set; }

        /// <summary>Weighted course completion (0–100).</summary>
        public decimal ProgressPercentage { get; set; }

        /// <summary>Share of the plan's time window already elapsed (0–100).</summary>
        public decimal ExpectedProgressPercentage { get; set; }

        public bool IsDelayed { get; set; }
        public int DelayedStages { get; set; }

        public string CreatedByName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewNote { get; set; }
        public List<CoursePlanTrainerOptionDTO> Trainers { get; set; } = new();
    }

    public class CoursePlanDetailDTO : CoursePlanSummaryDTO
    {
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }

        // What the caller may do right now (computed on the server from the workflow rules).
        public bool CanEditStructure { get; set; }
        public bool CanSubmit { get; set; }
        public bool CanWithdraw { get; set; }
        public bool CanDelete { get; set; }
        public bool CanStart { get; set; }
        public bool CanTrack { get; set; }
        public bool CanHold { get; set; }
        public bool CanResume { get; set; }

        public List<CoursePlanStageDTO> Stages { get; set; } = new();
        public List<CoursePlanNoteDTO> Notes { get; set; } = new();
    }

    public class CoursePlanStageDTO
    {
        public int StageId { get; set; }
        public int OrderIndex { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int? TrainerId { get; set; }
        public string? TrainerName { get; set; }
        public List<CoursePlanTrainerOptionDTO> Trainers { get; set; } = new();
        public NFD_CoursePlanProgressStatus Status { get; set; }
        public decimal ProgressPercentage { get; set; }
        public bool IsDelayed { get; set; }
        public int ItemCount { get; set; }
        public int CompletedItems { get; set; }
        public List<CoursePlanItemDTO> Items { get; set; } = new();
    }

    public class CoursePlanItemDTO
    {
        public int ItemId { get; set; }
        public int StageId { get; set; }
        public NFD_CoursePlanItemType ItemType { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime DueDate { get; set; }
        public NFD_TaskPriority Priority { get; set; }
        public NFD_CoursePlanProgressStatus Status { get; set; }
        public int? TrainerId { get; set; }
        public string? TrainerName { get; set; }
        public bool IsOverdue { get; set; }
    }

    public class CoursePlanNoteDTO
    {
        public int NoteId { get; set; }
        public int? StageId { get; set; }
        public int? ItemId { get; set; }

        /// <summary>Title of the stage/task the note is attached to (null = whole course).</summary>
        public string? TargetTitle { get; set; }

        public string Text { get; set; } = string.Empty;
        public string AuthorName { get; set; } = string.Empty;
        public bool IsAuthority { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CoursePlanTrainerOptionDTO
    {
        public int TrainerId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Specialty { get; set; }
    }

    public class CoursePlanProgramOptionDTO
    {
        public int ProgramId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Category { get; set; }
        public decimal DurationHours { get; set; }
        public decimal Price { get; set; }
        public int TrackId { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class CoursePlanTrackOptionDTO
    {
        public int TrackId { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class CoursePlanLookupsDTO
    {
        public List<CoursePlanTrainerOptionDTO> Trainers { get; set; } = new();
        public List<CoursePlanProgramOptionDTO> Programs { get; set; } = new();
        public List<CoursePlanTrackOptionDTO> Tracks { get; set; } = new();
        public List<string> Categories { get; set; } = new();
    }

    // ── Writes (Company) ─────────────────────────────────────────────────

    public class SaveCoursePlanDTO
    {
        /// <summary>Use an existing company program when supplied; null means create a new Program.</summary>
        public int? ProgramId { get; set; }

        /// <summary>Required only when creating a new Program manually.</summary>
        public int? TrackId { get; set; }

        public decimal Price { get; set; }

        /// <summary>Plan-level trainer assignments; can be empty and filled later.</summary>
        public List<int> TrainerIds { get; set; } = new();

        [Required(ErrorMessage = "عنوان الكورس مطلوب.")]
        [MaxLength(150, ErrorMessage = "عنوان الكورس لا يتجاوز 150 حرفاً.")]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        [MaxLength(100, ErrorMessage = "التصنيف لا يتجاوز 100 حرف.")]
        public string? Category { get; set; }

        [Range(1, 10000, ErrorMessage = "عدد الساعات يجب أن يكون بين 1 و 10000.")]
        public decimal DurationHours { get; set; }

        [Required(ErrorMessage = "تاريخ البدء مطلوب.")]
        public DateTime StartDate { get; set; }

        [Required(ErrorMessage = "تاريخ الانتهاء مطلوب.")]
        public DateTime EndDate { get; set; }
    }

    public class SetCoursePlanTrainersDTO
    {
        public List<int> TrainerIds { get; set; } = new();
    }

    public class SaveCoursePlanStageDTO
    {
        [Required(ErrorMessage = "عنوان المرحلة مطلوب.")]
        [MaxLength(150, ErrorMessage = "عنوان المرحلة لا يتجاوز 150 حرفاً.")]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required(ErrorMessage = "تاريخ بدء المرحلة مطلوب.")]
        public DateTime StartDate { get; set; }

        [Required(ErrorMessage = "تاريخ انتهاء المرحلة مطلوب.")]
        public DateTime EndDate { get; set; }

        public int? TrainerId { get; set; }

        /// <summary>Multiple trainers for the stage; empty is allowed until trainers are assigned later.</summary>
        public List<int> TrainerIds { get; set; } = new();
    }

    public class SaveCoursePlanItemDTO
    {
        [Required(ErrorMessage = "نوع العنصر مطلوب.")]
        public NFD_CoursePlanItemType ItemType { get; set; }

        [Required(ErrorMessage = "العنوان مطلوب.")]
        [MaxLength(150, ErrorMessage = "العنوان لا يتجاوز 150 حرفاً.")]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required(ErrorMessage = "الموعد النهائي مطلوب.")]
        public DateTime DueDate { get; set; }

        [Required(ErrorMessage = "الأولوية مطلوبة.")]
        public NFD_TaskPriority Priority { get; set; }

        public int? TrainerId { get; set; }
    }

    public class StartCoursePlanDTO
    {
        [Required(ErrorMessage = "ذكر سبب الشروع في الكورس مطلوب.")]
        [MaxLength(2000, ErrorMessage = "ملاحظة الشروع لا تتجاوز 2000 حرف.")]
        public string Note { get; set; } = string.Empty;
    }

    public class SetCoursePlanProgressDTO
    {
        [Required]
        public NFD_CoursePlanProgressStatus Status { get; set; }
    }

    public class AddCoursePlanNoteDTO
    {
        [Required(ErrorMessage = "نص الملاحظة مطلوب.")]
        [MaxLength(2000, ErrorMessage = "الملاحظة لا تتجاوز 2000 حرف.")]
        public string Text { get; set; } = string.Empty;

        public int? StageId { get; set; }
        public int? ItemId { get; set; }
    }

    // ── Authority approval ───────────────────────────────────────────────

    public enum CoursePlanDecision
    {
        Approve,
        Reject
    }

    public class CoursePlanDecisionDTO
    {
        [Required(ErrorMessage = "القرار مطلوب.")]
        public CoursePlanDecision Decision { get; set; }

        /// <summary>Required when rejecting; optional when approving.</summary>
        [MaxLength(2000, ErrorMessage = "الملاحظة لا تتجاوز 2000 حرف.")]
        public string? Note { get; set; }
    }
}
