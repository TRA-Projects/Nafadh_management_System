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
    }

    public class QuizQuestionService
        : IQuizQuestionService
    {
        private readonly IQuizQuestionRepository _repository;

        public QuizQuestionService(
            IQuizQuestionRepository repository)
        {
            _repository = repository;
        }

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

            var questionIds = dto.QuestionIds
                .Distinct()
                .ToList();

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
                    !existingQuestionIds.Contains(
                        question.QuestionId))
                .ToList();

            if (newQuestions.Count == 0)
            {
                throw new ArgumentException(
                    "الأسئلة المختارة موجودة مسبقاً في الاختبار.");
            }

            var nextOrder = quiz.QuizQuestions.Count + 1;

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
    }
}
