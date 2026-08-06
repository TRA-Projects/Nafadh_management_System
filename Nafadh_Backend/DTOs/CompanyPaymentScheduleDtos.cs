using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class CreateCompanyPaymentScheduleDto
    {
        public int CompanyPaymentId { get; set; }

        public int NumberOfMonths { get; set; }

        public decimal TotalAmount { get; set; }

        public DateTime StartDate { get; set; }
    }


    public class MarkCompanyPaymentSchedulePaidDto
    {
        public DateTime PaidDate { get; set; }
    }


    public class CompanyPaymentScheduleResponseDto
    {
        public int ScheduleId { get; set; }

        public int MonthNumber { get; set; }

        public string? MonthLabel { get; set; }

        public DateTime DueDate { get; set; }

        public decimal Amount { get; set; }

        public NFD_PaymentScheduleStatus Status { get; set; }

        public DateTime? PaidDate { get; set; }

        public int CompanyPaymentId { get; set; }
    }
}