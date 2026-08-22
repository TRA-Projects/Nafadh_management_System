using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    // Returned to the client
    public class EnrollmentDTO
    {
        public int EnrollmentId { get; set; }
        public DateTime EnrollmentDate { get; set; }
        public string CompletionStatus { get; set; } = string.Empty;

        public int BatchId { get; set; }
        public string BatchName { get; set; } = string.Empty;

        public int TraineeId { get; set; }
        public string TraineeName { get; set; } = string.Empty;

        public int CompanyId { get; set; }
        public string CompanyName { get; set; } = string.Empty;

        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }

        public int? SupervisorId { get; set; }
        public string? SupervisorName { get; set; }

        public string? TraineeGitHubUrl { get; set; }
        public string? TraineeLinkedInUrl { get; set; }
        public string? ProgramTitle { get; set; }
        public string? ProgramDescription { get; set; }
        public string? TrackName { get; set; }
    }

    public class CreateEnrollmentDto
    {
        public int BatchId { get; set; }
        public int TraineeId { get; set; }
        public int CompanyId { get; set; }
        public int? DepartmentId { get; set; }
        public int? SupervisorId { get; set; }
    }

    public class UpdateEnrollmentAssignmentDto
    {
        public int? DepartmentId { get; set; }
        public int? SupervisorId { get; set; }
    }

    public class UpdateEnrollmentStatusDto
    {
        public NFD_EnrollmentCompletionStatus CompletionStatus { get; set; }
    }

    public class EnrollmentFilterDto
    {
        public int? BatchId { get; set; }
        public int? TraineeId { get; set; }
        public int? CompanyId { get; set; }
        public NFD_EnrollmentCompletionStatus? Status { get; set; }
    }

    public class ProgressSummaryDto
    {
        public int EnrollmentId { get; set; }
        public int TotalModules { get; set; }
        public int CompletedModules { get; set; }
        public double ProgressPercentage { get; set; }
    }
}