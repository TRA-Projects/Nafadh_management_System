namespace Nafadh_Backend.DTOs
{
    public class AdminSupervisorReportDto
    {
        public int SupervisorId { get; set; }

        public string? FullName { get; set; }
        public string? Department { get; set; }
        public string? Position { get; set; }
        public string? CompanyName { get; set; }
        public string? Status { get; set; }

        public int AssignedTraineesCount { get; set; }

        // Null means there are no eligible attendance records.
        public decimal? AverageAttendanceRate { get; set; }

        public int MonthlyEvaluationsCount { get; set; }

        // Will be populated after confirming follow-up rules.
        public int? TraineesNeedingFollowUpCount { get; set; }
    }
}
