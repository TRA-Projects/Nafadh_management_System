using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class LessonDTO
    {
        public int LessonId { get; set; }
        public int ModuleId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? ContentBody { get; set; }
        public decimal OrderIndex { get; set; }

    }
    public class CreateLessonDTO
    {
        [Required(ErrorMessage = "Module ID is required.")]
        public int ModuleId { get; set; }

        [Required(ErrorMessage = "Lesson Title is required.")]
        [StringLength(150, ErrorMessage = "Title cannot exceed 150 characters.")]
        public string Title { get; set; } = string.Empty;

        public string? ContentBody { get; set; }

        [Required(ErrorMessage = "Order Index is required.")]
        [Range(0.0, double.MaxValue, ErrorMessage = "Order Index must be a positive number.")]
        public decimal OrderIndex { get; set; }
    }
    public class UpdateLessonDTO 
    {
        [Required(ErrorMessage = "Lesson ID is required.")]
        [StringLength(150, ErrorMessage = "Title cannot exceed 150 characters.")]
        public string Title { get; set; } = string.Empty;

        public string? ContentBody { get; set; }

        [Required(ErrorMessage = "Order Index is required.")]
        [Range(0.0, double.MaxValue, ErrorMessage = "Order Index must be a positive number.")]
        public decimal OrderIndex { get; set; }
    }
}
