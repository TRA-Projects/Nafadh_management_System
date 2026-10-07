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

        [MaxLength(100, ErrorMessage = "Governorate cannot exceed 100 characters.")]
        public string? Governorate { get; set; }   // المحافظة

        [MaxLength(100, ErrorMessage = "Wilaya cannot exceed 100 characters.")]
        public string? Wilaya { get; set; }        // الولاية

        [MaxLength(100, ErrorMessage = "Village cannot exceed 100 characters.")]
        public string? Village { get; set; }       // القرية / المنطقة



        [MaxLength(150, ErrorMessage = "BankName cannot exceed 150 characters.")]
        public string? BankName { get; set; }              // اسم البنك

        [MaxLength(150, ErrorMessage = "AccountHolderName cannot exceed 150 characters.")]
        public string? AccountHolderName { get; set; }     // اسم صاحب الحساب

        [MaxLength(50, ErrorMessage = "AccountNumber cannot exceed 50 characters.")]
        public string? AccountNumber { get; set; }         // رقم الحساب

        [MaxLength(50, ErrorMessage = "IBAN cannot exceed 50 characters.")]
        public string? IBAN { get; set; }                  // IBAN

        [MaxLength(150, ErrorMessage = "BankBranch cannot exceed 150 characters.")]
        public string? BankBranch { get; set; }            // الفرع
        [MaxLength(50)]
        public string? AcademicLevel { get; set; }
    }
}

