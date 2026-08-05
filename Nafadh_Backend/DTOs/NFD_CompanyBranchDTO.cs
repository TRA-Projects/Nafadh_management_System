using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    // Input DTO
    public class NFD_CompanyBranchInputDTO
    {
        [Required]
        [MaxLength(200)]
        public string Location { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? ContactPoint { get; set; }

        [Required]
        public int CompanyId { get; set; }
    }

    // Output DTO
    public class NFD_CompanyBranchOutputDTO
    {
        public int BranchId { get; set; }

        public string Location { get; set; } = string.Empty;

        public string? ContactPoint { get; set; }

        public int CompanyId { get; set; }
    }
}