using Nafadh_Backend.Enums;
using Nafadh_Backend.Enums.Nafadh_Backend.Enums;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Nafadh_Backend.Models
{
    [Table("NFD_RemediationRequests")]
    public class RemediationRequest
    {
        [Key]
        public int RequestId { get; set; }

        [Required]
        public int WarningId { get; set; }

        [Required]
        public int CompanyId { get; set; }

        [Required]
        [StringLength(500)]
        public string RequestedAction { get; set; } = string.Empty;

        public DateTime SubmissionDate { get; set; } = DateTime.UtcNow;

        public NFD_RemediationStatus Status { get; set; } = NFD_RemediationStatus.Pending;

        [StringLength(1000)]
        public string? ReviewNotes { get; set; }

        public int? ReviewedByUserId { get; set; }

        public DateTime? ReviewedDate { get; set; }

        // Navigation Properties
        [ForeignKey("WarningId")]
        public virtual NFD_Warning? Warning { get; set; }

        [ForeignKey("CompanyId")]
        public virtual NFD_Company? Company { get; set; }
    }
}