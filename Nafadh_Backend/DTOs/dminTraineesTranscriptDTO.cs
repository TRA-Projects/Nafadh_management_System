using System.Collections.Generic;

namespace Nafadh_Backend.DTOs
{
    public class AdminTraineeTranscriptRowDTO
    {
        public int EnrollmentId { get; set; }
        public int TraineeId { get; set; }
        public string? TraineeName { get; set; }
        public string? Major { get; set; }

        public int BatchId { get; set; }
        public string? BatchName { get; set; }
        public string? ProgramName { get; set; }

        public int? CompanyId { get; set; }
        public string? CompanyName { get; set; }

        public double AttendanceRate { get; set; }
        public decimal TechnicalScore { get; set; }
        public decimal BehavioralScore { get; set; }

        public decimal? FinalScore { get; set; }
        public string Level { get; set; } = "غير مكتمل";

        public decimal AttendanceWeight { get; set; }
        public decimal TasksWeight { get; set; }
        public decimal QuizzesWeight { get; set; }
        public decimal ProjectsWeight { get; set; }
    }

    public class AdminTraineesTranscriptDTO
    {
        public List<AdminTraineeTranscriptRowDTO> Rows { get; set; }
            = new();

        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }

        public int TotalPages =>
            PageSize > 0
                ? (int)System.Math.Ceiling(
                    (double)TotalCount / PageSize)
                : 0;
    }
}