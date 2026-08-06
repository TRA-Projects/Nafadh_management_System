using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class ExcuseDto
    {

        // يُستخدم عند عرض بيانات العذر (GET)
        public class ExcuseReadDto
        {
            public int ExcuseId { get; set; }
            public string Reason { get; set; } = string.Empty;
            public string? ProofUrl { get; set; }
            public NFD_ExcuseStatus Status { get; set; }
            public int DailyAttendanceId { get; set; }
            public int? ReviewedByUserId { get; set; }
        }

        // يُستخدم عند تقديم طلب عذر جديد (POST)
        public class CreateExcuseDto
        {
            public string Reason { get; set; } = string.Empty;
            public string? ProofUrl { get; set; }
            public int DailyAttendanceId { get; set; }
        }

        // يُستخدم عند اعتماد/رفض العذر من المشرف أو الهيئة (PUT /review)
        public class ReviewExcuseDto
        {
            public bool IsApproved { get; set; }
            public int ReviewedByUserId { get; set; }
        }
    }
}
