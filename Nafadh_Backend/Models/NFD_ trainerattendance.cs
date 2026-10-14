using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.Models
{
    /// <summary>
    /// Maps to the [NFD_TrainerAttendances] table.
    /// One row = the attendance status that a company recorded for one trainer on one day.
    /// </summary>
    public class NFD_TrainerAttendance
    {
        [Key]
        public int TrainerAttendanceId { get; set; }

        // Calendar day of the attendance (time part is ignored).
        [Column(TypeName = "date")]
        public DateTime Date { get; set; }

        public NFD_TrainerAttendanceStatus Status { get; set; }

        // Optional arrival time (used mainly with Late).
        public TimeSpan? CheckInTime { get; set; }

        // Optional departure time (used mainly with EarlyLeave).
        public TimeSpan? CheckOutTime { get; set; }

        // Reason / note written by the company.
        [MaxLength(500)]
        public string? Reason { get; set; }

        // Public URL of the uploaded excuse proof (image or PDF).
        [MaxLength(300)]
        public string? ExcuseProofUrl { get; set; }

        // Once the company confirms the day, the record becomes read-only.
        public bool IsConfirmed { get; set; }
        public DateTime? ConfirmedAt { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        public int CompanyId { get; set; }
        public NFD_Company Company { get; set; } = null!;

        public int TrainerId { get; set; }
        public NFD_Trainer Trainer { get; set; } = null!;
    }
}