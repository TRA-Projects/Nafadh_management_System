using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class EvaluationCriterionDTO
    {
        // Input DTO => Used when creating or updating Evaluation Criterion
        public class Input
        {
            [Range(1, int.MaxValue, ErrorMessage = "TemplateId must be greater than 0")]
            public int TemplateId { get; set; }

            [Required(ErrorMessage = "Criterion name is required")]
            public string Name { get; set; } = string.Empty;

            [Range(0.01, 100, ErrorMessage = "Weight must be between 0.01 and 100")]
            public decimal Weight { get; set; }
        }

        // =====================================================
        // Output DTO => Used when returning basic criterion information
        public class Output
        {
            public int CriteriaId { get; set; }
            public int TemplateId { get; set; }
            public string Name { get; set; } = string.Empty;
            public decimal Weight { get; set; }
        }

        // =====================================================
        // Details DTO => Used when returning full criterion information
        // including related Evaluation Template
        public class Details
        {
            public int CriteriaId { get; set; }
            public string Name { get; set; } = string.Empty;
            public decimal Weight { get; set; }

            // Related Evaluation Template details
            public EvaluationTemplateDTO.Output Template { get; set; }
        }
    }
}