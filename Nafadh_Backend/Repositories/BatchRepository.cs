using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

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

        public async Task<BatchProgressDto?> GetProgressAsync(int batchId)
        {
            var batch = await _context.NFD_Batches
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.BatchId == batchId);

            if (batch == null)
                return null;

            // المتدربون الموجودون في هذه الدفعة
            var traineeIds = await _context.NFD_Enrollments
                .Where(e => e.BatchId == batchId)
                .Select(e => e.TraineeId)
                .Distinct()
                .ToListAsync();

            // الوحدات الخاصة ببرنامج هذه الدفعة فقط
            var moduleIds = await _context.NFD_Modules
                .Where(m =>
                    m.ProgramId == batch.ProgramId &&
                    !m.IsArchived)
                .Select(m => m.ModuleId)
                .ToListAsync();

            int totalTrainees = traineeIds.Count;
            int totalModules = moduleIds.Count;

            if (totalTrainees == 0 || totalModules == 0)
            {
                return new BatchProgressDto
                {
                    BatchId = batchId,
                    TotalTrainees = totalTrainees,
                    TotalModules = totalModules,
                    CompletedModules = 0,
                    ProgressPercentage = 0
                };
            }

            // عدد الوحدات المكتملة فعليًا
            var completedModules = await _context.NFD_TraineeModuleProgresses
                .CountAsync(p =>
                    traineeIds.Contains(p.TraineeId) &&
                    moduleIds.Contains(p.ModuleId) &&
                    p.Status == NFD_ModuleProgressStatus.Completed);

            int totalPossibleCompletions =
                totalTrainees * totalModules;

            double percentage =
                totalPossibleCompletions == 0
                    ? 0
                    : (double)completedModules /
                      totalPossibleCompletions * 100;

            return new BatchProgressDto
            {
                BatchId = batchId,
                TotalTrainees = totalTrainees,
                TotalModules = totalModules,
                CompletedModules = completedModules,
                ProgressPercentage = Math.Round(percentage, 2)
            };
        }
    }
}