using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Nafadh_Backend.Models
{
    public class NFD_AdminProjectScore
    {
        [Key]
        public int AdminProjectScoreId { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        [Range(0, 100)]
        public decimal Score { get; set; }

        [MaxLength(1000)]
        public string? Notes { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public int EnrollmentId { get; set; }

        public NFD_Enrollment Enrollment { get; set; } = null!;
    }
}