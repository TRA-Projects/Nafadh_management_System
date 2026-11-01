namespace Nafadh_Backend.DTOs
{
    public class SupervisorEnrollmentDto
    {
        public int EnrollmentId { get; set; }
        public int TraineeId { get; set; }
        public string TraineeName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public int BatchId { get; set; }
        public string BatchLabel { get; set; } = string.Empty;
        public int? SupervisorId { get; set; }
    }
}