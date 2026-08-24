namespace Nafadh_Backend.DTOs
{
    /// <summary>
    /// Shared unread counters consumed by the common portal header.
    /// The API returns the real database counts for the authenticated user.
    /// </summary>
    public class NotificationSummaryDTO
    {
        public int NotificationsCount { get; set; }
        public int DirectMessagesCount { get; set; }
        public int ConversationsCount { get; set; }
        public int TotalCount { get; set; }
    }
}
