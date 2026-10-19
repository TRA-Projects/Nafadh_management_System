
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class QuizResultRepository : IQuizResultRepository
    {
        private readonly Nafadhcontext _context;

        public QuizResultRepository(Nafadhcontext context)
        {
            _context = context;
        }

        // عرض نتائج اختبارات المدرب
        public async Task<List<NFD_QuizAttempt>> GetTrainerResultsAsync(
            int trainerId,
            int? quizId = null)
        {
            var query = _context.NFD_QuizAttempts
                .AsNoTracking()
                .Include(a => a.Quiz)
                .Include(a => a.Trainee)
                    .ThenInclude(t => t.User)
                .Include(a => a.AttemptQuestions)
                    .ThenInclude(aq => aq.Question)
                .Include(a => a.AttemptQuestions)
                    .ThenInclude(aq => aq.Answers)
                .Where(a => a.Quiz.TrainerId == trainerId);

            if (quizId.HasValue)
            {
                query = query.Where(a =>
                    a.QuizId == quizId.Value);
            }

            return await query
                .AsSplitQuery()
                .OrderByDescending(a => a.SubmittedAt)
                .ThenBy(a => a.Trainee.User.FullName)
                .ToListAsync();
        }

        // الحفاظ على نتائج المتدرب الحالية

        public async Task<List<NFD_QuizAttempt>> GetTraineeResultsAsync(
            int traineeId)
        {
            return await _context.NFD_QuizAttempts
                .AsNoTracking()
                .Include(a => a.Quiz)
                .Include(a => a.Trainee)
                    .ThenInclude(t => t.User)
                .Where(a =>
                    a.TraineeId == traineeId &&
                    (a.Status == "Submitted" ||
                     a.Status == "Expired") &&
                    !a.AttemptQuestions.Any(aq =>
                        aq.Question.QuestionType ==
                            Nafadh_Backend.Enums.NFD_QuizQuestionType.Essay &&
                        aq.Answers.Any(answer =>
                            !answer.IsManuallyGraded)))
                .OrderByDescending(a => a.SubmittedAt)
                .ToListAsync();
        }


        // تفاصيل محاولة المتدرب للمدرب المالك للاختبار
        public async Task<NFD_QuizAttempt?> GetTrainerAttemptDetailsAsync(
            int attemptId,
            int trainerId)
        {
            return await _context.NFD_QuizAttempts
                .AsNoTracking()
                .Include(a => a.Quiz)
                .Include(a => a.Trainee)
                    .ThenInclude(t => t.User)
                .Include(a => a.AttemptQuestions)
                    .ThenInclude(aq => aq.Question)
                        .ThenInclude(q => q.Options)
                .Include(a => a.AttemptQuestions)
                    .ThenInclude(aq => aq.Answers)
                        .ThenInclude(answer => answer.SelectedOption)
                .AsSplitQuery()
                .FirstOrDefaultAsync(a =>
                    a.AttemptId == attemptId &&
                    a.Quiz.TrainerId == trainerId);
        }
    }
}
