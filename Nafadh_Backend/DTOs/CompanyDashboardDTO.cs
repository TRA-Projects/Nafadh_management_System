namespace Nafadh_Backend.DTOs
{
    public sealed class CompanyDashboardDTO
    {
        /// <summary>
        /// Company name displayed by the Company Dashboard.
        /// </summary>
        public string CompanyName { get; set; } = string.Empty;

        /// <summary>
        /// Company capacity information.
        /// Used represents the number of currently active unique trainees.
        /// </summary>
        public CompanyDashboardCapacityDTO Capacity { get; set; } = new();

        /// <summary>
        /// Company-wide attendance percentage calculated from
        /// all attendance records belonging to the company.
        /// </summary>
        public double AverageAttendancePercent { get; set; }

        /// <summary>
        /// Latest six attendance weeks used by the dashboard chart.
        /// </summary>
        public List<CompanyDashboardChartPointDTO> AttendanceWeeks { get; set; } = new();

        /// <summary>
        /// Current trainee distribution by training program.
        /// </summary>
        public List<CompanyDashboardChartPointDTO> ProgramDistribution { get; set; } = new();

        /// <summary>
        /// Top performers based on dashboard evaluation data.
        /// </summary>
        public List<CompanyDashboardTraineeDTO> TopPerformers { get; set; } = new();

        /// <summary>
        /// Trainees currently considered at risk according to the
        /// Company Dashboard business rules.
        /// </summary>
        public List<CompanyDashboardTraineeDTO> AtRiskTrainees { get; set; } = new();

        /// <summary>
        /// Latest trainee warnings belonging to this company.
        /// </summary>
        public List<CompanyDashboardWarningDTO> RecentWarnings { get; set; } = new();

        /// <summary>
        /// Number of unique trainees associated with the company.
        /// </summary>
        public int TotalTrainees { get; set; }

        /// <summary>
        /// Number of unique trainees with an active enrollment.
        /// </summary>
        public int ActiveTrainees { get; set; }
    }

    public sealed class CompanyDashboardCapacityDTO
    {
        public decimal Total { get; set; }

        /// <summary>
        /// Number of unique trainees currently occupying company capacity.
        /// </summary>
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

        /// <summary>
        /// Training program associated with the trainee's enrollment.
        /// </summary>
        public string? ProgramName { get; set; }

        public string? GitHubUrl { get; set; }

        public string? LinkedInUrl { get; set; }

        /// <summary>
        /// Average evaluation score represented as a percentage.
        /// </summary>
        public double PerformancePercent { get; set; }

        /// <summary>
        /// Attendance percentage.
        /// </summary>
        public double AttendancePercent { get; set; }

        /// <summary>
        /// Backend-generated explanation for why the trainee
        /// is considered at risk.
        /// </summary>
        public string? RiskReason { get; set; }
    }

    public sealed class CompanyDashboardWarningDTO
    {
        public int WarningId { get; set; }

        public int EnrollmentId { get; set; }

        public int TraineeId { get; set; }

        public string? TraineeName { get; set; }

        public string? GitHubUrl { get; set; }

        public string? LinkedInUrl { get; set; }

        public string Type { get; set; } = string.Empty;

        public string Level { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public DateTime IssuedDate { get; set; }
    }
}