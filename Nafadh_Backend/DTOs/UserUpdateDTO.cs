
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class UserUpdateDTO
    {
        [Required]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(256)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? Phone { get; set; }

        [Required]
        public int RoleId { get; set; }
    }
}