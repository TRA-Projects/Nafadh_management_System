namespace Nafadh_Backend.DTOs
{
    /// <summary>
    /// Read-only Company Portal summary for a program linked to a company.
    /// Additive contract: other portals do not consume this DTO.
    /// </summary>
    public class CompanyProgramSummaryDTO
    {
        public int ProgramId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Category { get; set; }
        public decimal DurationHours { get; set; }
        public decimal Price { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool ApprovedForCompany { get; set; }
        public int BatchCount { get; set; }
        public int EnrollmentCount { get; set; }
        public int CurrentTraineeCount { get; set; }
        public decimal AllocatedCapacity { get; set; }
        public int UsedCapacity { get; set; }
        public int RemainingCapacity { get; set; }
        public decimal UtilizationPercentage { get; set; }

        // ── Seats in OPEN batches (not cancelled, not yet ended) ──────────
        // The open batches are those linked to this company; seats are shared
        // within each linked batch, so occupancy includes every participant in it. The older
        // AllocatedCapacity/UsedCapacity/... fields above are kept unchanged
        // for backward compatibility.
        public decimal OpenSeatCapacity { get; set; }
        public int OpenSeatOccupied { get; set; }
        public int OpenSeatRemaining { get; set; }
        public decimal OpenSeatUtilizationPercentage { get; set; }

        public List<string> Departments { get; set; } = new();
    }

    /// <summary>
    /// Full read-only Company Portal details for one company/program pair.
    /// All values are sourced from the database; the frontend does not infer business data.
    /// </summary>
    public sealed class CompanyProgramDetailsDTO : CompanyProgramSummaryDTO
    {
        public List<CompanyProgramBatchDTO> Batches { get; set; } = new();
        public List<CompanyProgramEnrollmentDTO> Enrollments { get; set; } = new();
        public List<CompanyProgramModuleDTO> Modules { get; set; } = new();
    }

    public sealed class CompanyProgramBatchDTO
    {
        public int BatchId { get; set; }
        public string BatchName { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal Capacity { get; set; }
        public int CompanyEnrollmentCount { get; set; }
        public string Status { get; set; } = string.Empty;

        // Batch-owned evaluation parameters configured by Admin; no Company-side computation.
        public decimal AttendanceWeight { get; set; }
        public decimal QuizzesWeight { get; set; }
        public decimal TasksWeight { get; set; }
        public decimal ProjectsWeight { get; set; }
        public decimal ExcellentMinScore { get; set; }
        public decimal ExcellentMinAttendance { get; set; }
        public decimal VeryGoodMinScore { get; set; }
        public decimal VeryGoodMinAttendance { get; set; }
        public decimal GoodMinScore { get; set; }
        public decimal AtRiskMinAttendance { get; set; }

        public List<CompanyProgramTrainerAssignmentDTO> Trainers { get; set; } = new();
        public List<CompanyProgramPlanDTO> Plans { get; set; } = new();
    }

    // Each assignment retains its own scope: a stage trainer is NOT a whole-plan trainer.
    public sealed class CompanyProgramTrainerAssignmentDTO
    {
        public int TrainerId { get; set; }
        public string TrainerName { get; set; } = string.Empty;
        public string Scope { get; set; } = string.Empty; // Batch, Plan, Stage or Item
        public int? PlanId { get; set; }
        public int? StageId { get; set; }
        public int? ItemId { get; set; }
        public string? StageTitle { get; set; }
        public string? ItemTitle { get; set; }
    }

    public sealed class CompanyProgramPlanDTO
    {
        public int PlanId { get; set; }
        public string Title { get; set; } = string.Empty;
        public decimal DurationHours { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string ApprovalStatus { get; set; } = string.Empty;
        public string ExecutionStatus { get; set; } = string.Empty;
        public List<CompanyProgramStageDTO> Stages { get; set; } = new();
    }

    public sealed class CompanyProgramStageDTO
    {
        public int StageId { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Status { get; set; } = string.Empty;
        // No fictitious stage hours: the existing schema stores dates, not hours per stage.
        public List<CompanyProgramTrainerAssignmentDTO> Trainers { get; set; } = new();
    }

    public sealed class CompanyProgramEnrollmentDTO
    {
        public int EnrollmentId { get; set; }
        public int TraineeId { get; set; }
        public string TraineeName { get; set; } = string.Empty;
        public string? DepartmentName { get; set; }
        public string? SupervisorName { get; set; }
        public string BatchName { get; set; } = string.Empty;
        public string CompletionStatus { get; set; } = string.Empty;
        public string? TraineeGitHubUrl { get; set; }
        public string? TraineeLinkedInUrl { get; set; }

        /// <summary>Completed modules / all modules of the program (0–100).</summary>
        public double ProgressPercentage { get; set; }
    }

    public sealed class CompanyProgramModuleDTO
    {
        public int ModuleId { get; set; }
        public string Title { get; set; } = string.Empty;
        public decimal OrderIndex { get; set; }
        public int? PrerequisiteModuleId { get; set; }
    }
}
