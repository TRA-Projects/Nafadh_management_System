using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Services
{
    public interface INotificationTemplateService
    {
        Task<List<NotificationTemplateDTO>> GetAllAsync(
            string? portalCode = null,
            string? type = null);

        Task<NotificationTemplateDTO?> GetByIdAsync(int id);

        // Get an active Email template using its unique code.
        Task<NotificationTemplateDTO?> GetActiveByCodeAsync(
            string code,
            string? portalCode = null);

        Task<NotificationTemplateDTO> CreateAsync(
            CreateNotificationTemplateDTO dto);

        Task<NotificationTemplateDTO?> UpdateAsync(
            int id,
            UpdateNotificationTemplateDTO dto);

        Task<bool> UpdateStatusAsync(
            int id,
            bool isActive);
    }
}