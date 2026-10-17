using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class StartQuizAttemptDto
    {
        [Required]
        public int QuizId { get; set; }

        [Required]
        public int TraineeId { get; set; }
    }
}
