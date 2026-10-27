
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
        // ترجع رسالة الخطأ إذا كان هناك سؤال غير صالح، و null إذا كانت جميع الأسئلة صحيحة.

        public async Task<string?> AreQuizQuestionsValidAsync(
            int quizId,
            int trainerId)
        {
            var questions = await _context.NFD_QuizQuestions
                .AsNoTracking()
                .Include(qq => qq.Question)
                    .ThenInclude(q => q.Options)
                .Where(qq => qq.QuizId == quizId)
                .ToListAsync();

            if (questions.Count == 0)
            {
                return "لا يمكن نشر الاختبار. أضف سؤالاً واحداً على الأقل قبل النشر.";
            }

            foreach (var quizQuestion in questions)
            {
                var question = quizQuestion.Question;

                // السؤال غير موجود
                if (question == null)
                {
                    return "لا يمكن نشر الاختبار. يوجد سؤال مرتبط بالاختبار ولكنه غير موجود في بنك الأسئلة.";
                }

                var questionText = string.IsNullOrWhiteSpace(question.QuestionText)
                    ? $"رقم السؤال {question.QuestionId}"
                    : $"السؤال \"{question.QuestionText}\"";

                // السؤال غير فعال
                if (!question.IsActive)
                {
                    return $"لا يمكن نشر الاختبار. {questionText} غير نشط. يرجى تفعيله قبل النشر.";
                }

                // السؤال لا يتبع للمدرب الحالي
                if (question.TrainerId != trainerId)
                {
                    return $"لا يمكن نشر الاختبار. {questionText} لا يتبع للمدرب الحالي.";
                }

                // نص السؤال فارغ
                if (string.IsNullOrWhiteSpace(question.QuestionText))
                {
                    return $"لا يمكن نشر الاختبار. يوجد سؤال بدون نص.";
                }

                // درجة السؤال غير صحيحة
                if (quizQuestion.Points <= 0)
                {
                    return $"لا يمكن نشر الاختبار. {questionText} يجب أن تكون درجته أكبر من صفر.";
                }

                var options = question.Options.ToList();

                switch (question.QuestionType)
                {
                    case Nafadh_Backend.Enums.NFD_QuizQuestionType.MultipleChoice:

                        if (options.Count < 2)
                        {
                            return $"لا يمكن نشر الاختبار. {questionText} يجب أن يحتوي على خيارين على الأقل.";
                        }

                        if (options.Count(o => o.IsCorrect) != 1)
                        {
                            return $"لا يمكن نشر الاختبار. {questionText} يجب أن يحتوي على إجابة صحيحة واحدة فقط.";
                        }

                        break;

                    case Nafadh_Backend.Enums.NFD_QuizQuestionType.TrueFalse:

                        if (options.Count != 2)
                        {
                            return $"لا يمكن نشر الاختبار. {questionText} يجب أن يحتوي على خيارين بالضبط.";
                        }

                        if (options.Count(o => o.IsCorrect) != 1)
                        {
                            return $"لا يمكن نشر الاختبار. {questionText} يجب أن يحتوي على إجابة صحيحة واحدة فقط.";
                        }

                        break;

                    case Nafadh_Backend.Enums.NFD_QuizQuestionType.Essay:

                        if (options.Count != 0)
                        {
                            return $"لا يمكن نشر الاختبار. {questionText} من نوع مقالي ولا يجب أن يحتوي على خيارات.";
                        }

                        break;

                    default:

                        return $"لا يمكن نشر الاختبار. {questionText} يحتوي على نوع سؤال غير صالح.";
                }

                // التحقق من نصوص وأكواد الخيارات
                var invalidOption = options.FirstOrDefault(o =>
                    string.IsNullOrWhiteSpace(o.OptionText) ||
                    string.IsNullOrWhiteSpace(o.OptionCode));

                if (invalidOption != null)
                {
                    return $"لا يمكن نشر الاختبار. {questionText} يحتوي على خيار بدون نص أو رمز خيار.";
                }
            }

            return null;
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
