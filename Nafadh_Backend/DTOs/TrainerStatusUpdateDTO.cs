using Nafadh_Backend.Enums;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class TrainerStatusUpdateDto
    {
        // New status to apply to the trainer (Active, Inactive, Suspended)
        [Required(ErrorMessage = "Status is required.")]
        public NFD_TrainerStatus Status { get; set; }

        // Optional reason/note explaining the status change
        public string? Reason { get; set; }
    }
}
