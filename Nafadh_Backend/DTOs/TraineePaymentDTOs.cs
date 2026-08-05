namespace Nafadh_Backend.DTOs
{
    public class TraineePaymentDTO
    {
        public int TraineePaymentId { get; set; }
        public int EnrollmentId { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;

        public List<TraineePaymentScheduleSummaryDTO> Schedules { get; set; } = new();
    }

    // نسخة مختصرة من كل قسط، تظهر جوا TraineePaymentDTO
    public class TraineePaymentScheduleSummaryDTO
    {
        public int ScheduleId { get; set; }
        public decimal MonthNumber { get; set; }
        public string? MonthLabel { get; set; }
        public DateTime DueDate { get; set; }
        public decimal Amount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? PaidDate { get; set; }
    }

    public class CreateTraineePaymentDTO
    {
        public int EnrollmentId { get; set; }
        public decimal TotalAmount { get; set; }
    }

    // للـ PUT /{id}/status
    public class UpdateTraineePaymentStatusDTO
    {
        public string Status { get; set; } = string.Empty; // "Pending", "Paid", "Overdue"...
    }
}
