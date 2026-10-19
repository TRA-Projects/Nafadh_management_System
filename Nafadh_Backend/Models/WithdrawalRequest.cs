using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.Models
{
    public class NFD_WithdrawalRequest
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int TraineeId { get; set; }

        [ForeignKey("TraineeId")]
        public virtual NFD_Trainee? Trainee { get; set; }

        [Required]
        [MaxLength(1000)]
        public string Reason { get; set; } = string.Empty;

        public NFD_WithdrawalRequestStatus Status { get; set; } = NFD_WithdrawalRequestStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ReviewedAt { get; set; }

        public string? AdminNotes { get; set; }
    }
}