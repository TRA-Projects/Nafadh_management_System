using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class QuizAttemptRepository
        : IQuizAttemptRepository
    {
        private readonly Nafadhcontext _context;

        public QuizAttemptRepository(
            Nafadhcontext context)
        {
            _context = context;
        }

        public async Task<NFD_Quiz?>
            GetQuizForAttemptAsync(int quizId)
        {
            return await _context.NFD_Quizzes
                .Include(q => q.QuizQuestions)
                    .ThenInclude(qq => qq.Question)
                        .ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(q =>
                    q.QuizId == quizId);
        }

        public async Task<int> GetAttemptsCountAsync(
            int quizId,
            int traineeId)
        {
            return await _context.NFD_QuizAttempts
                .CountAsync(a =>
                    a.QuizId == quizId &&
                    a.TraineeId == traineeId);
        }

        public async Task<bool> IsTraineeEnrolledInBatchAsync(
    int traineeId,
    int batchId)
        {
            return await _context.NFD_Enrollments
                .AnyAsync(e =>
                    e.TraineeId == traineeId &&
                    e.BatchId == batchId);
        }

        public async Task AddAttemptAsync(
            NFD_QuizAttempt attempt)
        {
            await _context.NFD_QuizAttempts.AddAsync(attempt);
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
        public async Task<NFD_QuizAttempt?>


    GetAttemptForAnswerAsync(int attemptId)
        {
            return await _context.NFD_QuizAttempts
                .Include(a => a.Quiz)
                .Include(a => a.AttemptQuestions)
                    .ThenInclude(aq => aq.Question)
                        .ThenInclude(q => q.Options)
                .Include(a => a.AttemptQuestions)
                    .ThenInclude(aq => aq.Answers)
                .FirstOrDefaultAsync(a =>
                    a.AttemptId == attemptId);
        }



        public async Task<NFD_QuizAttempt?> GetAttemptForSubmissionAsync(int attemptId)
        {
            return await _context.NFD_QuizAttempts
                .Include(a => a.Quiz)
                .Include(a => a.AttemptQuestions)
                    .ThenInclude(aq => aq.Question)
                        .ThenInclude(q => q.Options)
                .Include(a => a.AttemptQuestions)
                    .ThenInclude(aq => aq.Answers)
                .FirstOrDefaultAsync(a =>
                    a.AttemptId == attemptId);
        }


        public async Task<NFD_QuizAnswer?>
            GetAnswerAsync(int attemptQuestionId)
        {
            return await _context.NFD_QuizAnswers
                .FirstOrDefaultAsync(a =>
                    a.AttemptQuestionId == attemptQuestionId);
        }

        public async Task AddAnswerAsync(
            NFD_QuizAnswer answer)
        {
            await _context.NFD_QuizAnswers.AddAsync(answer);
        }

        public void UpdateAnswer(
            NFD_QuizAnswer answer)
        {
            _context.NFD_QuizAnswers.Update(answer);
        }

    }
}
