namespace Nafadh_Backend.DTOs
{
    public class QuizResultDto
    {
        public int AttemptId { get; set; }

        public int QuizId { get; set; }

        public string QuizTitle { get; set; } = string.Empty;

        public int TraineeId { get; set; }

        public string TraineeName { get; set; } = string.Empty;

        public int AttemptNumber { get; set; }

        public DateTime StartedAt { get; set; }

        public DateTime? SubmittedAt { get; set; }

        public decimal Score { get; set; }

        public decimal Percentage { get; set; }

        public string Status { get; set; } = string.Empty;
    }
}
