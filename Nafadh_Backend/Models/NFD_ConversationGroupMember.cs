namespace Nafadh_Backend.Models
{
    public class NFD_ConversationGroupMember
    {
        public int Id { get; set; }

        public int ConversationId { get; set; }

        public int UserId { get; set; }

        public int BatchId { get; set; }
    }
}
