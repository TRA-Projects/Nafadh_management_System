using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class TraineeAssignCompanyDto
    {
        // Id of the host company the trainee will be placed with
        [Required(ErrorMessage = "CompanyId is required.")]
        public int CompanyId { get; set; }

        // Optional notes about the placement
        public string? Notes { get; set; }
    }
}
