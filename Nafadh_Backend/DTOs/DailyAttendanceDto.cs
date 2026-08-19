using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class DailyAttendanceDto
    {
        public class DailyAttendanceReadDto
        {
            public int DailyAttendanceId { get; set; }
            public int EnrollmentId { get; set; }
            public DateTime Date { get; set; }
            public string? CheckInTime { get; set; }
            public string? CheckOutTime { get; set; }
            public NFD_AttendanceStatus Status { get; set; }
            public bool IsLate { get; set; }
            public string? Note { get; set; }
            public string? TraineeName { get; set; } 
            public string? BatchName { get; set; }
        }

        public class CreateDailyAttendanceDto
        {
            public int EnrollmentId { get; set; }
            public DateTime Date { get; set; }
            public string? CheckInTime { get; set; }
            public string? CheckOutTime { get; set; }
            public NFD_AttendanceStatus Status { get; set; }
            public bool IsLate { get; set; }
            public string? Note { get; set; }
        }

        public class UpdateDailyAttendanceDto
        {
            public string? CheckInTime { get; set; }
            public string? CheckOutTime { get; set; }
            public NFD_AttendanceStatus Status { get; set; }
            public bool IsLate { get; set; }
            public string? Note { get; set; }
        }


        // يُستخدم عند تسجيل انصراف المتدرب فقط (PUT /{id}/check-out)
        public class CheckOutDailyAttendanceDto
        {
            public string CheckOutTime { get; set; } = string.Empty;
        }

        // يُستخدم لعرض نسبة الالتزام بالحضور لتسجيل معيّن (GET /compliance-rate)
        public class ComplianceRateDto
        {
            public int EnrollmentId { get; set; }
            public int TotalDays { get; set; }
            public int PresentDays { get; set; }
            public decimal CompliancePercentage { get; set; }
        }
    }
}
