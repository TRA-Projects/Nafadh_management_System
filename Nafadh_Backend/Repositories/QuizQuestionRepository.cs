
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class QuizQuestionRepository : IQuizQuestionRepository
    {
        private readonly Nafadhcontext _context;

        public QuizQuestionRepository(Nafadhcontext context)
        {
            _context = context;
        }

        public async Task<NFD_Quiz?>
            GetQuizWithQuestionsAsync(int quizId)
        {
            return await _context.NFD_Quizzes
                .Include(q => q.QuizQuestions)
                .FirstOrDefaultAsync(q => q.QuizId == quizId);
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

        // التحقق من صلاحية جميع أسئلة الاختبار للنشر

        public async Task<bool> AreQuizQuestionsValidAsync(
            int quizId, int trainerId)
        {
            var questions = await _context.NFD_QuizQuestions
                .AsNoTracking()
                .Include(qq => qq.Question)
                    .ThenInclude(q => q.Options)
                .Where(qq => qq.QuizId == quizId)
                .ToListAsync();

            if (questions.Count == 0)
                return false;

            foreach (var quizQuestion in questions)
            {
                var question = quizQuestion.Question;

                // التحقق من ملكية السؤال وتفعيله ودرجته
                if (question == null ||
                    !question.IsActive ||
                    question.TrainerId != trainerId ||
                    string.IsNullOrWhiteSpace(question.QuestionText) ||
                    quizQuestion.Points <= 0)
                {
                    return false;
                }

                var options = question.Options.ToList();

                switch (question.QuestionType)
                {
                    case Nafadh_Backend.Enums.NFD_QuizQuestionType.MultipleChoice:
                        // خياران على الأقل وإجابة صحيحة واحدة
                        if (options.Count < 2 ||
                            options.Count(o => o.IsCorrect) != 1)
                            return false;
                        break;

                    case Nafadh_Backend.Enums.NFD_QuizQuestionType.TrueFalse:
                        // خياران بالضبط وإجابة صحيحة واحدة
                        if (options.Count != 2 ||
                            options.Count(o => o.IsCorrect) != 1)
                            return false;
                        break;

                    case Nafadh_Backend.Enums.NFD_QuizQuestionType.Essay:
                        // السؤال المقالي لا يحتاج خيارات
                        if (options.Count != 0)
                            return false;
                        break;

                    default:
                        return false;
                }

                // التأكد من أن نصوص الخيارات غير فارغة
                if (options.Any(o =>
                    string.IsNullOrWhiteSpace(o.OptionText) ||
                    string.IsNullOrWhiteSpace(o.OptionCode)))
                {
                    return false;
                }
            }

            return true;
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

        // جلب الأسئلة المفعلة التابعة للمدرب

        public async Task<List<NFD_QuestionBank>>
    GetQuestionsByIdsAsync(
        List<int> questionIds,
        int trainerId)
        {
            return await _context.NFD_QuestionBanks
                .Where(q =>
                    questionIds.Contains(q.QuestionId) &&
                    q.TrainerId == trainerId &&
                    q.IsActive)
                .ToListAsync();
        }

        // التحقق من وجود محاولات
        public async Task<bool> HasQuizAttemptsAsync(int quizId)
        {
            return await _context.NFD_QuizAttempts
                .AnyAsync(a => a.QuizId == quizId);
        }

        public async Task AddRangeAsync(
            List<NFD_QuizQuestion> quizQuestions)
        {
            await _context.NFD_QuizQuestions
                .AddRangeAsync(quizQuestions);
        }

        public void RemoveQuizQuestion(
            NFD_QuizQuestion quizQuestion)
        {
            _context.NFD_QuizQuestions.Remove(quizQuestion);
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}
