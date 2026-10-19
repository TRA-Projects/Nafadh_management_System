using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class CreateProctoringEventDto
    {
        [Required, MaxLength(40)]
        public string EventType { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Details { get; set; }

        // لقطة اختيارية (JPEG فقط، حتى 300KB)
        public IFormFile? Snapshot { get; set; }
    }

    public class ProctoringEventDto
    {
        public int EventId { get; set; }
        public string EventType { get; set; } = string.Empty;
        public string? Details { get; set; }
        public bool HasSnapshot { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class AttemptProctoringReportDto
    {
        public int AttemptId { get; set; }
        public int TraineeId { get; set; }
        public string TraineeName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? IdentityCheckStatus { get; set; }
        public bool NeedsManualReview { get; set; }
        public int ViolationCount { get; set; }
        public bool IsTerminatedByViolation { get; set; }
        public List<ProctoringEventDto> Events { get; set; } = new();
    }

    public class QuizProctoringSummaryItemDto
    {
        public int AttemptId { get; set; }
        public int TraineeId { get; set; }
        public string TraineeName { get; set; } = string.Empty;
        public int AttemptNumber { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? IdentityCheckStatus { get; set; }
        public bool NeedsManualReview { get; set; }
        public int ViolationCount { get; set; }
        public int ProctoringEventsCount { get; set; }
    }
}