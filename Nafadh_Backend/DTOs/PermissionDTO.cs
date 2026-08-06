

namespace Nafadh_Backend.DTOs
{
    
    public class PermissionDTO
    {
        public int PermissionId { get; set; }
        public string PermissionKey { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}
