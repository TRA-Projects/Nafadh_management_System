using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Services
{
    public interface INotificationSummaryService
    {
        Task<NotificationSummaryDTO> GetForUserAsync(int userId, bool includeAllConversations);
    }
}
