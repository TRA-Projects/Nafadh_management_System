
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public interface IQuizQuestionService
    {
        Task AddQuestionsToQuizAsync(
            int quizId,
            AddQuizQuestionsDto dto,
            int trainerId);

        Task<List<QuizQuestionListDto>> GetQuizQuestionsAsync(
            int quizId,
            int trainerId);

        Task DeleteQuizQuestionAsync(
            int quizId,
            int quizQuestionId,
            int trainerId);

        Task UpdateQuizQuestionAsync(
            int quizId,
            int quizQuestionId,
            UpdateQuizQuestionDto dto,
            int trainerId);
    }

    public class QuizQuestionService : IQuizQuestionService
    {
        private readonly IQuizQuestionRepository _repository;

        public QuizQuestionService(
            IQuizQuestionRepository repository)
        {
            _repository = repository;
        }

        // إضافة أسئلة إلى الاختبار
        public async Task AddQuestionsToQuizAsync(
            int quizId,
            AddQuizQuestionsDto dto,
            int trainerId)
        {
            var quiz =
                await _repository.GetQuizWithQuestionsAsync(quizId);

            if (quiz == null)
            {
                throw new KeyNotFoundException(
                    "الاختبار غير موجود.");
            }

            if (quiz.TrainerId != trainerId)
            {
                throw new UnauthorizedAccessException(
                    "لا تملكين صلاحية تعديل هذا الاختبار.");
            }

            if (await _repository.HasQuizAttemptsAsync(quizId))
            {
                throw new InvalidOperationException(
                    "لا يمكن إضافة أسئلة بعد بدء محاولات الاختبار.");
            }

            var questionIds = dto.QuestionIds
                .Distinct()
                .ToList();

            if (questionIds.Count == 0)
            {
                throw new ArgumentException(
                    "يجب اختيار سؤال واحد على الأقل.");
            }

            var questions =
                await _repository.GetQuestionsByIdsAsync(questionIds);

            if (questions.Count != questionIds.Count)
            {
                throw new ArgumentException(
                    "يوجد سؤال غير موجود أو غير فعال.");
            }

            var existingQuestionIds = quiz.QuizQuestions
                .Select(x => x.QuestionId)
                .ToHashSet();

            var newQuestions = questions
                .Where(question =>
                    !existingQuestionIds.Contains(question.QuestionId))
                .ToList();

            if (newQuestions.Count == 0)
            {
                throw new ArgumentException(
                    "الأسئلة المختارة موجودة مسبقاً في الاختبار.");
            }

            var nextOrder = quiz.QuizQuestions.Any()
                ? quiz.QuizQuestions.Max(q => q.QuestionOrder) + 1
                : 1;

            var quizQuestions = newQuestions
                .Select(question => new NFD_QuizQuestion
                {
                    QuizId = quizId,
                    QuestionId = question.QuestionId,
                    QuestionOrder = nextOrder++,
                    Points = question.Points
                })
                .ToList();

            await _repository.AddRangeAsync(quizQuestions);
            await _repository.SaveChangesAsync();
        }

        // عرض أسئلة الاختبار للمدرب
        public async Task<List<QuizQuestionListDto>>
            GetQuizQuestionsAsync(int quizId, int trainerId)
        {
            var quiz =
                await _repository.GetQuizWithQuestionsAsync(quizId);

            if (quiz == null)
            {
                throw new KeyNotFoundException(
                    "الاختبار غير موجود.");
            }

            if (quiz.TrainerId != trainerId)
            {
                throw new UnauthorizedAccessException(
                    "لا تملكين صلاحية عرض أسئلة هذا الاختبار.");
            }

            var questions =
                await _repository.GetQuizQuestionsAsync(quizId);

            return questions.Select(q => new QuizQuestionListDto
            {
                QuizQuestionId = q.QuizQuestionId,
                QuizId = q.QuizId,
                QuestionId = q.QuestionId,
                QuestionText = q.Question.QuestionText,
                QuestionOrder = q.QuestionOrder,
                Points = q.Points
            }).ToList();
        }

        // حذف سؤال من الاختبار
        public async Task DeleteQuizQuestionAsync(
            int quizId,
            int quizQuestionId,
            int trainerId)
        {
            var quiz =
                await _repository.GetQuizWithQuestionsAsync(quizId);

            if (quiz == null)
            {
                throw new KeyNotFoundException(
                    "الاختبار غير موجود.");
            }

            if (quiz.TrainerId != trainerId)
            {
                throw new UnauthorizedAccessException(
                    "لا تملكين صلاحية حذف أسئلة هذا الاختبار.");
            }

            if (await _repository.HasQuizAttemptsAsync(quizId))
            {
                throw new InvalidOperationException(
                    "لا يمكن حذف سؤال من اختبار بدأت فيه محاولات.");
            }

            var quizQuestion =
                await _repository.GetQuizQuestionByIdAsync(
                    quizId, quizQuestionId);

            if (quizQuestion == null)
            {
                throw new KeyNotFoundException(
                    "السؤال غير موجود داخل هذا الاختبار.");
            }

            _repository.RemoveQuizQuestion(quizQuestion);

            var remainingQuestions = quiz.QuizQuestions
                .Where(q => q.QuizQuestionId != quizQuestionId)
                .OrderBy(q => q.QuestionOrder)
                .ThenBy(q => q.QuizQuestionId)
                .ToList();

            for (int i = 0; i < remainingQuestions.Count; i++)
            {
                remainingQuestions[i].QuestionOrder = i + 1;
            }

            await _repository.SaveChangesAsync();
        }

        // تعديل ترتيب السؤال ودرجته
        public async Task UpdateQuizQuestionAsync(
            int quizId,
            int quizQuestionId,
            UpdateQuizQuestionDto dto,
            int trainerId)
        {
            var quiz =
                await _repository.GetQuizWithQuestionsAsync(quizId);

            if (quiz == null)
            {
                throw new KeyNotFoundException(
                    "الاختبار غير موجود.");
            }

            if (quiz.TrainerId != trainerId)
            {
                throw new UnauthorizedAccessException(
                    "لا تملكين صلاحية تعديل أسئلة هذا الاختبار.");
            }

            if (await _repository.HasQuizAttemptsAsync(quizId))
            {
                throw new InvalidOperationException(
                    "لا يمكن تعديل الأسئلة بعد بدء محاولات الاختبار.");
            }

            var orderedQuestions = quiz.QuizQuestions
                .OrderBy(q => q.QuestionOrder)
                .ThenBy(q => q.QuizQuestionId)
                .ToList();

            var question = orderedQuestions
                .FirstOrDefault(q =>
                    q.QuizQuestionId == quizQuestionId);

            if (question == null)
            {
                throw new KeyNotFoundException(
                    "السؤال غير موجود داخل هذا الاختبار.");
            }

            if (dto.QuestionOrder < 1 ||
                dto.QuestionOrder > orderedQuestions.Count)
            {
                throw new ArgumentException(
                    "ترتيب السؤال يجب أن يكون ضمن عدد أسئلة الاختبار.");
            }

            if (dto.Points <= 0)
            {
                throw new ArgumentException(
                    "درجة السؤال يجب أن تكون أكبر من صفر.");
            }

            // إزالة السؤال من مكانه القديم
            orderedQuestions.Remove(question);

            // إدخاله في المكان الجديد
            orderedQuestions.Insert(
                dto.QuestionOrder - 1,
                question);

            // تحديث ترتيب جميع الأسئلة
            for (int i = 0; i < orderedQuestions.Count; i++)
            {
                orderedQuestions[i].QuestionOrder = i + 1;
            }

            // تعديل درجة السؤال داخل الاختبار فقط
            question.Points = dto.Points;

            await _repository.SaveChangesAsync();
        }
    }
}
