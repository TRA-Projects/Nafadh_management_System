
using System.ComponentModel.DataAnnotations;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class CreateQuizDto
    {
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Range(1, int.MaxValue)]
        public int BatchId { get; set; }

        [Required]
        public DateTime StartDateTime { get; set; }

        [Required]
        public DateTime EndDateTime { get; set; }

        [Range(1, 600)]
        public int DurationMinutes { get; set; }

        // الاختبار الجديد يبدأ دائمًا كمسودة
        public NFD_QuizStatus Status { get; set; }
            = NFD_QuizStatus.Draft;

        [Range(1, 10)]
        public int MaxAttempts { get; set; } = 1;

        public bool RandomizeQuestions { get; set; } = true;

        public bool CameraRequired { get; set; } = false;

        // إعدادات الحماية
        public bool PreventCopyPaste { get; set; } = false;

        [Range(0, 100)]
        public int MaxExitAttempts { get; set; } = 2;

        [EnumDataType(typeof(NFD_ExitLimitAction))]
        public NFD_ExitLimitAction ExitLimitAction { get; set; }
            = NFD_ExitLimitAction.Terminate;

        // إعدادات عرض الأسئلة
        public bool RandomizeOptions { get; set; } = false;

        public bool ShowOneQuestionAtTime { get; set; } = false;

        public bool AllowBackNavigation { get; set; } = true;

        // إعدادات النتائج
        public bool ShowResultImmediately { get; set; } = false;

        public bool ShowCorrectAnswers { get; set; } = false;

        public bool ShowScoreToTrainee { get; set; } = true;

        [Range(0, 100,
            ErrorMessage = "نسبة النجاح يجب أن تكون بين 0 و100.")]
        public decimal PassingPercentage { get; set; } = 50;
    }
}
