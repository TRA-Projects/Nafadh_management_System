
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class UserGuideProgressRepository : IUserGuideProgressRepository
    {
        private readonly Nafadhcontext _context;

        public UserGuideProgressRepository(Nafadhcontext context)
        {
            _context = context;
        }

        // Get all progress records for a trainee.
        public async Task<IEnumerable<NFD_UserGuideProgress>> GetByTraineeIdAsync(int traineeId)
        {
            return await _context.NFD_UserGuideProgresses
                .AsNoTracking()
                .Where(p => p.TraineeId == traineeId)
                .ToListAsync();
        }

        // Get progress for one guide.
        public async Task<NFD_UserGuideProgress?> GetByTraineeAndGuideAsync(
            int traineeId,
            string guideKey)
        {
            return await _context.NFD_UserGuideProgresses
                .FirstOrDefaultAsync(p =>
                    p.TraineeId == traineeId &&
                    p.GuideKey == guideKey);
        }

        // Create a new progress record.
        public async Task<NFD_UserGuideProgress> CreateAsync(
            NFD_UserGuideProgress progress)
        {
            await _context.NFD_UserGuideProgresses.AddAsync(progress);
            await _context.SaveChangesAsync();

            return progress;
        }

        // Update an existing progress record.
        public async Task UpdateAsync(NFD_UserGuideProgress progress)
        {
            _context.NFD_UserGuideProgresses.Update(progress);
            await _context.SaveChangesAsync();
        }
    }
}
