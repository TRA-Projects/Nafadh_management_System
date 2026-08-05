
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
   
    public class RoleCreateDTO
    {
        [Required]
        [MaxLength(50)]
        public string RoleName { get; set; } = string.Empty;
    }
}
