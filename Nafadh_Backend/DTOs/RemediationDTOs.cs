using Nafadh_Backend.Enums;
using Nafadh_Backend.Enums.Nafadh_Backend.Enums;
using System;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class RemediationRequestDto
    {
        public int RequestId { get; set; }
        public string RequestCode => $"REQ-{RequestId}";
        public int WarningId { get; set; }
        public string WarningCode => $"CW-{WarningId}";
        public int CompanyId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string OriginalViolationType { get; set; } = string.Empty;
        public string RequestedAction { get; set; } = string.Empty;
        public DateTime SubmissionDate { get; set; }
        public NFD_RemediationStatus Status { get; set; }
        public string? ReviewNotes { get; set; }
    }

    public class CreateRemediationRequestDto
    {
        [Required]
        public int WarningId { get; set; }

        [Required]
        public int CompanyId { get; set; }

        [Required]
        [StringLength(500)]
        public string RequestedAction { get; set; } = string.Empty;
    }

    public class ReviewRemediationRequestDto
    {
        [Required]
        public NFD_RemediationStatus Status { get; set; }

        [StringLength(1000)]
        public string? ReviewNotes { get; set; }

        public int ReviewedByUserId { get; set; }
    }
}