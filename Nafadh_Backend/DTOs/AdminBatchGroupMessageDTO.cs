namespace Nafadh_Backend.DTOs
{
    public class AdminBatchGroupMessageDTO
    {
        public int MessageId { get; set; }

        public int ConversationId { get; set; }

        public int SenderId { get; set; }

        public string SenderName { get; set; } = string.Empty;

        public string Content { get; set; } = string.Empty;

        public DateTime SentDate { get; set; }

        public string Status { get; set; } = string.Empty;

        public string? AttachmentUrl { get; set; }

        public string? AttachmentFileName { get; set; }
    }
}
