using System;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class BatchDto
    {
        public int BatchId { get; set; }
        public int ProgramId { get; set; }
        public string BatchName { get; set; } = string.Empty;

        // الشركة المالكة للدفعة
        public int? CompanyId { get; set; }
        public string CompanyName { get; set; } = string.Empty;

        // المسار
        public int TrackId { get; set; }
        public string TrackName { get; set; } = string.Empty;

        // المدرب المشرف (مطابق للاسم في الفرونت)
        public string InstructorName { get; set; } = string.Empty;
        public string SupervisorTrainer => InstructorName;

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal Capacity { get; set; }
        public int TotalTraineesCount { get; set; }
        public int IssuedCertificatesCount { get; set; }
        public NFD_BatchStatus Status { get; set; }

        public string Department { get; set; } = string.Empty;
        public int EnrolledTraineesCount { get; set; }

        // أرقام حقيقية (بدون معادلات وهمية)
        public int AttendanceRate { get; set; }
        public int ProgressPercentage { get; set; }

        // حالة خطة التدريب (ليتعرف عليها الفرونت)
        public string CoursePlanStatus { get; set; } = "لم تُرفع بعد";
        public bool HasCoursePlan { get; set; } = false;
        public int? CoursePlanId { get; set; }
    }

    public class CreateBatchDto
    {
        public int ProgramId { get; set; }
        public int? CompanyId { get; set; }
        public string BatchName { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal Capacity { get; set; }
    }

    public class UpdateBatchDto
    {
        public string? BatchName { get; set; }
        public int ProgramId { get; set; }
        public int? CompanyId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal Capacity { get; set; }
        public NFD_BatchStatus Status { get; set; }
    }

    // 🟢 تم توسيعه ليرسل كل بيانات المتدرب الحقيقية للجدول
    public class BatchTraineeDto
    {
        public int TraineeId { get; set; }
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? FileUrl { get; set; }
        public string University { get; set; } = string.Empty;
        public string Major { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string Status { get; set; } = "قيد التدريب";
        public NFD_EnrollmentCompletionStatus? CompletionStatus { get; set; }
    }

    public class BatchCapacityDto
    {
        public int BatchId { get; set; }
        public decimal Capacity { get; set; }
        public int EnrolledCount { get; set; }
        public decimal AvailableSeats => Capacity - EnrolledCount;
    }
}