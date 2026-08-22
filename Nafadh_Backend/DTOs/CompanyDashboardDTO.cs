namespace Nafadh_Backend.DTOs
{
    // Company-portal-only dashboard contract. This is additive and does not
    // change any shared report or trainee DTO used by the other portals.
    public sealed class CompanyDashboardDTO
    {
        public CompanyDashboardCapacityDTO Capacity { get; set; } = new();
        public List<CompanyDashboardChartPointDTO> AttendanceWeeks { get; set; } = new();
        public List<CompanyDashboardChartPointDTO> ProgramDistribution { get; set; } = new();
        public List<CompanyDashboardTraineeDTO> TopPerformers { get; set; } = new();
        public List<CompanyDashboardTraineeDTO> AtRiskTrainees { get; set; } = new();
        public List<CompanyDashboardWarningDTO> RecentWarnings { get; set; } = new();
        public int TotalTrainees { get; set; }
        public int ActiveTrainees { get; set; }
    }

    public sealed class CompanyDashboardCapacityDTO
    {
        public decimal Total { get; set; }
        public int Used { get; set; }
        public decimal Remaining { get; set; }
    }

    public sealed class CompanyDashboardChartPointDTO
    {
        public string Label { get; set; } = string.Empty;
        public double Value { get; set; }
    }

    public sealed class CompanyDashboardTraineeDTO
    {
        public int TraineeId { get; set; }
        public int EnrollmentId { get; set; }
        public string? FullName { get; set; }
        public string? Major { get; set; }
        public string? GitHubUrl { get; set; }
        public double PerformancePercent { get; set; }
        public double AttendancePercent { get; set; }
    }

    public sealed class CompanyDashboardWarningDTO
    {
        public int WarningId { get; set; }
        public int EnrollmentId { get; set; }
        public int TraineeId { get; set; }
        public string? TraineeName { get; set; }
        public string? GitHubUrl { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime IssuedDate { get; set; }
    }
}
