namespace Nafadh_Backend.DTOs
{
    // Company-only staff directory; independent of a trainer's current attendance eligibility.
    public sealed class CompanyTrainerDirectoryDTO
    {
        public int TrainerId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Specialty { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
