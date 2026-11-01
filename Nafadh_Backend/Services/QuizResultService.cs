
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    // ==========================================
    // Interface
    // ==========================================
    public interface IQuizResultService
    {
        Task<List<QuizResultDto>> GetTrainerResultsAsync(
            int trainerId,
            int? quizId = null);

        Task<List<QuizResultDto>> GetTraineeResultsAsync(
            int traineeId);

        Task<List<QuizResultDto>> GetAdminTraineeResultsAsync(
            int traineeId);

        Task<QuizAttemptDetailsDto> GetTrainerAttemptDetailsAsync(
            int attemptId,
            int trainerId);
    }

    // ==========================================
    // Service
    // ==========================================
    public class QuizResultService : IQuizResultService
    {
        private readonly IQuizResultRepository _repository;

        public QuizResultService(IQuizResultRepository repository)
        {
            _repository = repository;
        }

        // ==========================================
        // تحديد إذا انتهت المحاولة
        // ==========================================
        private static bool IsCompleted(NFD_QuizAttempt attempt)
        {
            return attempt.Status == "Graded" ||
                   attempt.Status == "Submitted" ||
                   attempt.Status == "Expired" ||
                   attempt.Status == "Terminated";
        }

        // ==========================================
        // التحقق من اكتمال التصحيح
        // ==========================================
        private static bool IsGradingCompleted(
            NFD_QuizAttempt attempt)
        {
            if (!IsCompleted(attempt))
            {
                return false;
            }

            return attempt.AttemptQuestions.All(aq =>
                aq.Question.QuestionType !=
                    NFD_QuizQuestionType.Essay ||

                !aq.Answers.Any() ||

                aq.Answers.All(answer =>
                    answer.IsManuallyGraded));
        }

        // ==========================================
        // تحديد النجاح أو الرسوب
        // ==========================================
        private static bool? GetIsPassed(
            NFD_QuizAttempt attempt,
            bool gradingCompleted)
        {
            if (!gradingCompleted)
            {
                return null;
            }

            return attempt.Percentage >=
                   attempt.Quiz.PassingPercentage;
        }

        // ==========================================
        // تحويل المحاولة إلى DTO
        // ==========================================
        private static QuizResultDto MapResult(
            NFD_QuizAttempt attempt)
        {
            var gradingCompleted =
                IsGradingCompleted(attempt);

            return new QuizResultDto
            {
                AttemptId = attempt.AttemptId,
                QuizId = attempt.QuizId,
                QuizTitle = attempt.Quiz.Title,

                BatchId = attempt.Quiz.BatchId,
                BatchName = attempt.Quiz.Batch.BatchName,

                TraineeId = attempt.TraineeId,
                TraineeName = attempt.Trainee.User.FullName,

                AttemptNumber = attempt.AttemptNumber,

                StartedAt = attempt.StartedAt,
                SubmittedAt = attempt.SubmittedAt,

                Score = attempt.Score,
                Percentage = attempt.Percentage,
                Status = attempt.Status,

                PassingPercentage =
                    attempt.Quiz.PassingPercentage,

                IsGradingCompleted = gradingCompleted,

                IsPassed = GetIsPassed(
                    attempt,
                    gradingCompleted)
            };
        }

        // ==========================================
        // 1. نتائج المدرب
        // ==========================================
        public async Task<List<QuizResultDto>>
            GetTrainerResultsAsync(
                int trainerId,
                int? quizId = null)
        {
            var attempts =
                await _repository.GetTrainerResultsAsync(
                    trainerId,
                    quizId);

            return attempts
                .Select(MapResult)
                .ToList();
        }

        // ==========================================
        // 2. نتائج المتدرب لنفسه
        // الحفاظ على السلوك الحالي
        // ==========================================
        public async Task<List<QuizResultDto>>
            GetTraineeResultsAsync(int traineeId)
        {
            var attempts =
                await _repository.GetTraineeResultsAsync(
                    traineeId);

            return attempts.Select(a => new QuizResultDto
            {
                AttemptId = a.AttemptId,
                QuizId = a.QuizId,
                QuizTitle = a.Quiz.Title,

                TraineeId = a.TraineeId,
                TraineeName = a.Trainee.User.FullName,

                AttemptNumber = a.AttemptNumber,

                StartedAt = a.StartedAt,
                SubmittedAt = a.SubmittedAt,

                Score = a.Score,
                Percentage = a.Percentage,
                Status = a.Status,

                PassingPercentage =
                    a.Quiz.PassingPercentage,

                IsGradingCompleted = true,

                IsPassed =
                    a.Percentage >=
                    a.Quiz.PassingPercentage
            }).ToList();
        }

        // ==========================================
        // 3. نتائج المتدرب للأدمن
        // جميع المحاولات
        // ==========================================
        public async Task<List<QuizResultDto>>
            GetAdminTraineeResultsAsync(int traineeId)
        {
            var attempts =
                await _repository.GetAdminTraineeResultsAsync(
                    traineeId);

            return attempts
                .Select(MapResult)
                .ToList();
        }

        // ==========================================
        // 4. تفاصيل المحاولة للمدرب
        // ==========================================
        public async Task<QuizAttemptDetailsDto>
            GetTrainerAttemptDetailsAsync(
                int attemptId,
                int trainerId)
        {
            var attempt =
                await _repository.GetTrainerAttemptDetailsAsync(
                    attemptId,
                    trainerId);

            if (attempt == null)
            {
                throw new KeyNotFoundException(
                    "المحاولة غير موجودة أو لا تتبع لهذا المدرب.");
            }

            var gradingCompleted =
                IsGradingCompleted(attempt);

            return new QuizAttemptDetailsDto
            {
                AttemptId = attempt.AttemptId,
                QuizId = attempt.QuizId,
                QuizTitle = attempt.Quiz.Title,

                TraineeId = attempt.TraineeId,
                TraineeName = attempt.Trainee.User.FullName,

                AttemptNumber = attempt.AttemptNumber,

                Status = attempt.Status,
                Score = attempt.Score,
                Percentage = attempt.Percentage,

                PassingPercentage =
                    attempt.Quiz.PassingPercentage,

                IsGradingCompleted = gradingCompleted,

                IsPassed = GetIsPassed(
                    attempt,
                    gradingCompleted),

                Answers = attempt.AttemptQuestions
                    .OrderBy(aq => aq.QuestionOrder)
                    .Select(aq =>
                    {
                        var answer = aq.Answers
                            .OrderByDescending(a =>
                                a.AnsweredAt)
                            .FirstOrDefault();

                        var isEssay =
                            aq.Question.QuestionType ==
                            NFD_QuizQuestionType.Essay;

                        return new QuizAnswerDetailsDto
                        {
                            AnswerId =
                                answer?.AnswerId ?? 0,

                            AttemptQuestionId =
                                aq.AttemptQuestionId,

                            QuestionId = aq.QuestionId,

                            QuestionOrder = aq.QuestionOrder,

                            QuestionText =
                                aq.Question.QuestionText,

                            QuestionType =
                                aq.Question.QuestionType.ToString(),

                            SelectedOptionId =
                                answer?.SelectedOptionId,

                            SelectedOptionText =
                                answer?.SelectedOption?.OptionText,

                            TextAnswer = answer?.TextAnswer,

                            MaxPoints = aq.Points,

                            AwardedPoints =
                                answer?.AwardedPoints ?? 0,

                            IsCorrect = answer?.IsCorrect,

                            IsManuallyGraded =
                                answer?.IsManuallyGraded ?? false,

                            IsMarkedForReview =
                                answer?.IsMarkedForReview ?? false,

                            RequiresManualGrading =
                                isEssay &&
                                answer != null &&
                                !answer.IsManuallyGraded
                        };
                    })
                    .ToList()
            };
        }
    }
}
