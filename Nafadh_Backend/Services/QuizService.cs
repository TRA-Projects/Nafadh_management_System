
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

        public QuizService(IQuizRepository quizRepository)
        {
            _quizRepository = quizRepository;
        }

        public async Task<IEnumerable<QuizListDto>>
            GetTrainerQuizzesAsync(int trainerId)
        {
            var quizzes =
                await _quizRepository.GetQuizzesByTrainerIdAsync(trainerId);

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
                CreatedAt = q.CreatedAt
            });
        }

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
                CreatedAt = DateTime.UtcNow
            };

            await _quizRepository.AddAsync(quiz);
            await _quizRepository.SaveChangesAsync();
        }

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

            // التحقق من أن الاختبار تابع للمدرب
            if (quiz.TrainerId != trainerId)
            {
                throw new UnauthorizedAccessException(
                    "لا يمكنك تعديل اختبار تابع لمدرب آخر.");
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

            await _quizRepository.UpdateAsync(quiz);
            await _quizRepository.SaveChangesAsync();
        }
    }
}
