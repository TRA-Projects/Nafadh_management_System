using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class TraineeUpdateDto
    {
        // Updated university/institution name
        [MaxLength(150, ErrorMessage = "University cannot exceed 150 characters.")]
        public string? University { get; set; }

        // Updated field of study
        [MaxLength(100, ErrorMessage = "Major cannot exceed 100 characters.")]
        public string? Major { get; set; }

        // Updated academic level
        [MaxLength(50, ErrorMessage = "AcademicLevel cannot exceed 50 characters.")]
        public string? AcademicLevel { get; set; }

        // Updated skills list
        public string? Skills { get; set; }

        // Updated resume link
        [MaxLength(300, ErrorMessage = "ResumeUrl cannot exceed 300 characters.")]
        public string? ResumeUrl { get; set; }
    }
}

