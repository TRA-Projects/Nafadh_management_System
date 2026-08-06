using Nafadh_Backend.Enums;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    // ============================
    // Input DTO => Used when creating or updating Evaluation Template
    public class EvaluationTemplateInputDTO
    {
        [Required(ErrorMessage = "Template type is required")]
        public NFD_EvaluationType Type { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "CreatedByUserId must be greater than 0")]
        public int CreatedByUserId { get; set; }
    }

    // ============================
    // Output DTO => Used when returning basic template data
    public class EvaluationTemplateOutputDTO
    {
        public int TemplateId { get; set; }
        public NFD_EvaluationType Type { get; set; }
        public int CreatedByUserId { get; set; }
    }

    // ============================
    // Details DTO => Used when returning full details
    // including related Evaluation Criteria
    public class EvaluationTemplateDetailsDTO
    {
        public int TemplateId { get; set; }
        public NFD_EvaluationType Type { get; set; }
        public int CreatedByUserId { get; set; }

        public List<EvaluationCriterionOutputDTO> Criteria { get; set; }
            = new List<EvaluationCriterionOutputDTO>();
    }
}