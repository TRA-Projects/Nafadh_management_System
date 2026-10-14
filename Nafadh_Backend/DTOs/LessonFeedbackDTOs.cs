

using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class LessonFeedbackCreateDTO
    {
        [MaxLength(2000)]
        public string? Note { get; set; }

        [Range(1, 5)]
        public int? Rating { get; set; }
    }

    public class LessonFeedbackUpdateDTO
    {
        [MaxLength(2000)]
        public string? Note { get; set; }

        [Range(1, 5)]
        public int? Rating { get; set; }
    }

    public class LessonFeedbackResponseDTO
    {
        public int LessonFeedbackId { get; set; }

        public int LessonId { get; set; }

        public int TraineeId { get; set; }

        public string? Note { get; set; }

        public int? Rating { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}