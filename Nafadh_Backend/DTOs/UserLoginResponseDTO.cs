

namespace Nafadh_Backend.DTOs
{
    
    public class UserLoginResponseDTO
    {
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAtUtc { get; set; }
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public int RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        // Only populated when RoleName == "CompanySupervisor" — lets the
        // company portal scope every request to the real company instead
        // of a hardcoded placeholder id.
        public int? CompanyId { get; set; }
        public int? SupervisorId { get; set; }
    }
}
