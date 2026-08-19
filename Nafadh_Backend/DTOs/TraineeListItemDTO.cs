using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class TraineeListItemDto
    {
        // Unique identifier of the trainee profile
        public int TraineeId { get; set; }

        // Trainee's display name (from the linked user account)
        public string? FullName { get; set; } = string.Empty;

        // Trainee's university/institution name
        public string? University { get; set; }

        // Trainee's field of study
        public string? Major { get; set; }

        // Current trainee status
        public NFD_TraineeStatus Status { get; set; }

        // NEW: identity verification status
        public NFD_VerificationStatus VerificationStatus { get; set; }

        // Id of the host company the trainee is placed with, if any
        public int? CompanyId { get; set; }

        // Name of the host company, if assigned
        public string? CompanyName { get; set; }

        public int EnrollmentId { get; set; }
        public string? FileUrl { get; set; }
        public string? ProgramName { get; set; }
    }
}
