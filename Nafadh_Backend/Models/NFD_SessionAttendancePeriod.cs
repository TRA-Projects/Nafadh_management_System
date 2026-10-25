
using System;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Models
{
    // Trainer Portal - Tracks each LiveKit attendance period.
    public class NFD_SessionAttendancePeriod
    {
        [Key]
        public int PeriodId { get; set; }

        // Trainer Portal - The session attended.
        public int SessionId { get; set; }
        public NFD_Session Session { get; set; } = null!;

        // Trainer Portal - The trainee who joined.
        public int TraineeId { get; set; }
        public NFD_Trainee Trainee { get; set; } = null!;

        // Trainer Portal - Unique LiveKit participant connection.
        [Required]
        [MaxLength(200)]
        public string ParticipantSid { get; set; } = string.Empty;

        // Trainer Portal - UTC timestamps for joining and leaving.
        public DateTime JoinedAtUtc { get; set; }
        public DateTime? LeftAtUtc { get; set; }

        // Trainer Portal - Calculated attendance duration in seconds.
        public int DurationSeconds { get; set; }
    }
}
