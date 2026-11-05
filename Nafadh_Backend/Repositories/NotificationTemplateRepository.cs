
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class NotificationTemplateRepository
        : INotificationTemplateRepository
    {
        private readonly Nafadhcontext _context;

        public NotificationTemplateRepository(Nafadhcontext context)
        {
            _context = context;
        }

        public async Task<List<NFD_NotificationTemplate>> GetAllAsync(
            string? portalCode = null,
            string? type = null)
        {
            var query = _context.Set<NFD_NotificationTemplate>()
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(portalCode))
            {
                query = query.Where(x => x.PortalCode == portalCode);
            }

            if (!string.IsNullOrWhiteSpace(type))
            {
                query = query.Where(x => x.Type == type);
            }

            return await query
                .OrderBy(x => x.Name)
                .ToListAsync();
        }

        public async Task<NFD_NotificationTemplate?> GetByIdAsync(int id)
        {
            return await _context.Set<NFD_NotificationTemplate>()
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<NFD_NotificationTemplate?> GetByCodeAsync(
            string code)
        {
            return await _context.Set<NFD_NotificationTemplate>()
                .FirstOrDefaultAsync(x => x.Code == code);
        }

        public async Task<bool> CodeExistsAsync(
            string code,
            int? excludeId = null)
        {
            var query = _context.Set<NFD_NotificationTemplate>()
                .AsQueryable();

            if (excludeId.HasValue)
            {
                query = query.Where(x => x.Id != excludeId.Value);
            }

            return await query.AnyAsync(x => x.Code == code);
        }

        public async Task AddAsync(NFD_NotificationTemplate template)
        {
            await _context.Set<NFD_NotificationTemplate>()
                .AddAsync(template);

            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(NFD_NotificationTemplate template)
        {
            _context.Set<NFD_NotificationTemplate>()
                .Update(template);

            await _context.SaveChangesAsync();
        }
    }
}
