namespace Nafadh_Backend.DTOs
{
    public class TrainerEvaluationDto
    {
        // Unique identifier of the evaluation record
        public int EvaluationId { get; set; }

        // Name of the admin who submitted the evaluation
        public string? EvaluatedByAdminName { get; set; }

        // Numeric score given in the evaluation
        public decimal? Score { get; set; }

        // Free-text comments/feedback
        public string? Comments { get; set; }

        // Date the evaluation was submitted
        public DateTime EvaluationDate { get; set; }
    }
}
