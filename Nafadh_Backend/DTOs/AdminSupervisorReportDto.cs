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

        public bool? NeedsFollowUp { get; set; }
        public int AssignedTraineesCount { get; set; }

        // Null means there are no eligible attendance records.
        public decimal? AverageAttendanceRate { get; set; }

        public int MonthlyEvaluationsCount { get; set; }

        // Number of distinct assigned trainees with unresolved warnings.

        public int? TraineesNeedingFollowUpCount { get; set; }

        // Trainer performance evaluations completed by this supervisor
        public int TrainerEvaluationsCount { get; set; }

        // Number of distinct trainers evaluated by this supervisor
        public int EvaluatedTrainersCount { get; set; }

        // Most recent trainer evaluation completed by this supervisor
        public DateTime? LastTrainerEvaluationDate { get; set; }

        
    }
}
