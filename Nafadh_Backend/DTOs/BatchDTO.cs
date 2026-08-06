using Nafadh_Backend.Enums;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class BatchDTO
    {

        public class BatchDto
        {
            public int BatchId { get; set; }
            public int ProgramId { get; set; }
            public string BatchName { get; set; } = string.Empty;
            public DateTime StartDate { get; set; }
            public DateTime EndDate { get; set; }
            public decimal Capacity { get; set; }
            public NFD_BatchStatus Status { get; set; }
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

        //Shape of response for GET /api/Batch/{id}/trainees.
        public class BatchTraineeDto
        {
            public int TraineeId { get; set; }
            public string FullName { get; set; } = string.Empty;
            public NFD_EnrollmentCompletionStatus? CompletionStatus { get; set; }
        }

        // Shape of response for GET /api/Batch/{id}/capacity.
        // Computes seat availability dynamically based on total capacity and active enrollments.
        public class BatchCapacityDto
        {
            public int BatchId { get; set; }
            public decimal Capacity { get; set; }

         public int EnrolledCount { get; set; }

            // Computed property calculating remaining seats
         public decimal AvailableSeats => Capacity - EnrolledCount;
        }


    }
}
