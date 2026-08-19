namespace Nafadh_Backend.DTOs
{
    public class AuditLogDto
    {
        public int LogId { get; set; }
        public string Action { get; set; } = string.Empty;
        public int? UserId { get; set; }
        public string? UserName { get; set; }
        public string EntityName { get; set; } = string.Empty;
        public int? EntityId { get; set; }
        public DateTime Timestamp { get; set; }
    }
}