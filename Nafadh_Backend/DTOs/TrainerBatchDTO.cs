using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class TrainerBatchDto
    {
        // Unique identifier of the batch
        public int BatchId { get; set; }

        // Display name of the batch
        public string? BatchName { get; set; }

        // Batch start date
        public DateTime? StartDate { get; set; }

        // Batch end date
        public DateTime? EndDate { get; set; }

        // Current batch status (Upcoming, Ongoing, Completed, Cancelled)
        public NFD_BatchStatus Status { get; set; }
    }
}
