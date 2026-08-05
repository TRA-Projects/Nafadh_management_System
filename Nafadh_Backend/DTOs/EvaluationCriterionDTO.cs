using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class EvaluationCriterionDTO
    {
        // Input DTO => Used when creating or updating Evaluation Criterion
        public class Input
        {
            // Related Evaluation Template Id => The criterion must belong to a template
            [Range(1, int.MaxValue, ErrorMessage = "TemplateId must be greater than 0")]
            public int TemplateId { get; set; }

            // Name of the evaluation criterion => Example: Communication, Discipline, Performance
            [Required(ErrorMessage = "Criterion name is required")]
            public string Name { get; set; } = string.Empty;

            // Weight percentage of this criterion => Example: 20 means 20%
            [Range(0.01, 100, ErrorMessage = "Weight must be between 0.01 and 100")]
            public decimal Weight { get; set; }
        }

        // =====================================================
        // Output DTO => Used when returning basic criterion information
        public class Output
        {
            // Primary Key
            public int CriteriaId { get; set; }

            // Related Template Id
            public int TemplateId { get; set; }

            // Criterion name
            public string Name { get; set; } = string.Empty;

            // Criterion weight percentage
            public decimal Weight { get; set; }
        }

        // =====================================================
        // Details DTO => Used when returning full criterion information
        // including related Evaluation Template
        public class Details
        {
            // Primary Key
            public int CriteriaId { get; set; }

            // Criterion name
            public string Name { get; set; } = string.Empty;

            // Weight percentage
            public decimal Weight { get; set; }

            // Related Evaluation Template details
            public EvaluationTemplateDTO.Output Template { get; set; }
        }
    }
}