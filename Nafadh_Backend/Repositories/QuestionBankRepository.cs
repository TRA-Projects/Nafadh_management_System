using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class QuestionBankRepository
        : IQuestionBankRepository
    {
        private readonly Nafadhcontext _context;

        public QuestionBankRepository(
            Nafadhcontext context)
        {
            _context = context;
        }

        public async Task<List<NFD_QuestionBank>>
            GetByTrainerIdAsync(int trainerId)
        {
            return await _context.NFD_QuestionBanks
                .Include(q => q.Options)
                .Where(q =>
                    q.TrainerId == trainerId &&
                    q.IsActive)
                .OrderByDescending(q => q.CreatedAt)
                .ToListAsync();
        }

        public async Task<NFD_QuestionBank?>
            GetByIdWithOptionsAsync(int questionId)
        {
            return await _context.NFD_QuestionBanks
                .Include(q => q.Options)
                .FirstOrDefaultAsync(q =>
                    q.QuestionId == questionId);
        }

        public async Task AddAsync(
            NFD_QuestionBank question)
        {
            await _context.NFD_QuestionBanks
                .AddAsync(question);
        }

        public void Update(
            NFD_QuestionBank question)
        {
            _context.NFD_QuestionBanks.Update(question);
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}
