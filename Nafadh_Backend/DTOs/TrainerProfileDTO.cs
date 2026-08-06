using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class TrainerProfileDto
    {
        // Unique identifier of the trainer profile
        public int TrainerId { get; set; }

        // Trainer's display name
        public string? FullName { get; set; } = string.Empty;

        // Trainer's email address
        public string? Email { get; set; } = string.Empty;

        // Trainer's area of expertise
        public string? Specialty { get; set; }

        // Years of experience
        public decimal ExperienceYears { get; set; }

        // Free-text biography
        public string? Biography { get; set; }

        // Link to the trainer's CV file
        public string? CVUrl { get; set; }

        // Current trainer status
        public NFD_TrainerStatus Status { get; set; }
    }
}
