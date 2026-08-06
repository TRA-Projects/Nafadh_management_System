using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class TrainerUpdateDto
    {
        // Updated area of expertise
        [MaxLength(150, ErrorMessage = "Specialty cannot exceed 150 characters.")]
        public string? Specialty { get; set; }

        // Updated years of experience
        [Range(0, 100, ErrorMessage = "ExperienceYears must be between 0 and 100.")]
        public decimal ExperienceYears { get; set; }

        // Updated biography
        public string? Biography { get; set; }

        // Updated CV link
        [MaxLength(300, ErrorMessage = "CVUrl cannot exceed 300 characters.")]
        public string? CVUrl { get; set; }
    }
}
