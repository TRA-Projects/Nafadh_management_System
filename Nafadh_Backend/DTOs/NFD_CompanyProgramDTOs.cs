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

        // الحقول الحقيقية المفقودة سابقاً — كانت الواجهة تعوّض عنها ببيانات وهمية
        public string? Title { get; set; }
        public string? Track { get; set; }
        public int BatchesCount { get; set; }
        public int TraineesCount { get; set; }

        public List<NFD_CompanyProgramBatchDTO> Batches { get; set; } = new();
    }

    // Real batch data for a company's program, used by the admin Reports screen
    public class NFD_CompanyProgramBatchDTO
    {
        public int BatchId { get; set; }
        public string BatchName { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int TraineesCount { get; set; }
    }
}