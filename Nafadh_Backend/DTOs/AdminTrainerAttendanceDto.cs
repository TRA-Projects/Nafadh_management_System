using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class AdminTrainerAttendanceDto
    {
        public int TrainerAttendanceId { get; set; }
        public int TrainerId { get; set; }
        public string? TrainerName { get; set; }

        public int CompanyId { get; set; }
        public string? CompanyName { get; set; }

        public DateTime Date { get; set; }
        public NFD_TrainerAttendanceStatus Status { get; set; }

        public TimeSpan? CheckInTime { get; set; }
        public TimeSpan? CheckOutTime { get; set; }

        public string? Reason { get; set; }
        public string? ExcuseProofUrl { get; set; }

        public bool IsConfirmed { get; set; }
    }
}
