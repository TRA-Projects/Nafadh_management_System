

using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    
    public class AdminResetPasswordDTO
    {
        [Required]
      
        public string NewPassword { get; set; } = string.Empty;
    }
}
