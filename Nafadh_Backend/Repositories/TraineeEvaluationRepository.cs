
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface ITraineeEvaluationRepository
    {
        Task<NFD_QuizAttempt?> GetAttemptAsync(int attemptId);

        Task<NFD_TraineeEvaluation?> GetEvaluationAsync(int attemptId);

        Task AddAsync(NFD_TraineeEvaluation evaluation);

        Task SaveChangesAsync();
    }

    public class TraineeEvaluationRepository : ITraineeEvaluationRepository
    {
        private readonly Nafadhcontext _context;

        public TraineeEvaluationRepository(Nafadhcontext context)
        {
            _context = context;
        }

        public async Task<NFD_QuizAttempt?> GetAttemptAsync(int attemptId)
        {
            return await _context.NFD_QuizAttempts
                .Include(a => a.Quiz)
                .Include(a => a.AttemptQuestions)
                    .ThenInclude(aq => aq.Answers)
                .FirstOrDefaultAsync(a => a.AttemptId == attemptId);
        }

        public async Task<NFD_TraineeEvaluation?> GetEvaluationAsync(int attemptId)
        {
            return await _context.NFD_TraineeEvaluations
                .FirstOrDefaultAsync(e => e.AttemptId == attemptId);
        }

        public async Task AddAsync(NFD_TraineeEvaluation evaluation)
        {
            await _context.NFD_TraineeEvaluations.AddAsync(evaluation);
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}
