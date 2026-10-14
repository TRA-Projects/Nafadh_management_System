using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Models
{
    public class NFD_QuestionOption
    {
        [Key]
        public int OptionId { get; set; }

        public int QuestionId { get; set; }

        [Required]
        [MaxLength(500)]
        public string OptionText { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        public string OptionCode { get; set; } = string.Empty;

        public int SortOrder { get; set; }

        // يستخدمه الـBackend للتصحيح ولا يظهر للمتدرب
        public bool IsCorrect { get; set; }
        public NFD_QuestionBank Question { get; set; } = null!;

        public ICollection<NFD_QuizAnswer> Answers { get; set; }
            = new List<NFD_QuizAnswer>();

    }
}
