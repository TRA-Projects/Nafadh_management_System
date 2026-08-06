using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class SessionAttendanceDto
    {
        public int AttendanceId { get; set; }
        public int SessionId { get; set; }
        public int TraineeId { get; set; }
        public string TraineeName { get; set; } = string.Empty;
        public NFD_AttendanceStatus Status { get; set; }
        public string? Note { get; set; }
    }

    public class MarkAttendanceItemDto
    {
        public int TraineeId { get; set; }
        public NFD_AttendanceStatus Status { get; set; }
        public string? Note { get; set; }
    }

    public class MarkAttendanceBulkDto
    {
        public int SessionId { get; set; }
        public List<MarkAttendanceItemDto> Records { get; set; } = new List<MarkAttendanceItemDto>();
    }

    public class UpdateSessionAttendanceDto
    {
        public NFD_AttendanceStatus Status { get; set; }
        public string? Note { get; set; }
    }

    public class SessionAttendanceRateDto
    {
        public int SessionId { get; set; }
        public int TotalExpected { get; set; }
        public int PresentCount { get; set; }
        public double RatePercentage { get; set; }
    }


}
