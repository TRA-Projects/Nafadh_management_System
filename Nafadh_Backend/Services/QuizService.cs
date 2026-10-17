
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public interface IQuizService
    {
        Task<IEnumerable<QuizListDto>> GetTrainerQuizzesAsync(
            int trainerId);

        Task CreateQuizAsync(
            CreateQuizDto dto,
            int trainerId);

        Task UpdateQuizAsync(
            int id,
            UpdateQuizDto dto,
            int trainerId);
    }

    public class QuizService : IQuizService
    {
        private readonly IQuizRepository _quizRepository;
        private readonly IQuizQuestionRepository _quizQuestionRepository;

        public QuizService(
            IQuizRepository quizRepository,
            IQuizQuestionRepository quizQuestionRepository)
        {
            _quizRepository = quizRepository;
            _quizQuestionRepository = quizQuestionRepository;
        }

        // عرض اختبارات المدرب
        public async Task<IEnumerable<QuizListDto>>
            GetTrainerQuizzesAsync(int trainerId)
        {
            var quizzes =
                await _quizRepository.GetQuizzesByTrainerIdAsync(
                    trainerId);

            return quizzes.Select(q => new QuizListDto
            {
                QuizId = q.QuizId,
                Title = q.Title,
                Description = q.Description,
                BatchId = q.BatchId,
                BatchName = q.Batch?.BatchName,
                StartDateTime = q.StartDateTime,
                EndDateTime = q.EndDateTime,
                DurationMinutes = q.DurationMinutes,
                Status = q.Status,
                RandomizeQuestions = q.RandomizeQuestions,
                MaxAttempts = q.MaxAttempts,
                CameraRequired = q.CameraRequired,
                PassingPercentage = q.PassingPercentage,
                CreatedAt = q.CreatedAt
            });
        }

        // إنشاء اختبار
        public async Task CreateQuizAsync(
            CreateQuizDto dto,
            int trainerId)
        {
            if (dto.EndDateTime <= dto.StartDateTime)
            {
                throw new ArgumentException(
                    "يجب أن يكون وقت الانتهاء بعد وقت البداية.");
            }

            var quiz = new NFD_Quiz
            {
                Title = dto.Title.Trim(),
                Description = dto.Description?.Trim(),
                BatchId = dto.BatchId,
                TrainerId = trainerId,
                StartDateTime = dto.StartDateTime,
                EndDateTime = dto.EndDateTime,
                DurationMinutes = dto.DurationMinutes,
                Status = dto.Status,
                RandomizeQuestions = dto.RandomizeQuestions,
                MaxAttempts = dto.MaxAttempts,
                CameraRequired = dto.CameraRequired,
                PassingPercentage = dto.PassingPercentage,
                CreatedAt = DateTime.UtcNow
            };

            await _quizRepository.AddAsync(quiz);
            await _quizRepository.SaveChangesAsync();
        }

        // تعديل اختبار
        public async Task UpdateQuizAsync(
            int id,
            UpdateQuizDto dto,
            int trainerId)
        {
            if (dto.EndDateTime <= dto.StartDateTime)
            {
                throw new ArgumentException(
                    "يجب أن يكون وقت الانتهاء بعد وقت البداية.");
            }

            var quiz = await _quizRepository.GetByIdAsync(id);

            if (quiz == null)
            {
                throw new KeyNotFoundException(
                    "الاختبار غير موجود.");
            }

            if (quiz.TrainerId != trainerId)
            {
                throw new UnauthorizedAccessException(
                    "لا يمكنك تعديل اختبار تابع لمدرب آخر.");
            }

            // منع تغيير نسبة النجاح بعد بدء المحاولات
            if (quiz.PassingPercentage != dto.PassingPercentage)
            {
                var hasAttempts =
                    await _quizQuestionRepository.HasQuizAttemptsAsync(id);

                if (hasAttempts)
                {
                    throw new InvalidOperationException(
                        "لا يمكن تغيير نسبة النجاح بعد بدء محاولات الاختبار.");
                }
            }

            quiz.Title = dto.Title.Trim();
            quiz.Description = dto.Description?.Trim();
            quiz.BatchId = dto.BatchId;
            quiz.StartDateTime = dto.StartDateTime;
            quiz.EndDateTime = dto.EndDateTime;
            quiz.DurationMinutes = dto.DurationMinutes;
            quiz.Status = dto.Status;
            quiz.RandomizeQuestions = dto.RandomizeQuestions;
            quiz.MaxAttempts = dto.MaxAttempts;
            quiz.CameraRequired = dto.CameraRequired;
            quiz.PassingPercentage = dto.PassingPercentage;

            await _quizRepository.UpdateAsync(quiz);
            await _quizRepository.SaveChangesAsync();
        }
    }
}
