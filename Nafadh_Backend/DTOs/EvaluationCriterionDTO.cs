using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    // ============================
    // Input DTO => Used when creating or updating Evaluation Criterion
    public class EvaluationCriterionInputDTO
    {
        [Required]
        public int TemplateId { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Range(0, 100)]
        public decimal Weight { get; set; }
    }

    // ============================
    // Output DTO
    public class EvaluationCriterionOutputDTO
    {
        public int CriteriaId { get; set; }
        public int TemplateId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Weight { get; set; }
    }

    // ============================
    // Details DTO
    public class EvaluationCriterionDetailsDTO
    {
        public int CriteriaId { get; set; }
        public int TemplateId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Weight { get; set; }
    }
}