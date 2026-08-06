namespace Nafadh_Backend.DTOs
{
    public class TraineePaymentSchedule
    {
        public class CreateTraineePaymentScheduleDto
        {
            public int TraineePaymentId { get; set; }

            // Number of installments to generate
            public int NumberOfInstallments { get; set; }

            // Total payment amount
            public decimal TotalAmount { get; set; }

            // First installment due date
            public DateTime FirstDueDate { get; set; }
        }


        public class MarkPaidDto
        {
            public DateTime PaymentDate { get; set; }

            public string? Notes { get; set; }
        }

    }
}
