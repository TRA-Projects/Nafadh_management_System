

using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
   
    public class GrantPermissionDTO
    {
        [Required]
        public int RoleId { get; set; }

        [Required]
        public int PermissionId { get; set; }
    }
}
