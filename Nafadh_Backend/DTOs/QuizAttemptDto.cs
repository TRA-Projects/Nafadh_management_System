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
    }
}
