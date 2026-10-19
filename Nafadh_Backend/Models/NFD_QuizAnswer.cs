using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Models
{
    public class NFD_QuizAnswer
    {
        [Key]
        public int AnswerId { get; set; }

        public int AttemptQuestionId { get; set; }

        // يستخدم في أسئلة الاختيار من متعدد وصح/خطأ
        public int? SelectedOptionId { get; set; }

        // يستخدم لاحقاً للأسئلة الوصفية
        public string? TextAnswer { get; set; }

        public bool? IsCorrect { get; set; }

        public decimal AwardedPoints { get; set; }

        public bool IsManuallyGraded { get; set; } = false;


        public bool IsMarkedForReview { get; set; }

        public DateTime? AnsweredAt { get; set; }
        public NFD_AttemptQuestion AttemptQuestion { get; set; } = null!;

        public NFD_QuestionOption? SelectedOption { get; set; }

    }
}
