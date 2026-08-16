using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    // EDITED: Score is now a computed rollup, not a directly entered value — see
    // CriteriaBreakdown / CreateEvaluationDTO.CriteriaScores below.
    public class EvaluationDTO
    {
        public int EvaluationId { get; set; }
        public int EnrollmentId { get; set; }
        public int? TrainerId { get; set; }
        public int TemplateId { get; set; }
        public decimal Score { get; set; }
        public string? Notes { get; set; }

        // NEW: per-criterion breakdown behind the computed Score above.
        public List<EvaluationCriterionScoreDTO> CriteriaBreakdown { get; set; }
            = new List<EvaluationCriterionScoreDTO>();
    }

    // NEW: one entry in an evaluation's per-criterion breakdown.
    public class EvaluationCriterionScoreDTO
    {
        public int CriteriaId { get; set; }
        public string? CriterionName { get; set; }
        public decimal Score { get; set; }
        public decimal MaxPoints { get; set; }
        public decimal Weight { get; set; }
    }

    // NEW: one entry submitted by the trainer when creating an evaluation.
    public class CriterionScoreInputDTO
    {
        [Required(ErrorMessage = "CriteriaId is required.")]
        public int CriteriaId { get; set; }

        [Required(ErrorMessage = "Score is required.")]
        [Range(0, double.MaxValue, ErrorMessage = "Score must be zero or greater.")]
        public decimal Score { get; set; }
    }

    // EDITED: the flat Score field is removed — a trainer now submits one score
    // per criterion, and the Evaluation's overall Score is computed server-side
    // as the weighted rollup of CriteriaScores (see EvaluationService).
    public class CreateEvaluationDTO
    {
        [Required(ErrorMessage = "Enrollment ID is required.")]
        public int EnrollmentId { get; set; }
        public int? TrainerId { get; set; }

        [Required(ErrorMessage = "Template ID is required.")]
        public int TemplateId { get; set; }

        [StringLength(500, ErrorMessage = "Notes cannot exceed 500 characters.")]
        public string? Notes { get; set; }

        [Required(ErrorMessage = "Evaluator User ID is required.")]
        public int EvaluatorUserId { get; set; }

        // NEW: one score per criterion belonging to TemplateId.
        [Required(ErrorMessage = "CriteriaScores is required.")]
        [MinLength(1, ErrorMessage = "At least one criterion score is required.")]
        public List<CriterionScoreInputDTO> CriteriaScores { get; set; } = new List<CriterionScoreInputDTO>();
    }

    // EDITED: updating an evaluation now also resubmits the criteria scores,
    // consistent with CreateEvaluationDTO — Score is recomputed, not entered.
    public class UpdateEvaluationDTO
    {
        [StringLength(500, ErrorMessage = "Notes cannot exceed 500 characters.")]
        public string? Notes { get; set; }

        [Required(ErrorMessage = "CriteriaScores is required.")]
        [MinLength(1, ErrorMessage = "At least one criterion score is required.")]
        public List<CriterionScoreInputDTO> CriteriaScores { get; set; } = new List<CriterionScoreInputDTO>();
    }

    // NEW: fixed-bucket rollup for Admin Reports — GET /api/Evaluation/enrollment/{id}/by-bucket
    public class EvaluationBucketRollupDTO
    {
        public decimal? Technical { get; set; }
        public decimal? Behavioral { get; set; }
        public decimal? Final { get; set; }
        public decimal? CompanyEvaluation { get; set; }
        public decimal? TrainerPerformance { get; set; }
    }
}
