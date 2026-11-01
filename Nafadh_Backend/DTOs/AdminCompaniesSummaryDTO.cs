namespace Nafadh_Backend.DTOs
{
    public class AdminCompaniesSummaryDTO
    {
        public int TotalCompanies { get; set; }
        public int TotalHostedTrainees { get; set; }

        public List<AdminCompanyReportItemDTO> Companies { get; set; }
            = new();
    }

    public class AdminCompanyReportItemDTO
    {
        public int CompanyId { get; set; }
        public string? CompanyName { get; set; }
        public string? CommercialRegister { get; set; }
        public string? WorkField { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }

        public decimal Capacity { get; set; }
        public string? Status { get; set; }

        public int TraineesCount { get; set; }
        public int ProgramsCount { get; set; }
        public int BatchesCount { get; set; }

        public List<AdminCompanyProgramDTO> Programs { get; set; } = new();
    }
    public class AdminCompanyProgramDTO
    {
        public int ProgramId { get; set; }
        public string ProgramName { get; set; } = string.Empty;
        public string? TrackName { get; set; }

        public int BatchesCount { get; set; }
        public int TraineesCount { get; set; }

        public List<AdminCompanyBatchDTO> Batches { get; set; } = new();
    }

    public class AdminCompanyBatchDTO
    {
        public int BatchId { get; set; }
        public string BatchName { get; set; } = string.Empty;

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        public int TraineesCount { get; set; }
    }
}
