#nullable enable
namespace Nafadh_Backend.DTOs
{
    public class CompanyAccountDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string UserStatus { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }

        public int SupervisorId { get; set; }
        public int CompanyId { get; set; }
        public string? Department { get; set; }
        public string? Position { get; set; }
        public string SupervisorStatus { get; set; } = string.Empty;

        public string CompanyName { get; set; } = string.Empty;
        public string CompanyStatus { get; set; } = string.Empty;
        public string RoleName { get; set; } = string.Empty;

        public List<CompanyAccountPermissionDto> Permissions { get; set; } = new();
        public List<CompanyAccountActivityDto> RecentActivities { get; set; } = new();
        public DateTime? LastActivityAt { get; set; }
    }

    public class CompanyAccountPermissionDto
    {
        public int PermissionId { get; set; }
        public string PermissionKey { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class CompanyAccountActivityDto
    {
        public int LogId { get; set; }
        public string Action { get; set; } = string.Empty;
        public string EntityName { get; set; } = string.Empty;
        public int EntityId { get; set; }
        public string? Details { get; set; }
        public DateTime Timestamp { get; set; }
    }
}
