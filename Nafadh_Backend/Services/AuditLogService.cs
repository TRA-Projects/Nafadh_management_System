using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class AuditLogService : IAuditLogService
    {
        private readonly IAuditLogRepository _repository;

        public AuditLogService(IAuditLogRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<AuditLogDto>> GetAllLogsAsync(int? userId, string? entityName, DateTime? fromDate, DateTime? toDate)
        {
            return await _repository.GetAllAsync(userId, entityName, fromDate, toDate);
        }

        public async Task<AuditLogDto?> GetLogByIdAsync(int id)
        {
            return await _repository.GetByIdAsync(id);
        }

        public async Task CreateLogAsync(NFD_AuditLog log)
        {
            if (log.Timestamp == default)
            {
                log.Timestamp = DateTime.UtcNow;
            }

            await _repository.AddAsync(log);
        }

        public async Task<IEnumerable<AuditLogDto>> GetEntityHistoryAsync(string entityName, int entityId)
        {
            return await _repository.GetByEntityAsync(entityName, entityId);
        }

        public async Task<IEnumerable<AuditLogDto>> GetUserHistoryAsync(int userId)
        {
            return await _repository.GetByUserIdAsync(userId);
        }
    }
}