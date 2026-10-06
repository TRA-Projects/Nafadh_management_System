using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Models
{
    public class NFD_LessonFeedback
    {
        [Key]
        public int LessonFeedbackId { get; set; }

        [Required]
        public int LessonId { get; set; }

        [Required]
        public int TraineeId { get; set; }

        [MaxLength(2000)]
        public string? Note { get; set; }

        [Range(1, 5)]
        public int? Rating { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public NFD_Lesson Lesson { get; set; } = null!;

        public NFD_Trainee Trainee { get; set; } = null!;
    }
}