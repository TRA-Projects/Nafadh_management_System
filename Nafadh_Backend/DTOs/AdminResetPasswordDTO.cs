

using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    
    public class AdminResetPasswordDTO
    {
        [Required]
        [MinLength(8, ErrorMessage = "Password must be at least 8 characters long.")]
        public string NewPassword { get; set; } = string.Empty;
    }
}
