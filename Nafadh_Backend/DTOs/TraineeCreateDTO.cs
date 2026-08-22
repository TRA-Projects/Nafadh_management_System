using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class TraineeCreateDTO
    {
        // بيانات حساب المستخدم الجديد
        [Required(ErrorMessage = "Full Name is required.")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Invalid Email Address.")]
        public string Email { get; set; } = string.Empty;

        // بيانات المتدرب
        [Required(ErrorMessage = "NationalId is required.")]
        public int NationalId { get; set; }

        [MaxLength(150, ErrorMessage = "University cannot exceed 150 characters.")]
        public string? University { get; set; }

        [MaxLength(100, ErrorMessage = "Major cannot exceed 100 characters.")]
        public string? Major { get; set; }

        [MaxLength(50, ErrorMessage = "AcademicLevel cannot exceed 50 characters.")]
        public string? AcademicLevel { get; set; }

        public string? Skills { get; set; }

        [MaxLength(300, ErrorMessage = "ResumeUrl cannot exceed 300 characters.")]
        public string? ResumeUrl { get; set; }

        [MaxLength(300, ErrorMessage = "GitHubUrl cannot exceed 300 characters.")]
        public string? GitHubUrl { get; set; }

        [MaxLength(300, ErrorMessage = "LinkedInUrl cannot exceed 300 characters.")]
        public string? LinkedInUrl { get; set; }
    }
}