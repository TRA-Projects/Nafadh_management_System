using System;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class BatchDto
    {
        public int BatchId { get; set; }
        public int ProgramId { get; set; }
        public string BatchName { get; set; } = string.Empty;

        // Returns the evaluation weights configured for this batch.
        public decimal AttendanceWeight { get; set; }
        public decimal QuizzesWeight { get; set; }
        public decimal TasksWeight { get; set; }
        public decimal ProjectsWeight { get; set; }

        // Admin-configurable classification thresholds per batch.
        public decimal ExcellentMinScore { get; set; }
        public decimal ExcellentMinAttendance { get; set; }

        public decimal VeryGoodMinScore { get; set; }
        public decimal VeryGoodMinAttendance { get; set; }

        public decimal GoodMinScore { get; set; }
        public decimal AtRiskMinAttendance { get; set; }

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
        public int CompaniesCount { get; set; }
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

        // Allows Admin to configure evaluation weights when creating a batch.
        public decimal AttendanceWeight { get; set; } = 30m;
        public decimal QuizzesWeight { get; set; } = 20m;
        public decimal TasksWeight { get; set; } = 50m;
        public decimal ProjectsWeight { get; set; } = 0m;


        // Classification settings configured by Admin.
        public decimal ExcellentMinScore { get; set; } = 80m;
        public decimal ExcellentMinAttendance { get; set; } = 90m;

        public decimal VeryGoodMinScore { get; set; } = 70m;
        public decimal VeryGoodMinAttendance { get; set; } = 80m;

        public decimal GoodMinScore { get; set; } = 60m;
        public decimal AtRiskMinAttendance { get; set; } = 80m;

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

        // Nullable to preserve existing weights when older clients update batch details.
        public decimal? AttendanceWeight { get; set; }
        public decimal? QuizzesWeight { get; set; }
        public decimal? TasksWeight { get; set; }
        public decimal? ProjectsWeight { get; set; }

        // Nullable to preserve existing settings when older clients update batches.
        public decimal? ExcellentMinScore { get; set; }
        public decimal? ExcellentMinAttendance { get; set; }

        public decimal? VeryGoodMinScore { get; set; }
        public decimal? VeryGoodMinAttendance { get; set; }

        public decimal? GoodMinScore { get; set; }
        public decimal? AtRiskMinAttendance { get; set; }

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