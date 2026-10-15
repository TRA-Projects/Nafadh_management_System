using System.ComponentModel.DataAnnotations;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.Models
{
    public class NFD_Quiz
    {
        [Key]
        public int QuizId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        public int BatchId { get; set; }

        public int TrainerId { get; set; }

        public DateTime StartDateTime { get; set; }

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

        public bool CameraRequired { get; set; }
            = false;

        public DateTime CreatedAt { get; set; }
            = DateTime.UtcNow;
        public NFD_Batch Batch { get; set; } = null!;

        public NFD_Trainer Trainer { get; set; } = null!;

        public ICollection<NFD_QuizQuestion> QuizQuestions { get; set; }
            = new List<NFD_QuizQuestion>();

        public ICollection<NFD_QuizAttempt> Attempts { get; set; }
            = new List<NFD_QuizAttempt>();

        // نسبة النجاح التي يحددها المدرب
        [Range(0, 100)]
        public decimal PassingPercentage { get; set; } = 50;

    }
}
