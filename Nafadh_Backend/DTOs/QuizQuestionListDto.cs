
namespace Nafadh_Backend.DTOs
{
    public class QuizQuestionListDto
    {
        public int QuizQuestionId { get; set; }

        public int QuizId { get; set; }

        public int QuestionId { get; set; }

        public string QuestionText { get; set; } = string.Empty;

        public int QuestionOrder { get; set; }

        public decimal Points { get; set; }
    }
}
