using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs.CompanyPayment;

public class CreateCompanyPaymentDto
{
    public decimal TotalAmount { get; set; }

    public int CompanyId { get; set; }

    public int BatchId { get; set; }
}


public class UpdateCompanyPaymentStatusDto
{
    public NFD_PaymentStatus Status { get; set; }
}


public class CompanyPaymentResponseDto
{
    public int CompanyPaymentId { get; set; }

    public decimal TotalAmount { get; set; }

    public NFD_PaymentStatus Status { get; set; }


    public int CompanyId { get; set; }

    public string CompanyName { get; set; } = string.Empty;


    public int BatchId { get; set; }


    public List<CompanyPaymentScheduleResponseDto> PaymentSchedules
    {
        get; set;
    } = new();
}