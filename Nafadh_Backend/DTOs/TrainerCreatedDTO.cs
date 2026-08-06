using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class TrainerCreateDto
    {
        // Id of the existing user account this trainer profile belongs to
        [Required(ErrorMessage = "UserId is required.")]
        public int UserId { get; set; }

        // Trainer's area of expertise
        [MaxLength(150, ErrorMessage = "Specialty cannot exceed 150 characters.")]
        public string? Specialty { get; set; }

        // Number of years of teaching/industry experience
        [Range(0, 100, ErrorMessage = "ExperienceYears must be between 0 and 100.")]
        public decimal ExperienceYears { get; set; }

        // Free-text biography shown on the trainer's profile
        public string? Biography { get; set; }

        // Link to the trainer's uploaded CV file
        [MaxLength(300, ErrorMessage = "CVUrl cannot exceed 300 characters.")]
        public string? CVUrl { get; set; }
    }
}
 

