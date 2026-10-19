
namespace Nafadh_Backend.DTOs
{
    public class QuizResultDto
    {
        public int AttemptId { get; set; }
        public int QuizId { get; set; }
        public string QuizTitle { get; set; } = string.Empty;

        public int BatchId { get; set; }
        public string BatchName { get; set; } = string.Empty;
        public int TraineeId { get; set; }
        public string TraineeName { get; set; } = string.Empty;
        public int AttemptNumber { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public decimal Score { get; set; }
        public decimal Percentage { get; set; }
        public string Status { get; set; } = string.Empty;

        // بيانات إضافية لواجهة المدرب
        public decimal PassingPercentage { get; set; }
        public bool IsGradingCompleted { get; set; }
        public bool? IsPassed { get; set; }
    }

    public class QuizAttemptDetailsDto
    {
        public int AttemptId { get; set; }
        public int QuizId { get; set; }
        public string QuizTitle { get; set; } = string.Empty;
        public int TraineeId { get; set; }
        public string TraineeName { get; set; } = string.Empty;
        public int AttemptNumber { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal Score { get; set; }
        public decimal Percentage { get; set; }
        public decimal PassingPercentage { get; set; }
        public bool IsGradingCompleted { get; set; }
        public bool? IsPassed { get; set; }

        public List<QuizAnswerDetailsDto> Answers { get; set; }
            = new();
    }

    public class QuizAnswerDetailsDto
    {
        public int AnswerId { get; set; }
        public int AttemptQuestionId { get; set; }
        public int QuestionId { get; set; }
        public int QuestionOrder { get; set; }
        public string QuestionText { get; set; } = string.Empty;
        public string QuestionType { get; set; } = string.Empty;
        public int? SelectedOptionId { get; set; }
        public string? SelectedOptionText { get; set; }
        public string? TextAnswer { get; set; }
        public decimal MaxPoints { get; set; }
        public decimal AwardedPoints { get; set; }
        public bool? IsCorrect { get; set; }
        public bool IsManuallyGraded { get; set; }
        public bool IsMarkedForReview { get; set; }
        public bool RequiresManualGrading { get; set; }

  
    }

    // الحفاظ على DTO التصحيح اليدوي الموجود
    public class GradeQuizAnswerDto
    {
        public int AnswerId { get; set; }
        public int TrainerId { get; set; }
        public decimal AwardedPoints { get; set; }
    }
}
