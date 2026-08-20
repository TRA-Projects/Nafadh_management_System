using Nafadh_Backend.Enums;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{

    public class ReportInputDTO
    {
        public NFD_ReportType Type { get; set; }

        public string? FiltersJson { get; set; }

        public int GeneratedByUserId { get; set; }

        public int? TrainerId { get; set; }
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

    public class TrainerTraineesReportInputDto
    {
        [Required]
        public int TrainerId { get; set; }

        public int? BatchId { get; set; }

        [Required]
        public int GeneratedByUserId { get; set; }
    }
    public class TrainerTraineesReportRowDto
    {
        public int EnrollmentId { get; set; }

        public int TraineeId { get; set; }

        public string? TraineeName { get; set; }

        public int BatchId { get; set; }

        public string? BatchName { get; set; }

        public double AttendancePercentage { get; set; }

        public decimal AverageScore { get; set; }

        public string TechnicalLevel { get; set; } = string.Empty;
    }
}

