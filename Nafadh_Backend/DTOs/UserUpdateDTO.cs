
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class UserUpdateDTO
    {
        [Required]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? Phone { get; set; }
    }
}
