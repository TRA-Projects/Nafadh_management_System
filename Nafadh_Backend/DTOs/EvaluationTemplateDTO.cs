using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class EvaluationTemplateDTO
    {
        // Input DTO => Used when creating or updating Evaluation Template
        public class Input
        {
            // Type of evaluation template => Example: Trainer Evaluation, Member Evaluation
            [Required(ErrorMessage = "Template type is required")]
            public string Type { get; set; } = string.Empty;


            // User who created the template
            [Range(1, int.MaxValue, ErrorMessage = "CreatedByUserId must be greater than 0")]
            public int CreatedByUserId { get; set; }
        }

        // ============================
        // Output DTO => Used when returning basic template data
        public class Output
        {
            // Primary Key
            public int TemplateId { get; set; }

            // Template type/name
            public string Type { get; set; } = string.Empty;

            // Creator user id
            public int CreatedByUserId { get; set; }
        }

        // ============================
        // Details DTO => Used when returning full details
        // including related Evaluation Criteria
        public class Details
        {
            // Primary Key
            public int TemplateId { get; set; }


            // Evaluation template type
            public string Type { get; set; } = string.Empty;


            // User who created the template
            public int CreatedByUserId { get; set; }


            // Criteria list related to this template
            public List<EvaluationCriterionDTO.Output> Criteria { get; set; }
                = new List<EvaluationCriterionDTO.Output>();
        }
    }
}
