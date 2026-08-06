using Nafadh_Backend.Enums;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class ProgramDTO
    {
        // POST /api/Program
        public class CreateProgramDto
        {
            [Required]
            [MaxLength(150)]
            public string Title { get; set; } = string.Empty;
            public string? Description { get; set; }
            [MaxLength(100)]
            public string? Category { get; set; }
            public decimal DurationHours { get; set; }
            public decimal Price { get; set; }
            public int TrackId { get; set; }
        }

        // PUT /api/Program/{id}
        public class UpdateProgramDto
        {
            public string Title { get; set; } = string.Empty;
            public string? Description { get; set; }
            public string? Category { get; set; }
            public decimal DurationHours { get; set; }
            public decimal Price { get; set; }
            public NFD_ProgramStatus Status { get; set; }
        }

        // GET /api/Program?trackId=&status=&category=  (all filters optional)
        public class ProgramFilterDto
        {
            public int? TrackId { get; set; }
            public NFD_ProgramStatus? Status { get; set; }
            public string? Category { get; set; }
        }

        // GET /api/Program/{id}/batches
        public class BatchSummaryDto
        {
            public int BatchId { get; set; }
            public string BatchName { get; set; } = string.Empty;
            public DateTime StartDate { get; set; }
            public DateTime EndDate { get; set; }
            public string Status { get; set; } = string.Empty;
        }

        // GET /api/Program/{id}/modules
        public class ModuleSummaryDto
        {
            public int ModuleId { get; set; }
            public string Title { get; set; } = string.Empty;
            public decimal OrderIndex { get; set; }
            public int? PrerequisiteModuleId { get; set; }
        }

        // GET /api/Program/{id}/eligible-companies
        public class EligibleCompanyDto
        {
            public int CompanyId { get; set; }
            public string CompanyName { get; set; } = string.Empty;
            public string? WorkField { get; set; }
            public string Status { get; set; } = string.Empty;
        }
    }
}