using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    // =========================================================================
    // Public self-registration of a new company (no account yet).
    // Fields mirror what the Admin "Add Company" form / NFD_Company hold, plus
    // the contact person who becomes the company's first supervisor account.
    // NOTE: there is deliberately NO RoleId and NO Password here — the role is
    // forced server-side and the password is generated on approval.
    // =========================================================================
    public class CompanyRegistrationDTO
    {
        [Required]
        [MaxLength(150)]
        public string CompanyName { get; set; } = string.Empty;

        // السجل التجاري
        [Required]
        [MaxLength(50)]
        public string CommercialRegister { get; set; } = string.Empty;

        // مجال العمل
        [Required]
        [MaxLength(100)]
        public string WorkField { get; set; } = string.Empty;

        [MaxLength(250)]
        public string? Address { get; set; }

        // الطاقة الاستيعابية (عدد المتدربين المتوقع)
        [Range(0, 100000)]
        public decimal Capacity { get; set; }

        // اسم المسؤول (يصبح صاحب حساب الشركة)
        [Required]
        [MaxLength(150)]
        public string ContactName { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? Phone { get; set; }

        // بريد الشركة = بريد تسجيل الدخول، ويصله عليه قرار الاعتماد
        [Required]
        [EmailAddress]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(300)]
        public string? Logo { get; set; }
    }

    public class CompanyRegistrationResultDTO
    {
        public int CompanyId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;

        // دائماً PendingApproval بعد التسجيل
        public string Status { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}
