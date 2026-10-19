
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

        public int MaxAttempts { get; set; }

        public bool RandomizeQuestions { get; set; }

        public bool CameraRequired { get; set; }

        // إعدادات الحماية
        public bool PreventCopyPaste { get; set; }

        public int MaxExitAttempts { get; set; }

        public NFD_ExitLimitAction ExitLimitAction { get; set; }

        // إعدادات عرض الأسئلة
        public bool RandomizeOptions { get; set; }

        public bool ShowOneQuestionAtTime { get; set; }

        public bool AllowBackNavigation { get; set; }

        // إعدادات النتائج
        public bool ShowResultImmediately { get; set; }

        public bool ShowCorrectAnswers { get; set; }

        public bool ShowScoreToTrainee { get; set; }

        public decimal PassingPercentage { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
