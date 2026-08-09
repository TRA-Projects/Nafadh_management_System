using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class EvaluationDTO
    {
        public int EvaluationId { get; set; }
        public int EnrollmentId { get; set; }
        public int? TrainerId { get; set; }
        public int TemplateId { get; set; }
        public decimal Score { get; set; }
        public string? Notes { get; set; }

    }
    public class CreateEvaluationDTO
    {
        [Required(ErrorMessage = "Enrollment ID is required.")]
        public int EnrollmentId { get; set; }
        public int? TrainerId { get; set; }

        [Required(ErrorMessage = "Template ID is required.")] 
        public int TemplateId { get; set; }

        [Required(ErrorMessage = "Score is required.")]
        [Range(0.0, 100.0, ErrorMessage = "Score must be between 0 and 100.")]
        public decimal Score { get; set; }

        [StringLength(500, ErrorMessage = "Notes cannot exceed 500 characters.")]
        public string? Notes { get; set; }

        [Required(ErrorMessage = "Evaluator User ID is required.")]
        public int EvaluatorUserId { get; set; }
    }

    public class UpdateEvaluationDTO
    {
        [Required(ErrorMessage = "Score is required.")]
        [Range(0.0, 100.0, ErrorMessage = "Score must be between 0 and 100.")]
        public decimal Score { get; set; }


        [StringLength(500, ErrorMessage = "Notes cannot exceed 500 characters.")]
        public string? Notes { get; set; }
    }
}
