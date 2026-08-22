
using System.ComponentModel.DataAnnotations;
using Nafadh_Backend.Enums;
using System.Collections.Generic;

namespace Nafadh_Backend.DTOs
{
    // Input DTO
    public class NFD_CompanyInputDTO
    {
        [Required]
        [MaxLength(150)]
        public string CompanyName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? CommercialRegister { get; set; }

        [MaxLength(100)]
        public string? WorkField { get; set; }

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
    }


    // Output DTO
    public class NFD_CompanyOutputDTO
    {
        public int CompanyId { get; set; }

        public string CompanyName { get; set; } = string.Empty;

        public string? CommercialRegister { get; set; }

        public string? WorkField { get; set; }

        public string? Address { get; set; }

        public string? Phone { get; set; }

        public string? Email { get; set; }

        public string? Logo { get; set; }

        public decimal Capacity { get; set; }

        public NFD_CompanyStatus Status { get; set; }

        public DateTime? ApprovalDate { get; set; }

        public int? UserId { get; set; }

        //   الخصائص للأعداد الحقيقية:
        public int ProgramsCount { get; set; }
        public int BatchesCount { get; set; }
        public int TraineesCount { get; set; }
  

        // Related collections provided for frontend convenience
        public List<NFD_CompanyBranchOutputDTO> Branches { get; set; } = new();
        public List<CompanySupervisorDto> Supervisors { get; set; } = new();
        public List<NFD_CompanyProgramOutputDTO> Programs { get; set; } = new();
        public List<CompanyPayment.CompanyPaymentResponseDto> Payments { get; set; } = new();
        public List<DepartmentDto> Departments { get; set; } = new();

    }
}
