namespace Nafadh_Backend.DTOs
{
    // Same final batch result as the Admin batch-performance report,
    // scoped to one company enrollment. Incomplete results are NOT zero scores.
    public sealed class CompanyWeightedEvaluationDTO
    {
        public int EnrollmentId { get; set; }
        public int TraineeId { get; set; }
        public int BatchId { get; set; }
        public string? BatchName { get; set; }
        public string? ProgramName { get; set; }
        public string? FullName { get; set; }
        public string? Major { get; set; }
        public string? GitHubUrl { get; set; }
        public string? LinkedInUrl { get; set; }
        public double AttendancePercent { get; set; }
        public decimal? FinalScore { get; set; }
        public bool IsComplete { get; set; }
        public string Level { get; set; } = "غير مكتمل";
    }
}
