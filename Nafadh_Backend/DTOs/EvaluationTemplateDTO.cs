using Nafadh_Backend.Enums;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class EvaluationTemplateDTO
    {
        // Input DTO => Used when creating or updating Evaluation Template
        public class Input
        {
            [Required(ErrorMessage = "Template type is required")]
            public NFD_EvaluationType Type { get; set; }

            [Range(1, int.MaxValue, ErrorMessage = "CreatedByUserId must be greater than 0")]
            public int CreatedByUserId { get; set; }
        }

        // ============================
        // Output DTO => Used when returning basic template data
        public class Output
        {
            public int TemplateId { get; set; }
            public NFD_EvaluationType Type { get; set; }
            public int CreatedByUserId { get; set; }
        }

        // ============================
        // Details DTO => Used when returning full details
        // including related Evaluation Criteria
        public class Details
        {
            public int TemplateId { get; set; }
            public NFD_EvaluationType Type { get; set; }
            public int CreatedByUserId { get; set; }

            // Criteria list related to this template
            public List<EvaluationCriterionDTO.Output> Criteria { get; set; }
                = new List<EvaluationCriterionDTO.Output>();
        }
    }
}
