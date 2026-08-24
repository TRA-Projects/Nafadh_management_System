using Nafadh_Backend.DTOs;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    /// <summary>
    /// Aggregates the shared notification sources into one summary
    /// consumed by the notification bell across all portals.
    /// </summary>
    public class NotificationSummaryService : INotificationSummaryService
    {
        private readonly INotificationRepository _notificationRepository;
        private readonly IMessageRepository _messageRepository;
        private readonly IConversationRepository _conversationRepository;

        public NotificationSummaryService(
            INotificationRepository notificationRepository,
            IMessageRepository messageRepository,
            IConversationRepository conversationRepository)
        {
            _notificationRepository = notificationRepository;
            _messageRepository = messageRepository;
            _conversationRepository = conversationRepository;
        }

        public async Task<NotificationSummaryDTO> GetForUserAsync(
            int userId,
            bool includeAllConversations)
        {
            // EF Core DbContext is scoped and shared by these repositories.
            // Execute each query sequentially to avoid concurrent operations
            // on the same DbContext instance.
            var notifications =
                await _notificationRepository.GetUnreadCountAsync(userId);

            // Count only direct messages so threaded Communication messages
            // are not counted twice in the shared bell.
            var directMessages =
                await _messageRepository.GetUnreadDirectMessageCountAsync(userId);

            // Count unread Communication threads as one notification per
            // conversation rather than counting every individual message.
            var conversations =
                await _conversationRepository.GetUnreadConversationCountAsync(
                    userId,
                    includeAllConversations);

            // The bell exposes one shared total while keeping the individual
            // source counts available for the frontend.
            return new NotificationSummaryDTO
            {
                NotificationsCount = notifications,
                DirectMessagesCount = directMessages,
                ConversationsCount = conversations,
                TotalCount = notifications + directMessages + conversations
            };
        }
    }
}