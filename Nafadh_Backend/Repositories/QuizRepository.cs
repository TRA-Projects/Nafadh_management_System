using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class QuizRepository : IQuizRepository
    {
        private readonly Nafadhcontext _context;

        public QuizRepository(Nafadhcontext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<NFD_Quiz>> GetQuizzesByTrainerIdAsync(
            int trainerId)
        {
            return await _context.NFD_Quizzes
                .Include(q => q.Batch)
                .Where(q => q.TrainerId == trainerId)
                .OrderByDescending(q => q.CreatedAt)
                .ToListAsync();
        }

        public async Task<NFD_Quiz> GetByIdAsync(int id)
        {
            return await _context.NFD_Quizzes
                .Include(q => q.Batch)
                .FirstOrDefaultAsync(q => q.QuizId == id);
        }

        public async Task AddAsync(NFD_Quiz quiz)
        {
            await _context.NFD_Quizzes.AddAsync(quiz);
        }

        public async Task UpdateAsync(NFD_Quiz quiz)
        {
            _context.NFD_Quizzes.Update(quiz);
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}
