using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class QuizQuestionRepository
        : IQuizQuestionRepository
    {
        private readonly Nafadhcontext _context;

        public QuizQuestionRepository(
            Nafadhcontext context)
        {
            _context = context;
        }

        public async Task<NFD_Quiz?>
            GetQuizWithQuestionsAsync(int quizId)
        {
            return await _context.NFD_Quizzes
                .Include(q => q.QuizQuestions)
                .FirstOrDefaultAsync(q =>
                    q.QuizId == quizId);
        }

        public async Task<List<NFD_QuestionBank>>
            GetQuestionsByIdsAsync(
                List<int> questionIds)
        {
            return await _context.NFD_QuestionBanks
                .Where(q =>
                    questionIds.Contains(q.QuestionId) &&
                    q.IsActive)
                .ToListAsync();
        }

        public async Task AddRangeAsync(
            List<NFD_QuizQuestion> quizQuestions)
        {
            await _context.NFD_QuizQuestions
                .AddRangeAsync(quizQuestions);
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}
