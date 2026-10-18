using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class QuizListDto
    {
        public int QuizId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        public int BatchId { get; set; }

        public string? BatchName { get; set; }

        public DateTime StartDateTime { get; set; }

        public DateTime EndDateTime { get; set; }

        public int DurationMinutes { get; set; }

        public NFD_QuizStatus Status { get; set; }

        public bool RandomizeQuestions { get; set; }

        public int MaxAttempts { get; set; }

        public bool CameraRequired { get; set; }

        public DateTime CreatedAt { get; set; }
        // نسبة النجاح في الاختبار
        public decimal PassingPercentage { get; set; }
    }
}
