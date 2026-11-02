
using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Services
{
    public interface INotificationTemplateService
    {
        Task<List<NotificationTemplateDTO>> GetAllAsync(
            string? portalCode = null,
            string? type = null);

        Task<NotificationTemplateDTO?> GetByIdAsync(int id);

        Task<NotificationTemplateDTO> CreateAsync(
            CreateNotificationTemplateDTO dto);

        Task<NotificationTemplateDTO?> UpdateAsync(
            int id,
            UpdateNotificationTemplateDTO dto);

        Task<bool> UpdateStatusAsync(
            int id,
            bool isActive);

        Task<NotificationTemplateDTO?> GetActiveByCodeAsync(
    string code,
    string type = "Email");
    }
}
