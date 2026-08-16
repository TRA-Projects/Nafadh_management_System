using Nafadh_Backend.Enums;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    // ============================================================
    // Output DTO — GET /api/Feedback/criteria?appliesTo=
    // Fixed, system-defined criteria (not trainer/admin-editable).
    // ============================================================
    public class FeedbackCriterionDTO
    {
        public int CriterionId { get; set; }
        public NFD_FeedbackType AppliesTo { get; set; }
        public string Name { get; set; } = string.Empty;
        public int OrderIndex { get; set; }
    }

    // ============================================================
    // Input DTO — one criterion's score within a POST /api/Feedback body
    // ============================================================
    public class FeedbackScoreInputDTO
    {
        [Required]
        public int CriterionId { get; set; }

        [Required]
        [Range(1, 5, ErrorMessage = "Score must be between 1 and 5.")]
        public int Score { get; set; }
    }

    // ============================================================
    // Input DTO — POST /api/Feedback
    // ============================================================
    public class CreateFeedbackDTO
    {
        [Required]
        public NFD_FeedbackType Type { get; set; }

        [Required]
        public int TraineeId { get; set; }

        [Required]
        public int ModuleId { get; set; }

        // Required when Type == TrainerRating
        public int? TrainerId { get; set; }

        // Required when Type == BatchExperienceRating
        public int? BatchId { get; set; }

        public string? Comment { get; set; }

        [Required]
        [MinLength(1, ErrorMessage = "At least one criterion score is required.")]
        public List<FeedbackScoreInputDTO> Scores { get; set; } = new List<FeedbackScoreInputDTO>();
    }

    // ============================================================
    // Output DTO — response to POST /api/Feedback
    // ============================================================
    public class FeedbackDTO
    {
        public int FeedbackId { get; set; }
        public NFD_FeedbackType Type { get; set; }
        public int TraineeId { get; set; }
        public int ModuleId { get; set; }
        public int? TrainerId { get; set; }
        public int? BatchId { get; set; }
        public string? Comment { get; set; }
        public DateTime SubmittedAt { get; set; }
        public List<FeedbackScoreInputDTO> Scores { get; set; } = new List<FeedbackScoreInputDTO>();
    }

    // ============================================================
    // Output DTO — GET /api/Feedback/trainer/{id} and /api/Feedback/batch/{id}
    // Aggregated summary: overall average, per-criterion average, comment list.
    // ============================================================
    public class FeedbackCriterionAverageDTO
    {
        public int CriterionId { get; set; }
        public string? Name { get; set; }
        public double Average { get; set; }
    }

    public class FeedbackCommentDTO
    {
        public string Comment { get; set; } = string.Empty;
        public DateTime Date { get; set; }
    }

    public class FeedbackSummaryDTO
    {
        public double AverageOverall { get; set; }
        public List<FeedbackCriterionAverageDTO> PerCriterion { get; set; } = new List<FeedbackCriterionAverageDTO>();
        public List<FeedbackCommentDTO> Comments { get; set; } = new List<FeedbackCommentDTO>();
        public int ResponseCount { get; set; }
    }

    // ============================================================
    // Output DTO — GET /api/Feedback/module/{moduleId}/trainee/{traineeId}/pending
    // ============================================================
    public class FeedbackPendingDTO
    {
        public bool TrainerRatingPending { get; set; }
        public bool BatchRatingPending { get; set; }
    }
}
