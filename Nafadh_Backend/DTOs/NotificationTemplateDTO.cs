
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    // Response DTO
    public class NotificationTemplateDTO
    {
        public int Id { get; set; }

        public string Code { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string PortalCode { get; set; } = string.Empty;

        public string Type { get; set; } = string.Empty;

        public string? Subject { get; set; }

        public string Body { get; set; } = string.Empty;

        public bool IsActive { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }

    // Create DTO
    public class CreateNotificationTemplateDTO
    {
        [Required]
        [MaxLength(100)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        public string PortalCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Type { get; set; } = "Email";

        [MaxLength(250)]
        public string? Subject { get; set; }

        [Required]
        public string Body { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;
    }

    // Update DTO
    public class UpdateNotificationTemplateDTO
    {
        [Required]
        [MaxLength(100)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        public string PortalCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Type { get; set; } = "Email";

        [MaxLength(250)]
        public string? Subject { get; set; }

        [Required]
        public string Body { get; set; } = string.Empty;

        public bool IsActive { get; set; }
    }

    // Update Status DTO
    public class UpdateNotificationTemplateStatusDTO
    {
        public bool IsActive { get; set; }
    }
}
