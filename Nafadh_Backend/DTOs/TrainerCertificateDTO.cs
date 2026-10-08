using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class TrainerCertificateDto
    {
        public int TrainerCertificateId { get; set; }
        public int TrainerId { get; set; }
        public string CertificateName { get; set; } = string.Empty;
        public string? Issuer { get; set; }
        public DateTime? IssueDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string FileUrl { get; set; } = string.Empty;
        public string? OriginalFileName { get; set; }
        public string? ContentType { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateTrainerCertificateDto
    {
        [Required, MaxLength(200)]
        public string CertificateName { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? Issuer { get; set; }

        public DateTime? IssueDate { get; set; }
        public DateTime? ExpiryDate { get; set; }

        [Required]
        public IFormFile File { get; set; } = null!;
    }
}