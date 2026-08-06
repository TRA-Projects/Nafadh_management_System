using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{

    // ── Add Rubric DTO ─────────────────────────────────────────
    public class AddRubricDto
    {

        [Required(ErrorMessage = "Criterion is required.")]
        [MaxLength(150)]
        public string Criterion { get; set; } = string.Empty;


        [Required(ErrorMessage = "Weight is required.")]
        public decimal Weight { get; set; }


        [Required(ErrorMessage = "Max Score is required.")]
        public decimal MaxScore { get; set; }


        [Required(ErrorMessage = "Task Id is required.")]
        public int TaskId { get; set; }

    }



    // ── Update Rubric DTO ─────────────────────────────────────────
    public class UpdateRubricDto
    {

        [Required(ErrorMessage = "Criterion is required.")]
        [MaxLength(150)]
        public string Criterion { get; set; } = string.Empty;


        [Required(ErrorMessage = "Weight is required.")]
        public decimal Weight { get; set; }


        [Required(ErrorMessage = "Max Score is required.")]
        public decimal MaxScore { get; set; }

    }



    // ── Response Rubric DTO ─────────────────────────────────────────
    public class RubricResponseDto
    {

        public int RubricId { get; set; }


        public string Criterion { get; set; } = string.Empty;


        public decimal Weight { get; set; }


        public decimal MaxScore { get; set; }


        public int TaskId { get; set; }

    }

}