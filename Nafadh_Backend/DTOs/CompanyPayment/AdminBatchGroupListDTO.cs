namespace Nafadh_Backend.DTOs.CompanyPayment
{
    public class AdminBatchGroupListDTO
    {
        public int ConversationId { get; set; }

        public string GroupName { get; set; } = string.Empty;

        public int BatchId { get; set; }

        public string BatchName { get; set; } = string.Empty;

        public int TrainerUserId { get; set; }

        public string TrainerName { get; set; } = string.Empty;

        public int MembersCount { get; set; }

        public string Status { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
    }
}
