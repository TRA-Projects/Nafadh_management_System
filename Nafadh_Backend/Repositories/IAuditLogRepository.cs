using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IAuditLogRepository
    {
        Task<IEnumerable<AuditLogDto>> GetAllAsync(int? userId, string? entityName, DateTime? fromDate, DateTime? toDate);
        Task<AuditLogDto?> GetByIdAsync(int id);
        Task AddAsync(NFD_AuditLog log);
        Task<IEnumerable<AuditLogDto>> GetByEntityAsync(string entityName, int entityId);
        Task<IEnumerable<AuditLogDto>> GetByUserIdAsync(int userId);
    }
}