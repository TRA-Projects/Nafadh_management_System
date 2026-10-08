using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    /// <summary>
    /// DTO for returning the trainee profile with all details.
    /// Includes personal, contact, academic, address,
    /// and banking information.
    /// </summary>
    public class TraineeProfileDto
    {
        // =====================================================
        // IDENTIFICATION
        // =====================================================

        public int TraineeId { get; set; }

        // =====================================================
        // USER INFORMATION
        // =====================================================

        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }

        // =====================================================
        // TRAINEE INFORMATION
        // =====================================================

        public int NationalId { get; set; }
        public string? University { get; set; }
        public string? Major { get; set; }
        public string? AcademicLevel { get; set; }
        public string? Skills { get; set; }
        public string? ResumeUrl { get; set; }
        public string? GitHubUrl { get; set; }
        public string? LinkedInUrl { get; set; }
        public string? ProfileImageUrl { get; set; }
        public string? CvFileName { get; set; }

        // =====================================================
        // ADDRESS INFORMATION  (NEW)
        // =====================================================

        public string? Governorate { get; set; }   // المحافظة
        public string? Wilaya { get; set; }        // الولاية
        public string? Village { get; set; }       // القرية / المنطقة

        // =====================================================
        // BANK ACCOUNT INFORMATION  (NEW)
        // =====================================================

        public string? BankName { get; set; }              // اسم البنك
        public string? AccountHolderName { get; set; }     // اسم صاحب الحساب
        public string? AccountNumber { get; set; }         // رقم الحساب
        public string? IBAN { get; set; }                  // IBAN
        public string? BankBranch { get; set; }            // الفرع

        // =====================================================
        // STATUS & RELATIONS
        // =====================================================

        public NFD_TraineeStatus Status { get; set; }
        public NFD_VerificationStatus VerificationStatus { get; set; }
        public int? CompanyId { get; set; }
        public string? CompanyName { get; set; }
        public int EnrollmentId { get; set; }
    }
}