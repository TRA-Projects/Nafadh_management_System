namespace Nafadh_Backend.DTOs
{
    // NEW: v1-draft analytics/report shapes per api-contract-shared-entities.md §7
    // and the per-portal dashboard/report pages. These sit alongside the existing
    // generic ReportInputDTO/ReportOutputDTO (file-based report generation) rather
    // than replacing them.

    public class ChartPointDTO
    {
        public string Label { get; set; } = string.Empty;
        public double Value { get; set; }
    }

    public class DashboardChartsDTO
    {
        public List<ChartPointDTO> BatchesByYear { get; set; } = new List<ChartPointDTO>();
        public List<ChartPointDTO> TracksDistribution { get; set; } = new List<ChartPointDTO>();
    }

    public class BatchPerformanceRowDTO
    {
        public int TraineeId { get; set; }
        public string? TraineeName { get; set; }
        public string? Major { get; set; }
        public double AttendanceRate { get; set; }
        public decimal TechnicalScore { get; set; }
        public decimal BehavioralScore { get; set; }
        public decimal? FinalScore { get; set; }        // Arabic performance-band labels, matching the original Admin portal demo.
        public string Level { get; set; } = string.Empty;
    }

    public class BatchPerformanceReportDTO
    {
        public int BatchId { get; set; }
        public string? BatchName { get; set; }
        public string? ProgramName { get; set; }
        public string? CompanyName { get; set; }
        public double AvgAttendance { get; set; }
        public double SuccessRate { get; set; }
        public List<BatchPerformanceRowDTO> Rows { get; set; } = new List<BatchPerformanceRowDTO>();

        // ==== جديد: بيانات الصفحات ====
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
    }

    public class AttendanceReportRowDTO
    {
        public int TraineeId { get; set; }
        public string? TraineeName { get; set; }
        public int PresentDays { get; set; }
        public int LateDays { get; set; }
        public int AbsentDays { get; set; }
        public int ExcusedDays { get; set; }
        public double AttendanceRate { get; set; }
    }

    public class AttendanceReportDTO
    {
        public int? BatchId { get; set; }
        public string? BatchName { get; set; }
        public DateTime? PeriodStart { get; set; }
        public DateTime? PeriodEnd { get; set; }
        public double OverallAttendanceRate { get; set; }
        public List<AttendanceReportRowDTO> Rows { get; set; } = new List<AttendanceReportRowDTO>();
    }

    public class TrainerKpisDTO
    {
        public double AttendanceRate { get; set; }
        public double TaskCompletionRate { get; set; }
        public double AvgTechnicalGrade { get; set; }
    }

    public class CompanyCapacityDTO
    {
        public decimal Total { get; set; }
        public int Used { get; set; }
        public decimal Remaining { get; set; }
    }

    public class AdminDashboardSummaryDTO
    {
        public int TotalTrainees { get; set; }
        public int ActiveTrainees { get; set; }
        public int TotalCompanies { get; set; }
        public int TotalBatches { get; set; }
        public int TotalCertificates { get; set; }

        public double OverallAttendanceRate { get; set; }
        public int TopPerformersCount { get; set; }
        public double TopPerformersAvgScore { get; set; }
        public int AtRiskCount { get; set; }

        public CompanyCapacityDTO Capacity { get; set; } = new();

        public List<ChartPointDTO> AttendanceWeeks { get; set; } = new();
        public List<ChartPointDTO> CompanyDistribution { get; set; } = new();
        public List<ChartPointDTO> ProgramDistribution { get; set; } = new();

        public List<AdminDashboardTraineeDTO> TopPerformers { get; set; } = new();
        public List<AdminDashboardTraineeDTO> AtRiskTrainees { get; set; } = new();
        public List<AdminDashboardWarningDTO> RecentWarnings { get; set; } = new();
    }

    public class AdminDashboardTraineeDTO
    {
        public int TraineeId { get; set; }
        public int EnrollmentId { get; set; }

        public string? FullName { get; set; }
        public string? Major { get; set; }
        public string? CompanyName { get; set; }

        public string? GitHubUrl { get; set; }
        public string? LinkedInUrl { get; set; }

        public double PerformancePercent { get; set; }
        public double AttendancePercent { get; set; }
    }

    public class AdminDashboardWarningDTO
    {
        public int WarningId { get; set; }
        public string Scope { get; set; } = string.Empty;

        public int? TraineeId { get; set; }
        public int? CompanyId { get; set; }

        public string? TargetName { get; set; }
        public string? GitHubUrl { get; set; }
        public string? LinkedInUrl { get; set; }

        public string Type { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;

        public DateTime IssuedDate { get; set; }
    }
}
