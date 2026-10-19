
using System;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Models
{
    public class NFD_TraineeEvaluation
    {
        [Key]
        public int EvaluationId { get; set; }

        // ربط التقييم بمحاولة الاختبار
        [Required]
        public int AttemptId { get; set; }

        // تقييم المدرب
        [MaxLength(2000)]
        public string? Strengths { get; set; }

        [MaxLength(2000)]
        public string? AreasForImprovement { get; set; }

        [MaxLength(2000)]
        public string? Recommendations { get; set; }

        [MaxLength(2000)]
        public string? TrainerNotes { get; set; }

        // هل انتهى المدرب من التقييم؟
        public bool IsCompleted { get; set; } = false;

        public DateTime CreatedAt { get; set; }
            = DateTime.UtcNow;

        public DateTime? CompletedAt { get; set; }

        // العلاقة مع محاولة الاختبار
        public NFD_QuizAttempt Attempt { get; set; } = null!;
    }
}
