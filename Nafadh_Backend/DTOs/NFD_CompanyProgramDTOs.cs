using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    // Input DTO
    public class NFD_CompanyProgramInputDTO
    {
        [Required]
        public int CompanyId { get; set; }

        [Required]
        public int ProgramId { get; set; }
    }

    // Output DTO
    public class NFD_CompanyProgramOutputDTO
    {
        public int CompanyId { get; set; }

        public int ProgramId { get; set; }
    }
}