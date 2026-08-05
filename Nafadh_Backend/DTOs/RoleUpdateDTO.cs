

using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    /
    public class RoleUpdateDTO
    {
        [Required]
        [MaxLength(50)]
        public string RoleName { get; set; } = string.Empty;
    }
}
