using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class QuizResultRepository
        : IQuizResultRepository
    {
        private readonly Nafadhcontext _context;

        public QuizResultRepository(
            Nafadhcontext context)
        {
            _context = context;
        }

        public async Task<List<NFD_QuizAttempt>>
            GetTrainerResultsAsync(
                int trainerId,
                int? quizId = null)
        {
            var query = _context.NFD_QuizAttempts
                .Include(a => a.Quiz)
                .Include(a => a.Trainee)
                    .ThenInclude(t => t.User)
                .Where(a =>
                    a.Quiz.TrainerId == trainerId);

            if (quizId.HasValue)
            {
                query = query.Where(a =>
                    a.QuizId == quizId.Value);
            }

            return await query
                .OrderByDescending(a => a.SubmittedAt)
                .ThenBy(a => a.Trainee.User.FullName)
                .ToListAsync();
        }
    }
}
