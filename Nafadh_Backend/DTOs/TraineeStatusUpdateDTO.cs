using Nafadh_Backend.Enums;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class TraineeStatusUpdateDto
    {
        // New status to apply to the trainee (Active, Graduated, Dropped, Suspended)
        [Required(ErrorMessage = "Status is required.")]
        public NFD_TraineeStatus Status { get; set; }

        // Optional reason/note explaining the status change
        public string? Reason { get; set; }
    }
}
