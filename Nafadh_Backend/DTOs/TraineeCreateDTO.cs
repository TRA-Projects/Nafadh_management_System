using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class TraineeCreateDTO
    {
        // =====================================================
        // USER INFORMATION
        // =====================================================

        [Required(ErrorMessage = "Full Name is required.")]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Invalid Email Address.")]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        // =====================================================
        // TRAINEE INFORMATION
        // =====================================================

        [Required(ErrorMessage = "NationalId is required.")]
        public int NationalId { get; set; }

        [MaxLength(150, ErrorMessage = "University cannot exceed 150 characters.")]
        public string? University { get; set; }

        [MaxLength(100, ErrorMessage = "Major cannot exceed 100 characters.")]
        public string? Major { get; set; }

        [MaxLength(50, ErrorMessage = "AcademicLevel cannot exceed 50 characters.")]
        public string? AcademicLevel { get; set; }

        //public string? Skills { get; set; }

        [MaxLength(300, ErrorMessage = "ResumeUrl cannot exceed 300 characters.")]
        public string? ResumeUrl { get; set; }

        [MaxLength(300, ErrorMessage = "GitHubUrl cannot exceed 300 characters.")]
        public string? GitHubUrl { get; set; }

        [MaxLength(300, ErrorMessage = "LinkedInUrl cannot exceed 300 characters.")]
        public string? LinkedInUrl { get; set; }

        // =====================================================
        // ADDRESS INFORMATION  (NEW)
        // =====================================================

        [MaxLength(100, ErrorMessage = "Governorate cannot exceed 100 characters.")]
        public string? Governorate { get; set; }   // المحافظة

        [MaxLength(100, ErrorMessage = "Wilaya cannot exceed 100 characters.")]
        public string? Wilaya { get; set; }        // الولاية

        [MaxLength(100, ErrorMessage = "Village cannot exceed 100 characters.")]
        public string? Village { get; set; }       // القرية / المنطقة

        // =====================================================
        // BANK ACCOUNT INFORMATION  (NEW)
        // =====================================================

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
    }
}