using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class QuestionBankListDto
    {
        public int QuestionId { get; set; }

        public string QuestionText { get; set; } = string.Empty;

        public NFD_QuizQuestionType QuestionType { get; set; }

        public NFD_QuestionDifficulty Difficulty { get; set; }

        public decimal Points { get; set; }

        public string? Explanation { get; set; }

        public bool IsActive { get; set; }

        public DateTime CreatedAt { get; set; }

        public List<QuestionOptionDto> Options { get; set; }
            = new List<QuestionOptionDto>();
    }
}
