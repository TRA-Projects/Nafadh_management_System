using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class AddQuizQuestionsDto
    {
        [Required]
        [MinLength(1)]
        public List<int> QuestionIds { get; set; } = new();
    }
}
