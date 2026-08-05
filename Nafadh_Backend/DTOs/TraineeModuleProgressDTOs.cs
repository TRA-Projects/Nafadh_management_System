using Nafadh_Backend.Enums;
using System.ComponentModel.DataAnnotations;
namespace Nafadh_Backend.DTOs
{
    // Input DTO
    // Used when trainee completes a module
    public class CompleteModuleDto
    {

        [Required(ErrorMessage = "Module ID is required")]
        public int ModuleId { get; set; }
    }
    // Input DTO
    // Used when updating trainee progress status
    public class UpdateTraineeModuleProgressDto
    {
        [Required(ErrorMessage = "Progress status is required")]
        public NFD_ModuleProgressStatus Status { get; set; }

        public DateTime? CompletedAt { get; set; }
    }
    // Output DTO
    // Used to return progress information
    public class TraineeModuleProgressDto
    {
        public int ProgressId { get; set; }

        public int TraineeId { get; set; }

        public int ModuleId { get; set; }

        public NFD_ModuleProgressStatus Status { get; set; }

        public DateTime? CompletedAt { get; set; }
    }
    // Output DTO
    // Used for dashboard progress percentage
    public class TraineeProgressPercentageDto
    {
        public int TraineeId { get; set; }

        public double Percentage { get; set; }
    }
}