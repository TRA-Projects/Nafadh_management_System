using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Models
{
    public class NFD_AttemptQuestion
    {
        [Key]
        public int AttemptQuestionId { get; set; }

        public int AttemptId { get; set; }

        public int QuestionId { get; set; }

        // ترتيب السؤال في محاولة الطالب
        public int QuestionOrder { get; set; }

        // نحفظ الدرجة وقت إنشاء المحاولة
        public decimal Points { get; set; }
        public NFD_QuizAttempt Attempt { get; set; } = null!;

        public NFD_QuestionBank Question { get; set; } = null!;

        public ICollection<NFD_QuizAnswer> Answers { get; set; }
            = new List<NFD_QuizAnswer>();

    }
}
