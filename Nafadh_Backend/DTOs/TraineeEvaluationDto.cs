
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    // البيانات التي يرسلها المدرب
    public class SaveTraineeEvaluationDto
    {
        [MaxLength(2000)]
        public string? Strengths { get; set; }

        [MaxLength(2000)]
        public string? AreasForImprovement { get; set; }

        [MaxLength(2000)]
        public string? Recommendations { get; set; }

        [MaxLength(2000)]
        public string? TrainerNotes { get; set; }

        public bool IsCompleted { get; set; } = false;
    }

    // البيانات التي تظهر عند عرض التقييم
    public class TraineeEvaluationDto
    {
        public int EvaluationId { get; set; }

        public int AttemptId { get; set; }

        public int QuizId { get; set; }

        public int TraineeId { get; set; }

        public decimal Score { get; set; }

        public decimal Percentage { get; set; }

        public decimal PassingPercentage { get; set; }

        public bool IsPassed { get; set; }

        public string? Strengths { get; set; }

        public string? AreasForImprovement { get; set; }

        public string? Recommendations { get; set; }

        public string? TrainerNotes { get; set; }

        public bool IsCompleted { get; set; }

        public DateTime? CompletedAt { get; set; }
    }
}
