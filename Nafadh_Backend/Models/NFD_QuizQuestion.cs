using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Models
{
    public class NFD_QuizQuestion
    {
        [Key]
        public int QuizQuestionId { get; set; }

        public int QuizId { get; set; }

        public int QuestionId { get; set; }

        // ترتيب السؤال داخل الاختبار
        public int QuestionOrder { get; set; }

        public decimal Points { get; set; }
        public NFD_Quiz Quiz { get; set; } = null!;

        public NFD_QuestionBank Question { get; set; } = null!;

    }
}
