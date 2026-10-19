using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class QuizAttemptDto
    {
        public int AttemptId { get; set; }

        public int QuizId { get; set; }

        public string QuizTitle { get; set; } = string.Empty;

        public int DurationMinutes { get; set; }
        public bool CameraRequired { get; set; }

        public DateTime StartedAt { get; set; }

        public DateTime ExpectedEndAt { get; set; }

        public string Status { get; set; } = string.Empty;

        public int ViolationCount { get; set; }
        public int RemainingSeconds { get; set; }




        public List<AttemptQuestionDto> Questions { get; set; }
            = new();
    }

    public class AttemptQuestionDto
    {
        public int AttemptQuestionId { get; set; }

        public int QuestionId { get; set; }

        public int QuestionOrder { get; set; }

        public string QuestionText { get; set; } = string.Empty;

        public NFD_QuizQuestionType QuestionType { get; set; }

        public decimal Points { get; set; }

        public List<QuestionOptionDto> Options { get; set; }
            = new();


        public int? SelectedOptionId { get; set; }
        public string? TextAnswer { get; set; }
        public bool IsMarkedForReview { get; set; }
    }


    public class TraineeQuizListItemDto
    {
        public int QuizId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? BatchName { get; set; }
        public DateTime StartDateTime { get; set; }
        public DateTime EndDateTime { get; set; }
        public int DurationMinutes { get; set; }
        public int QuestionCount { get; set; }
        public int MaxAttempts { get; set; }
        public bool CameraRequired { get; set; }
        public decimal PassingPercentage { get; set; }
        public int AttemptsUsed { get; set; }
        public int AttemptsRemaining { get; set; }
        public int? InProgressAttemptId { get; set; }

        // آخر محاولة مُسلَّمة (لزر "عرض النتيجة")
        public int? LatestAttemptId { get; set; }
        public decimal? LatestPercentage { get; set; }
        public bool? IsPassed { get; set; }

        // Upcoming / Available / InProgress / PendingGrading / Completed / Missed
        public string State { get; set; } = string.Empty;
    }

    // أرقام البطاقات أعلى الصفحة
    public class TraineeQuizzesOverviewDto
    {
        public int Available { get; set; }
        public int Upcoming { get; set; }
        public int PendingGrading { get; set; }
        public int Completed { get; set; }
        public List<TraineeQuizListItemDto> Quizzes { get; set; } = new();
    }
}

