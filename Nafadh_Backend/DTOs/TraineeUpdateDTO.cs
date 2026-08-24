using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class TraineeUpdateDto
    {

        [Required]
        [EmailAddress]
        [MaxLength(150, ErrorMessage = "Email cannot exceed 150 characters.")]
        public string Email { get; set; } = string.Empty;

        [MaxLength(20, ErrorMessage = "Phone cannot exceed 20 characters.")]
        public string? Phone { get; set; }

        public string? Skills { get; set; }

        [MaxLength(300, ErrorMessage = "ResumeUrl cannot exceed 300 characters.")]
        public string? ResumeUrl { get; set; }

        [MaxLength(300, ErrorMessage = "GitHubUrl cannot exceed 300 characters.")]
        public string? GitHubUrl { get; set; }

        [MaxLength(300, ErrorMessage = "LinkedInUrl cannot exceed 300 characters.")]
        public string? LinkedInUrl { get; set; }
    }
}

