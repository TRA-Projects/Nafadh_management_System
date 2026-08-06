using System.ComponentModel.DataAnnotations;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    // ============================================================
    // Output DTO
    // Used for:
    // GET /api/Announcement/scope/{scopeType}/{scopeId}
    // GET /api/Announcement/{id}
    // ============================================================
    public class AnnouncementDTO
    {
        public int AnnouncementId { get; set; }

        public NFD_AnnouncementScopeType ScopeType { get; set; }

        public int? ScopeId { get; set; }

        public string Message { get; set; } = string.Empty;

        public DateTime Date { get; set; }

        public int CreatedByUserId { get; set; }
    }


    // ============================================================
    // Input DTO
    // Used for:
    // POST /api/Announcement
    // ============================================================
    public class CreateAnnouncementDTO
    {
        [Required]
        public NFD_AnnouncementScopeType ScopeType { get; set; }

        public int? ScopeId { get; set; }

        [Required]
        public string Message { get; set; } = string.Empty;

        [Required]
        public int CreatedByUserId { get; set; }
    }


    // ============================================================
    // Input DTO
    // Used for:
    // PUT /api/Announcement/{id}
    // ============================================================
    public class UpdateAnnouncementDTO
    {
        [Required]
        public NFD_AnnouncementScopeType ScopeType { get; set; }

        public int? ScopeId { get; set; }

        [Required]
        public string Message { get; set; } = string.Empty;
    }
}