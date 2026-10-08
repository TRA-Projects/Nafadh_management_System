using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Enums.Nafadh_Backend.Enums;
using Nafadh_Backend.Interfaces;
using Nafadh_Backend.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Nafadh_Backend.Repositories
{
    public class RemediationRepository : IRemediationRepository
    {
        private readonly Nafadhcontext _context;

        public RemediationRepository(Nafadhcontext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<RemediationRequest>> GetAllWithDetailsAsync(string? searchTerm = null, int? status = null)
        {
            var query = _context.Set<RemediationRequest>()
                .Include(r => r.Company)
                .Include(r => r.Warning)
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var term = searchTerm.Trim().ToLower();
                query = query.Where(r =>
                    (r.Company != null && r.Company.CompanyName.ToLower().Contains(term)) ||
                    ($"REQ-{r.RequestId}").ToLower().Contains(term) ||
                    ($"CW-{r.WarningId}").ToLower().Contains(term));
            }

            if (status.HasValue)
            {
                query = query.Where(r => (int)r.Status == status.Value);
            }

            return await query.OrderByDescending(r => r.SubmissionDate).ToListAsync();
        }

        public async Task<RemediationRequest?> GetByIdWithDetailsAsync(int id)
        {
            return await _context.Set<RemediationRequest>()
                .Include(r => r.Company)
                .Include(r => r.Warning)
                .FirstOrDefaultAsync(r => r.RequestId == id);
        }

        public async Task<RemediationRequest?> GetByIdAsync(int id)
        {
            return await _context.Set<RemediationRequest>().FindAsync(id);
        }

        public async Task AddAsync(RemediationRequest entity)
        {
            await _context.Set<RemediationRequest>().AddAsync(entity);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(RemediationRequest entity)
        {
            _context.Set<RemediationRequest>().Update(entity);

            // عند استكمال قبول الطلب (Approved)، يتم تسوية حالة الإنذار الأصلي تلقائياً
            if (entity.Status == NFD_RemediationStatus.Approved)
            {
                var warning = await _context.Set<NFD_Warning>().FindAsync(entity.WarningId);
                if (warning != null)
                {
                    warning.Status = NFD_WarningStatus.Resolved;
                    warning.Resolution = entity.ReviewNotes ?? entity.RequestedAction;
                    _context.Set<NFD_Warning>().Update(warning);
                }
            }

            await _context.SaveChangesAsync();
        }
    }
}