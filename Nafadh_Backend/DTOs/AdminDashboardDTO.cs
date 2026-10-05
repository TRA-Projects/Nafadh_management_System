namespace Nafadh_Backend.DTOs
{
    public sealed class AdminDashboardDTO
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

        public CompanyDashboardCapacityDTO Capacity { get; set; } = new();
        public List<CompanyDashboardChartPointDTO> AttendanceWeeks { get; set; } = new();
        public List<CompanyDashboardChartPointDTO> CompanyDistribution { get; set; } = new();
        public List<CompanyDashboardChartPointDTO> ProgramDistribution { get; set; } = new();
        public List<AdminDashboardTraineeDTO> TopPerformers { get; set; } = new();
        public List<AdminDashboardTraineeDTO> AtRiskTrainees { get; set; } = new();
        public List<AdminDashboardWarningDTO> RecentWarnings { get; set; } = new();
    }

    public sealed class AdminDashboardTraineeDTO
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

    public sealed class AdminDashboardWarningDTO
    {
        public int WarningId { get; set; }
        public string Scope { get; set; } = string.Empty; // Trainee or Company
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