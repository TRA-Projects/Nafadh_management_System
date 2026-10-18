
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class SaveUserGuideProgressDto
    {
        [Required]
        [RegularExpression("^(Completed|Skipped)$",
            ErrorMessage = "Status must be Completed or Skipped.")]
        public string Status { get; set; } = string.Empty;
    }
}
