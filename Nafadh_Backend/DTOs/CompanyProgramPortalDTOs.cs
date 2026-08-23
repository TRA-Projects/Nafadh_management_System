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
    }

    public sealed class CompanyProgramModuleDTO
    {
        public int ModuleId { get; set; }
        public string Title { get; set; } = string.Empty;
        public decimal OrderIndex { get; set; }
        public int? PrerequisiteModuleId { get; set; }
    }
}
