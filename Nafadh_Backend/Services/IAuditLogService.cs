using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Services
{
    public interface IAuditLogService
    {
        Task<IEnumerable<AuditLogDto>> GetAllLogsAsync(int? userId, string? entityName, DateTime? fromDate, DateTime? toDate);
        Task<AuditLogDto?> GetLogByIdAsync(int id);
        Task CreateLogAsync(NFD_AuditLog log);
        Task<IEnumerable<AuditLogDto>> GetEntityHistoryAsync(string entityName, int entityId);
        Task<IEnumerable<AuditLogDto>> GetUserHistoryAsync(int userId);
    }
}