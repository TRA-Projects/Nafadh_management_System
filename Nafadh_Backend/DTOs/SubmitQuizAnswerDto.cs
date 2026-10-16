using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class SubmitQuizAnswerDto
    {
        [Required]
        public int AttemptQuestionId { get; set; }

        public int? SelectedOptionId { get; set; }

        public string? TextAnswer { get; set; }

        public bool IsMarkedForReview { get; set; }
    }
}
