
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Nafadh_Backend.Models
{
    public class NFD_TrainerProjectGrade
    {
        [Key]
        public int TrainerProjectGradeId { get; set; }

        [Required]
        public int ProjectId { get; set; }

        public NFD_Project Project { get; set; } = null!;

        [Required]
        public int EnrollmentId { get; set; }

        public NFD_Enrollment Enrollment { get; set; } = null!;

        [Required]
        public int TrainerId { get; set; }

        public NFD_Trainer Trainer { get; set; } = null!;

        [Required]
        [Column(TypeName = "decimal(5,2)")]
        [Range(typeof(decimal), "0", "100")]
        public decimal Score { get; set; }

        [MaxLength(1000)]
        public string? Feedback { get; set; }

        public DateTime GradedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
    }
}
