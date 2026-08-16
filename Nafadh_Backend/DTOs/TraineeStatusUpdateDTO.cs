using Nafadh_Backend.Enums;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class TraineeStatusUpdateDto
    {
        // New status to apply to the trainee (NotAssigned, InTraining, Completed)
        [Required(ErrorMessage = "Status is required.")]
        public NFD_TraineeStatus Status { get; set; }

        // Optional reason/note explaining the status change
        public string? Reason { get; set; }
    }

    // NEW: used to approve/reject a trainee's pending identity verification.
    // PUT: /api/Trainee/{id}/verification
    public class TraineeVerificationInputDTO
    {
        [Required(ErrorMessage = "Status is required.")]
        public NFD_VerificationStatus Status { get; set; }

        [Required(ErrorMessage = "ReviewedByUserId is required.")]
        public int ReviewedByUserId { get; set; }
    }
}
