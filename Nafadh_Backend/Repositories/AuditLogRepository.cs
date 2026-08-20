using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class AuditLogRepository : IAuditLogRepository
    {
        private readonly Nafadhcontext _context;

        public AuditLogRepository(Nafadhcontext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<AuditLogDto>> GetAllAsync(int? userId, string? entityName, DateTime? fromDate, DateTime? toDate)
        {
            var query = _context.Set<NFD_AuditLog>()
                .AsNoTracking()
                .AsQueryable();

            if (userId.HasValue)
                query = query.Where(x => x.UserId == userId.Value);

            if (!string.IsNullOrEmpty(entityName))
                query = query.Where(x => x.EntityName == entityName);

            if (fromDate.HasValue)
                query = query.Where(x => x.Timestamp >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(x => x.Timestamp <= toDate.Value);

            return await query
                .OrderByDescending(x => x.Timestamp)
                .Select(x => new AuditLogDto
                {
                    LogId = x.LogId,
                    Action = x.Action,
                    UserId = x.UserId,
                    UserName = x.User != null ? x.User.FullName : "غير محدد (النظام)",
                    EntityName = x.EntityName,
                    EntityId = x.EntityId,
                    Timestamp = x.Timestamp
                })
                .ToListAsync();
        }

        public async Task<AuditLogDto?> GetByIdAsync(int id)
        {
            return await _context.Set<NFD_AuditLog>()
                .AsNoTracking()
                .Where(x => x.LogId == id)
                .Select(x => new AuditLogDto
                {
                    LogId = x.LogId,
                    Action = x.Action,
                    UserId = x.UserId,
                    UserName = x.User != null ? x.User.FullName : "غير محدد (النظام)",
                    EntityName = x.EntityName,
                    EntityId = x.EntityId,
                    Timestamp = x.Timestamp
                })
                .FirstOrDefaultAsync();
        }

        public async Task AddAsync(NFD_AuditLog log)
        {
            await _context.Set<NFD_AuditLog>().AddAsync(log);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<AuditLogDto>> GetByEntityAsync(string entityName, int entityId)
        {
            return await _context.Set<NFD_AuditLog>()
                .AsNoTracking()
                .Where(x => x.EntityName == entityName && x.EntityId == entityId)
                .OrderByDescending(x => x.Timestamp)
                .Select(x => new AuditLogDto
                {
                    LogId = x.LogId,
                    Action = x.Action,
                    UserId = x.UserId,
                    UserName = x.User != null ? x.User.FullName : "غير محدد (النظام)",
                    EntityName = x.EntityName,
                    EntityId = x.EntityId,
                    Timestamp = x.Timestamp
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<AuditLogDto>> GetByUserIdAsync(int userId)
        {
            return await _context.Set<NFD_AuditLog>()
                .AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.Timestamp)
                .Select(x => new AuditLogDto
                {
                    LogId = x.LogId,
                    Action = x.Action,
                    UserId = x.UserId,
                    UserName = x.User != null ? x.User.FullName : "غير محدد (النظام)",
                    EntityName = x.EntityName,
                    EntityId = x.EntityId,
                    Timestamp = x.Timestamp
                })
                .ToListAsync();
        }
    }
}