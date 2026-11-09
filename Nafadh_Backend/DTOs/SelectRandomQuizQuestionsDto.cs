using System.ComponentModel.DataAnnotations;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class SelectRandomQuizQuestionsDto
    {
        [Range(1, int.MaxValue,
            ErrorMessage = "يجب اختيار الوحدة.")]
        public int ModuleId { get; set; }

        public NFD_QuestionDifficulty Difficulty { get; set; }

        [Range(1, 100,
            ErrorMessage = "عدد الأسئلة يجب أن يكون بين 1 و100.")]
        public int Count { get; set; }
    }
}