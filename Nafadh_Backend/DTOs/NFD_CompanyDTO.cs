
using System.ComponentModel.DataAnnotations;
using Nafadh_Backend.Enums;

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

        [Required]
        public int UserId { get; set; }
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

        public int UserId { get; set; }
    }
}
