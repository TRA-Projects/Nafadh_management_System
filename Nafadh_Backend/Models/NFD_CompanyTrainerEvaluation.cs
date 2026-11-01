
using System;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Models
{
    public class NFD_CompanyTrainerEvaluation
    {
        [Key]
        public int EvaluationId { get; set; }

        public int SupervisorId { get; set; }

        public int TrainerId { get; set; }

        [Range(1, 5)]
        public int Rating { get; set; }

        [MaxLength(2000)]
        public string? Comment { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public NFD_CompanySupervisor Supervisor { get; set; } = null!;

        public NFD_Trainer Trainer { get; set; } = null!;
    }
}
