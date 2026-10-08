using System.ComponentModel.DataAnnotations;
using Nafadh_Backend.Enums;
using System.Collections.Generic;

namespace Nafadh_Backend.DTOs
{
    // =========================================================================
    // 1. Input DTO (بيانات الإدخال عند إضافة أو تعديل شركة)
    // =========================================================================
    public class NFD_CompanyInputDTO
    {
        [Required]
        [MaxLength(150)]
        public string CompanyName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? CommercialRegister { get; set; }

        [MaxLength(100)]
        public string? WorkField { get; set; }

        [MaxLength(100)]
        public string? City { get; set; } // أضفنا المدينة

        [MaxLength(250)]
        public string? Address { get; set; }

        [MaxLength(20)]
        public string? Phone { get; set; }

        [MaxLength(150)]
        public string? Email { get; set; }

        [MaxLength(300)]
        public string? Logo { get; set; }

        public decimal Capacity { get; set; }

        public NFD_CompanyStatus Status { get; set; }

        public DateTime? ApprovalDate { get; set; }

        public int? UserId { get; set; }

        public string? RejectionReason { get; set; } // أضفنا سبب الرفض
    }

    // =========================================================================
    // 2. Output DTO (بيانات الإخراج التي تذهب للفرونت إند)
    // =========================================================================
    public class NFD_CompanyOutputDTO
    {
        public int CompanyId { get; set; }

        public string CompanyName { get; set; } = string.Empty;

        public string? CommercialRegister { get; set; }

        public string? WorkField { get; set; }

        public string? City { get; set; } // المدينة للفلترة

        public string? Address { get; set; }

        public string? Phone { get; set; }

        public string? Email { get; set; }

        public string? Logo { get; set; }

        public decimal Capacity { get; set; }

        public NFD_CompanyStatus Status { get; set; }

        public DateTime? ApprovalDate { get; set; }

        public int? UserId { get; set; }

        // الخصائص للأعداد الحقيقية:
        public int ProgramsCount { get; set; }
        public int BatchesCount { get; set; }
        public int TraineesCount { get; set; }

        // الخصائص الإضافية لصفحة التفاصيل والرفض:
        public string? RejectionReason { get; set; } // سبب الرفض
        public decimal? RatingScore { get; set; }    // تقييم الشركة (مثلاً: 4.9)
        public string? Notes { get; set; }          // ملاحظات الإدارة
        public int? EstablishedYear { get; set; }   // سنة التأسيس
        public DateTime? ContractStartDate { get; set; } // تاريخ العقد

        // المجموعات المرتبطة:
        public List<NFD_CompanyBranchOutputDTO> Branches { get; set; } = new();
        public List<CompanySupervisorDto> Supervisors { get; set; } = new();
        public List<NFD_CompanyProgramOutputDTO> Programs { get; set; } = new();
        public List<CompanyPayment.CompanyPaymentResponseDto> Payments { get; set; } = new();
        public List<DepartmentDto> Departments { get; set; } = new();
    }
}