using System;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class BatchDto
    {
        public int BatchId { get; set; }
        public int ProgramId { get; set; }
        public string BatchName { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty; // لحل مشكلة "غير محدد"
        public string TrackName { get; set; } = string.Empty;   // لحل مشكلة "عام"
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal Capacity { get; set; }
        public int TotalTraineesCount { get; set; }            // عدد المتدربين
        public int IssuedCertificatesCount { get; set; }        // الشهادات الصادرة (لحل مشكلة 0/0)
        public NFD_BatchStatus Status { get; set; }


        public string Department { get; set; } = string.Empty;
        public int EnrolledTraineesCount { get; set; }
        public int AttendanceRate { get; set; } = 95; 
        public int ProgressPercentage { get; set; }   
    }

    public class CreateBatchDto
    {
        public int ProgramId { get; set; }
        public string BatchName { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal Capacity { get; set; }
    }

    public class UpdateBatchDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal Capacity { get; set; }
        public NFD_BatchStatus Status { get; set; }
    }

    // Shape of response for GET /api/Batch/{id}/trainees.
    public class BatchTraineeDto
    {
        public int TraineeId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public NFD_EnrollmentCompletionStatus? CompletionStatus { get; set; }
    }

    // Shape of response for GET /api/Batch/{id}/capacity.
    public class BatchCapacityDto
    {
        public int BatchId { get; set; }
        public decimal Capacity { get; set; }
        public int EnrolledCount { get; set; }
        public decimal AvailableSeats => Capacity - EnrolledCount;
    }
}