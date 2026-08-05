

using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    
    public class UserResponseDTO
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public int RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public NFD_UserStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
