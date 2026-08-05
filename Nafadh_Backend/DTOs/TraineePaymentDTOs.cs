namespace Nafadh_Backend.DTOs
{
    public class TraineePaymentDTO
    {
        public int TraineePaymentId { get; set; }
        public int EnrollmentId { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class CreateTraineePaymentDTO
    {
        public int EnrollmentId { get; set; }
        public decimal TotalAmount { get; set; }
    }
}
