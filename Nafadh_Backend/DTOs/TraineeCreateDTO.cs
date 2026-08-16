using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class TraineeCreateDTO
    {
        // Id of the existing user account this trainee profile belongs to
        [Required(ErrorMessage = "UserId is required.")]
        public int UserId { get; set; }

        // Trainee's national identification number
        [Required(ErrorMessage = "NationalId is required.")]
        public int NationalId { get; set; }

        // Trainee's university/institution name
        [MaxLength(150, ErrorMessage = "University cannot exceed 150 characters.")]
        public string? University { get; set; }

        // Trainee's field of study
        [MaxLength(100, ErrorMessage = "Major cannot exceed 100 characters.")]
        public string? Major { get; set; }

        // Trainee's academic level (e.g. Undergraduate, Graduate)
        [MaxLength(50, ErrorMessage = "AcademicLevel cannot exceed 50 characters.")]
        public string? AcademicLevel { get; set; }

        // Comma-separated or free-text list of the trainee's skills
        public string? Skills { get; set; }

        // Link to the trainee's uploaded resume file
        [MaxLength(300, ErrorMessage = "ResumeUrl cannot exceed 300 characters.")]
        public string? ResumeUrl { get; set; }

        // NEW: professional profile links
        [MaxLength(300, ErrorMessage = "GitHubUrl cannot exceed 300 characters.")]
        public string? GitHubUrl { get; set; }

        [MaxLength(300, ErrorMessage = "LinkedInUrl cannot exceed 300 characters.")]
        public string? LinkedInUrl { get; set; }
    }
}
