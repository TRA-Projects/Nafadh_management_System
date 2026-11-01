namespace Nafadh_Backend.DTOs
{
    public class AdminCompanyBatchPerformanceDTO
    {
        public int BatchId { get; set; }
        public string? BatchName { get; set; }
        public string? ProgramName { get; set; }
        public string? CompanyName { get; set; }

        public double? AvgAttendance { get; set; }
        public double? SuccessRate { get; set; }

        public List<AdminCompanyBatchPerformanceRowDTO> Rows { get; set; } = new();

        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }

        public int TotalPages =>
            PageSize > 0
                ? (int)Math.Ceiling((double)TotalCount / PageSize)
                : 0;
    }

    public class AdminCompanyBatchPerformanceRowDTO
    {
        public int TraineeId { get; set; }
        public string? TraineeName { get; set; }
        public string? Major { get; set; }

        public double? AttendanceRate { get; set; }
        public decimal? TechnicalScore { get; set; }
        public decimal? BehavioralScore { get; set; }
        public decimal? FinalScore { get; set; }

        public string Level { get; set; } = "غير متوفر";
    }
}
