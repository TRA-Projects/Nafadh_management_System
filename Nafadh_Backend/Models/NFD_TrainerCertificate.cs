using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Nafadh_Backend.Models
{
    public class NFD_TrainerCertificate
    {
        [Key]
        public int TrainerCertificateId { get; set; }

        [Required]
        public int TrainerId { get; set; }

        [Required, MaxLength(200)]
        public string CertificateName { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? Issuer { get; set; }

        public DateTime? IssueDate { get; set; }
        public DateTime? ExpiryDate { get; set; }

        [Required, MaxLength(500)]
        public string FileUrl { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? OriginalFileName { get; set; }

        [MaxLength(100)]
        public string? ContentType { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(TrainerId))]
        public NFD_Trainer Trainer { get; set; } = null!;
    }
}