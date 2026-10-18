using System.ComponentModel.DataAnnotations;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.Models
{
    public class NFD_QuestionBank
    {
        [Key]
        public int QuestionId { get; set; }

        [Required]
        public string QuestionText { get; set; } = string.Empty;

        public NFD_QuizQuestionType QuestionType { get; set; }

        public NFD_QuestionDifficulty Difficulty { get; set; }

        [Range(0.1, 100)]
        public decimal Points { get; set; } = 1;

        public int TrainerId { get; set; }

        public string? Explanation { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; }
            = DateTime.UtcNow;
        public NFD_Trainer Trainer { get; set; } = null!;

        public ICollection<NFD_QuestionOption> Options { get; set; }
            = new List<NFD_QuestionOption>();

        public ICollection<NFD_QuizQuestion> QuizQuestions { get; set; }
            = new List<NFD_QuizQuestion>();

    }
}
