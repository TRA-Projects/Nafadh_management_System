using System.ComponentModel.DataAnnotations;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class CreateQuestionDto
    {
        [Required]
        public string QuestionText { get; set; } = string.Empty;

        public NFD_QuizQuestionType QuestionType { get; set; }

        public NFD_QuestionDifficulty Difficulty { get; set; }

        [Range(0.1, 100)]
        public decimal Points { get; set; } = 1;

        public string? Explanation { get; set; }

        public List<CreateQuestionOptionDto> Options { get; set; }
            = new List<CreateQuestionOptionDto>();
    }

    public class CreateQuestionOptionDto
    {
        [Required]
        [MaxLength(500)]
        public string OptionText { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        public string OptionCode { get; set; } = string.Empty;

        public int SortOrder { get; set; }

        public bool IsCorrect { get; set; }
    }
}
