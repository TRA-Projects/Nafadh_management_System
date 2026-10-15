
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    // إضافة أسئلة إلى الاختبار
    public class AddQuizQuestionsDto
    {
        [Required]
        [MinLength(1)]
        public List<int> QuestionIds { get; set; } = new();
    }

    // تعديل ترتيب السؤال ودرجته داخل الاختبار
    public class UpdateQuizQuestionDto
    {
        [Range(1, int.MaxValue,
            ErrorMessage = "ترتيب السؤال يجب أن يكون 1 أو أكبر.")]
        public int QuestionOrder { get; set; }

        [Range(typeof(decimal), "0.01", "999999",
            ErrorMessage = "درجة السؤال يجب أن تكون أكبر من صفر.")]
        public decimal Points { get; set; }
    }
}
