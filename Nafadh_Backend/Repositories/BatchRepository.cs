using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class BatchRepository : IBatchRepository
    {
        private readonly Nafadhcontext _context;

        public BatchRepository(Nafadhcontext context)
        {
            _context = context;
        }

        public async Task<List<NFD_Batch>> GetAllAsync(int? programId, string? status, DateTime? from, DateTime? to)
        {
            var query = _context.NFD_Batches
                .Include(b => b.Program)
                    .ThenInclude(p => p.Track)
                .Include(b => b.Program)
                    .ThenInclude(p => p.CompanyPrograms)
                        .ThenInclude(cp => cp.Company)
                .Include(b => b.Enrollments)
                .Include(b => b.BatchTrainers)
                .ThenInclude(bt => bt.Trainer)
                .ThenInclude(t => t.User)
                .AsQueryable();

            if (programId.HasValue)
                query = query.Where(b => b.ProgramId == programId.Value);

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<NFD_BatchStatus>(status, true, out var parsedStatus))
                query = query.Where(b => b.Status == parsedStatus);

            if (from.HasValue)
                query = query.Where(b => b.StartDate >= from.Value);

            if (to.HasValue)
                query = query.Where(b => b.EndDate <= to.Value);

            return await query.ToListAsync();
        }



        public async Task<NFD_Batch?> GetByIdAsync(int id)
        {
            return await _context.NFD_Batches
                .Include(b => b.Program)
                    .ThenInclude(p => p.Track)
                .Include(b => b.Program)
                    .ThenInclude(p => p.CompanyPrograms)
                        .ThenInclude(cp => cp.Company)
                .Include(b => b.Enrollments)
                .FirstOrDefaultAsync(b => b.BatchId == id);
        }

        public async Task<NFD_Batch> AddAsync(NFD_Batch batch)
        {
            await _context.NFD_Batches.AddAsync(batch);
            await _context.SaveChangesAsync();
            return batch;
        }

        public async Task UpdateAsync(NFD_Batch batch)
        {
            _context.NFD_Batches.Update(batch);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(NFD_Batch batch)
        {
            _context.NFD_Batches.Remove(batch);
            await _context.SaveChangesAsync();
        }
    }
}