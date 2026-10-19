
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    // إنشاء جلسة مباشرة
    public class CreateTrainerLiveSessionDto
    {
        [Range(1, int.MaxValue)]
        public int BatchId { get; set; }

        [Required]
        [StringLength(200)]
        public string Topic { get; set; } = string.Empty;

        public DateTime SessionDate { get; set; }

        [Required]
        [StringLength(20)]
        public string StartTime { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string EndTime { get; set; } = string.Empty;

        [Required]
        [StringLength(300)]
        public string MeetingLink { get; set; } = string.Empty;

        public string? LearningObjectives { get; set; }
    }

    // تعديل بيانات جلسة
    public class UpdateTrainerLiveSessionDto
    {
        [StringLength(200)]
        public string? Topic { get; set; }

        public DateTime? SessionDate { get; set; }

        [StringLength(20)]
        public string? StartTime { get; set; }

        [StringLength(20)]
        public string? EndTime { get; set; }

        [StringLength(300)]
        public string? MeetingLink { get; set; }

        public string? LearningObjectives { get; set; }

        public string? Summary { get; set; }
    }

    // تأجيل جلسة وتحديد موعد جديد
    public class PostponeTrainerLiveSessionDto
    {
        [Required]
        public DateTime? NewSessionDate { get; set; }

        [Required]
        [StringLength(20)]
        public string? NewStartTime { get; set; }

        [Required]
        [StringLength(20)]
        public string? NewEndTime { get; set; }

        [StringLength(500)]
        public string? Reason { get; set; }
    }

    // طلب تغيير حالة الجلسة
    public class ChangeTrainerLiveSessionStatusDto
    {
        [Required]
        public NFD_SessionStatus? Status { get; set; }

        [StringLength(500)]
        public string? Reason { get; set; }
    }

    // تفاصيل الجلسة المعروضة للمدرب
    public class TrainerLiveSessionDto
    {
        public int SessionId { get; set; }
        public int BatchId { get; set; }
        public int TrainerId { get; set; }

        public string? Topic { get; set; }
        public DateTime SessionDate { get; set; }
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }

        public string? MeetingLink { get; set; }
        public string? LearningObjectives { get; set; }
        public string? Summary { get; set; }

        public NFD_SessionStatus Status { get; set; }

        public string? RecordingUrl { get; set; }

        // حقول مستقبلية: لا توجد لها أعمدة مؤكدة حاليًا
        public bool? IsRecordingVisibleToTrainees { get; set; }
        public bool? IsLive { get; set; }
    }

    // البحث والتصفية في الجلسات
    public class TrainerLiveSessionFilterDto
    {
        public int? BatchId { get; set; }
        public NFD_SessionStatus? Status { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? Search { get; set; }

        [Range(1, int.MaxValue)]
        public int Page { get; set; } = 1;

        [Range(1, 100)]
        public int PageSize { get; set; } = 20;
    }

    // نتيجة قائمة جلسات مع صفحات
    public class TrainerLiveSessionPagedResultDto
    {
        public List<TrainerLiveSessionDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    // تحديث ملخص الجلسة
    public class UpdateTrainerLiveSessionSummaryDto
    {
        [Required]
        public string Summary { get; set; } = string.Empty;
    }

    // طلب تغيير إتاحة التسجيل للمتدربين
    public class UpdateTrainerRecordingVisibilityDto
    {
        public bool IsVisibleToTrainees { get; set; }
    }

    // بيانات التسجيل المعروضة
    public class TrainerSessionRecordingDto
    {
        public int SessionId { get; set; }
        public string? RecordingUrl { get; set; }
        public bool? IsVisibleToTrainees { get; set; }
    }

    // بيانات حضور متدرب في جلسة
    public class TrainerSessionAttendanceDto
    {
        public int AttendanceId { get; set; }
        public int SessionId { get; set; }
        public int TraineeId { get; set; }
        public NFD_AttendanceStatus ? Status { get; set; }
        public string? Note { get; set; }
    }

    // تحديث حضور متدرب
    public class UpdateTrainerSessionAttendanceDto
    {
        [Required]
        public NFD_AttendanceStatus? Status { get; set; }

        public string? Note { get; set; }
    }
}
