using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class TrainerListItemDto
    {
        // Unique identifier of the trainer profile
        public int TrainerId { get; set; }

        // Trainer's display name (from the linked user account)
        public string? FullName { get; set; } = string.Empty;

        // Trainer's area of expertise
        public string? Specialty { get; set; }

        // Years of experience
        public decimal ExperienceYears { get; set; }

        // Current trainer status
        public NFD_TrainerStatus Status { get; set; }
    }
}
