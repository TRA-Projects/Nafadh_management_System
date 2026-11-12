using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Services
{
    public interface INotificationService
    {
        Task<List<NotificationDTO>> GetByUserIdAsync(int userId);
        Task CreateAsync(CreateNotificationDTO dto);
        Task MarkAsReadAsync(int id);
        Task MarkAsReadAsync(int id, int userId);
        Task MarkAllAsReadAsync(int userId);
        Task<UnreadCountDTO> GetUnreadCountAsync(int userId);
        Task<int> SendToBatchAsync( int batchId, int? traineeId,string title, string message);
        Task<bool> DeleteAsync(int id, int userId);
    }
}
