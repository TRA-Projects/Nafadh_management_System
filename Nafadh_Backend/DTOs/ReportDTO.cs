using Nafadh_Backend.Enums;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class ReportDTO
    {
        public class ReportInputDTO
        {
            public NFD_ReportType Type { get; set; }

            public string? FiltersJson { get; set; }
            [MaxLength(300)]
            public string? FileUrl { get; set; }

            public int GeneratedByUserId { get; set; }
        }
        public class ReportOutputDTO
        {
            public int ReportId { get; set; }

            public NFD_ReportType Type { get; set; }

            public string? FiltersJson { get; set; }

            public DateTime GeneratedAt { get; set; }

            public string? FileUrl { get; set; }

            public int GeneratedByUserId { get; set; }
        }

    }
}
