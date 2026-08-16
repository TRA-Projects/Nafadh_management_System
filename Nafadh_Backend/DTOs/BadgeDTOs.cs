using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    // ============================================================
    // Output DTO — GET /api/Badge (the full fixed catalog)
    // ============================================================
    public class BadgeDTO
    {
        public int BadgeId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public NFD_BadgeConditionType ConditionType { get; set; }
        public decimal ConditionValue { get; set; }
    }

    // ============================================================
    // Output DTO — GET /api/TraineeBadge/trainee/{traineeId}
    // Badge earned by a trainee, joined with the badge's own details.
    // ============================================================
    public class TraineeBadgeDTO
    {
        public int TraineeBadgeId { get; set; }
        public int TraineeId { get; set; }
        public int BadgeId { get; set; }
        public DateTime EarnedAt { get; set; }
        public BadgeDTO? Badge { get; set; }
    }
}
