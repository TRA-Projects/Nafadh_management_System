
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public interface ITraineeEvaluationService
    {
        Task SaveEvaluationAsync(
            int attemptId,
            int trainerId,
            SaveTraineeEvaluationDto dto);

        Task<TraineeEvaluationDto?> GetTraineeEvaluationAsync(
            int attemptId,
            int traineeId);
    }

    public class TraineeEvaluationService : ITraineeEvaluationService
    {
        private readonly ITraineeEvaluationRepository _repository;
        private readonly Nafadhcontext _context;

        public TraineeEvaluationService(
            ITraineeEvaluationRepository repository,
            Nafadhcontext context)
        {
            _repository = repository;
            _context = context;
        }

        public async Task SaveEvaluationAsync(
            int attemptId,
            int trainerId,
            SaveTraineeEvaluationDto dto)
        {
            var attempt = await _repository.GetAttemptAsync(attemptId);

            if (attempt == null)
                throw new KeyNotFoundException(
                    "محاولة الاختبار غير موجودة.");

            if (attempt.Quiz.TrainerId != trainerId)
                throw new UnauthorizedAccessException(
                    "لا يمكنك تقييم اختبار تابع لمدرب آخر.");

            if (attempt.SubmittedAt == null &&
                attempt.Status != "Terminated" &&
                attempt.Status != "Expired")
                throw new InvalidOperationException(
                    "لا يمكن تقييم محاولة لم تنتهِ بعد.");

            if (dto.IsCompleted)
            {
                // التحقق من اكتمال تصحيح الأسئلة المقالية
                var hasPendingEssay = await _context.NFD_AttemptQuestions
                    .AnyAsync(aq =>
                        aq.AttemptId == attemptId &&
                        aq.Question.QuestionType ==
                            Nafadh_Backend.Enums.NFD_QuizQuestionType.Essay &&
                        aq.Answers.Any(a => !a.IsManuallyGraded));

                if (hasPendingEssay)
                    throw new InvalidOperationException(
                        "يجب إكمال تصحيح الأسئلة المقالية قبل اعتماد التقييم.");
            }

            var evaluation =
                await _repository.GetEvaluationAsync(attemptId);

            if (evaluation == null)
            {
                evaluation = new NFD_TraineeEvaluation
                {
                    AttemptId = attemptId,
                    CreatedAt = DateTime.UtcNow
                };

                await _repository.AddAsync(evaluation);
            }

            if (evaluation.IsCompleted)
                throw new InvalidOperationException(
                    "هذا التقييم معتمد بالفعل ولا يمكن تعديله.");

            evaluation.Strengths = dto.Strengths?.Trim();
            evaluation.AreasForImprovement =
                dto.AreasForImprovement?.Trim();
            evaluation.Recommendations =
                dto.Recommendations?.Trim();
            evaluation.TrainerNotes = dto.TrainerNotes?.Trim();

            evaluation.IsCompleted = dto.IsCompleted;
            evaluation.CompletedAt = dto.IsCompleted
                ? DateTime.UtcNow
                : null;

            await _repository.SaveChangesAsync();
        }

        public async Task<TraineeEvaluationDto?>
            GetTraineeEvaluationAsync(
                int attemptId,
                int traineeId)
        {
            var attempt = await _repository.GetAttemptAsync(attemptId);

            if (attempt == null)
                throw new KeyNotFoundException(
                    "محاولة الاختبار غير موجودة.");

            if (attempt.TraineeId != traineeId)
                throw new UnauthorizedAccessException(
                    "لا يمكنك عرض تقييم متدرب آخر.");

            var evaluation =
                await _repository.GetEvaluationAsync(attemptId);

            // لا يظهر التقييم قبل اعتماده
            if (evaluation == null || !evaluation.IsCompleted)
                return null;

            return new TraineeEvaluationDto
            {
                EvaluationId = evaluation.EvaluationId,
                AttemptId = attempt.AttemptId,
                QuizId = attempt.QuizId,
                TraineeId = attempt.TraineeId,
                Score = attempt.Score,
                Percentage = attempt.Percentage,
                PassingPercentage = attempt.Quiz.PassingPercentage,
                IsPassed = attempt.Percentage >=
                           attempt.Quiz.PassingPercentage,
                Strengths = evaluation.Strengths,
                AreasForImprovement =
                    evaluation.AreasForImprovement,
                Recommendations = evaluation.Recommendations,
                TrainerNotes = evaluation.TrainerNotes,
                IsCompleted = evaluation.IsCompleted,
                CompletedAt = evaluation.CompletedAt
            };
        }
    }
}
