namespace Nafadh_Backend.DTOs
{
    public class SendBatchNotificationDTO
    {
        public int BatchId { get; set; }

        public int? TraineeId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;
    }
}