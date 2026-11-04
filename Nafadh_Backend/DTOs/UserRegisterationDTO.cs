
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
  
    /// Payload for POST /api/User/register.
   
    public class UserRegisterationDTO
    {
        [Required]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
       
        public string Password { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? Phone { get; set; }

       
        [Required]
        public int RoleId { get; set; }
    }
}
