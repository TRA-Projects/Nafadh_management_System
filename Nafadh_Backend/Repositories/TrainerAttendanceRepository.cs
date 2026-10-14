using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class TrainerAttendanceRepository : ITrainerAttendanceRepository
    {
        private readonly Nafadhcontext _context;

        public TrainerAttendanceRepository(Nafadhcontext context)
        {
            _context = context;
        }

        // A trainer belongs to the company when they teach a batch that the company has enrollments in.
        // NOTE: assumes NFD_Enrollment has CompanyId + BatchId and NFD_BatchTrainer has TrainerId + BatchId.
        private IQueryable<NFD_Trainer> CompanyTrainersQuery(int companyId)
        {
            var batchIds = _context.NFD_Enrollments
                .Where(e => e.CompanyId == companyId)
                .Select(e => e.BatchId);

            return _context.NFD_Trainers
                .Where(t => t.BatchTrainers.Any(bt => batchIds.Contains(bt.BatchId)));
        }

        public async Task<List<NFD_Trainer>> GetCompanyTrainersAsync(int companyId)
        {
            return await CompanyTrainersQuery(companyId)
                .Include(t => t.User)
                .OrderBy(t => t.TrainerId)
                .ToListAsync();
        }

        public async Task<bool> TrainerBelongsToCompanyAsync(int companyId, int trainerId)
        {
            return await CompanyTrainersQuery(companyId).AnyAsync(t => t.TrainerId == trainerId);
        }

        public async Task<List<NFD_TrainerAttendance>> GetRangeAsync(int companyId, DateTime from, DateTime to, int? trainerId)
        {
            var query = _context.Set<NFD_TrainerAttendance>()
                .Include(a => a.Trainer).ThenInclude(t => t.User)
                .Where(a => a.CompanyId == companyId && a.Date >= from && a.Date <= to);

            if (trainerId.HasValue)
                query = query.Where(a => a.TrainerId == trainerId.Value);

            return await query
                .OrderBy(a => a.Date)
                .ThenBy(a => a.TrainerId)
                .ToListAsync();
        }

        public async Task<List<NFD_TrainerAttendance>> GetDayAsync(int companyId, DateTime date)
        {
            return await _context.Set<NFD_TrainerAttendance>()
                .Where(a => a.CompanyId == companyId && a.Date == date)
                .ToListAsync();
        }

        public async Task<NFD_TrainerAttendance?> GetAsync(int companyId, int trainerId, DateTime date)
        {
            return await _context.Set<NFD_TrainerAttendance>()
                .Include(a => a.Trainer).ThenInclude(t => t.User)
                .FirstOrDefaultAsync(a => a.CompanyId == companyId && a.TrainerId == trainerId && a.Date == date);
        }

        public async Task<NFD_TrainerAttendance?> GetByIdAsync(int id)
        {
            return await _context.Set<NFD_TrainerAttendance>()
                .Include(a => a.Trainer).ThenInclude(t => t.User)
                .FirstOrDefaultAsync(a => a.TrainerAttendanceId == id);
        }

        public async Task AddAsync(NFD_TrainerAttendance attendance)
        {
            await _context.Set<NFD_TrainerAttendance>().AddAsync(attendance);
        }

        public async Task<bool> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync() > 0;
        }
    }
}