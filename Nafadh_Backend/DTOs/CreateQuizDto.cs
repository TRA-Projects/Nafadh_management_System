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

        [Required]
        public int BatchId { get; set; }

        [Required]
        public DateTime StartDateTime { get; set; }

        [Required]
        public DateTime EndDateTime { get; set; }

        [Range(1, 600)]
        public int DurationMinutes { get; set; }

        public NFD_QuizStatus Status { get; set; }
            = NFD_QuizStatus.Draft;

        public bool RandomizeQuestions { get; set; }
            = true;

        [Range(1, 10)]
        public int MaxAttempts { get; set; }
            = 1;

        // نتركها false حالياً إلى أن نضيف نظام الكاميرا
        public bool CameraRequired { get; set; }
            = false;
    }
}
