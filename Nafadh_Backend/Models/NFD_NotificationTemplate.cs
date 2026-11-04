
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Models
{
    public class NFD_NotificationTemplate
    {
        [Key]
        public int Id { get; set; }

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

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
    }
}
