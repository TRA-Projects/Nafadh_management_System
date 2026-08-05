

using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    
    public class BulkUpdateRolePermissionsDTO
    {
        [Required]
        public List<int> PermissionIds { get; set; } = new();
    }
}
