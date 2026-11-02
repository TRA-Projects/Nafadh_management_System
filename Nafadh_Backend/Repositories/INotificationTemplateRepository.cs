
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface INotificationTemplateRepository
    {
        Task<List<NFD_NotificationTemplate>> GetAllAsync(
            string? portalCode = null,
            string? type = null);

        Task<NFD_NotificationTemplate?> GetByIdAsync(int id);

        Task<NFD_NotificationTemplate?> GetByCodeAsync(string code);

        Task<bool> CodeExistsAsync(
            string code,
            int? excludeId = null);

        Task AddAsync(NFD_NotificationTemplate template);

        Task UpdateAsync(NFD_NotificationTemplate template);
    }
}
