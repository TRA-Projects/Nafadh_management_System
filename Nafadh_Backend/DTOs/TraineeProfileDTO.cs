using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class TraineeProfileDto
    {
        // Unique identifier of the trainee profile
        public int TraineeId { get; set; }

        // Trainee's display name
        public string? FullName { get; set; } = string.Empty;

        // Trainee's email address
        public string? Email { get; set; } = string.Empty;

        // Trainee's national identification number
        public int NationalId { get; set; }

        // Trainee's university/institution name
        public string? University { get; set; }

        // Trainee's field of study
        public string? Major { get; set; }

        // Trainee's academic level
        public string? AcademicLevel { get; set; }

        // Trainee's listed skills
        public string? Skills { get; set; }

        // Link to the trainee's resume file
        public string? ResumeUrl { get; set; }

        // NEW: professional profile links
        public string? GitHubUrl { get; set; }
        public string? LinkedInUrl { get; set; }

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
    }
}
