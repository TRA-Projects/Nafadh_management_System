
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

        // عرض أسئلة اختبار معين
        public async Task<List<NFD_QuizQuestion>>
            GetQuizQuestionsAsync(int quizId)
        {
            return await _context.NFD_QuizQuestions
                .AsNoTracking()
                .Include(q => q.Question)
                .Where(q => q.QuizId == quizId)
                .OrderBy(q => q.QuestionOrder)
                .ToListAsync();
        }

        // البحث عن سؤال مرتبط باختبار معين
        public async Task<NFD_QuizQuestion?>
            GetQuizQuestionByIdAsync(
                int quizId,
                int quizQuestionId)
        {
            return await _context.NFD_QuizQuestions
                .FirstOrDefaultAsync(q =>
                    q.QuizId == quizId &&
                    q.QuizQuestionId == quizQuestionId);
        }

        // التحقق من وجود محاولات للاختبار
        public async Task<bool> HasQuizAttemptsAsync(
            int quizId)
        {
            return await _context.NFD_QuizAttempts
                .AnyAsync(a => a.QuizId == quizId);
        }

        // إضافة أسئلة إلى الاختبار
        public async Task AddRangeAsync(
            List<NFD_QuizQuestion> quizQuestions)
        {
            await _context.NFD_QuizQuestions
                .AddRangeAsync(quizQuestions);
        }

        // حذف ربط السؤال بالاختبار فقط
        public void RemoveQuizQuestion(
            NFD_QuizQuestion quizQuestion)
        {
            _context.NFD_QuizQuestions
                .Remove(quizQuestion);
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}
