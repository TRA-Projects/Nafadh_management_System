
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class FeedbackService : IFeedbackService
    {
        private readonly IFeedbackRepository _repository;

        public FeedbackService(IFeedbackRepository repository)
        {
            _repository = repository;
        }

        public async Task<List<FeedbackCriterionDTO>> GetCriteriaAsync(
            NFD_FeedbackType? appliesTo)
        {
            var criteria = await _repository.GetCriteriaAsync(appliesTo);

            return criteria.Select(c => new FeedbackCriterionDTO
            {
                CriterionId = c.CriterionId,
                AppliesTo = c.AppliesTo,
                Name = c.Name,
                OrderIndex = c.OrderIndex
            }).ToList();
        }

        public async Task<FeedbackDTO> CreateFeedbackAsync(
            CreateFeedbackDTO dto)
        {
            if (dto == null)
            {
                throw new ArgumentNullException(nameof(dto));
            }

            if (dto.Scores == null || !dto.Scores.Any())
            {
                throw new ArgumentException(
                    "At least one feedback score is required.");
            }

            var nowUtc = DateTime.UtcNow;

            string? evaluationPeriod = null;

            // =====================================================
            // TRAINER EVALUATION - WEEKLY / MONTHLY VALIDATION
            // =====================================================

            if (dto.Type == NFD_FeedbackType.TrainerRating)
            {
                if (!dto.TrainerId.HasValue ||
                    dto.TrainerId.Value <= 0)
                {
                    throw new ArgumentException(
                        "A valid trainer ID is required.");
                }

                evaluationPeriod = dto.EvaluationPeriod?.Trim();

                if (string.IsNullOrWhiteSpace(evaluationPeriod))
                {
                    throw new ArgumentException(
                        "Evaluation period is required. Use Weekly or Monthly.");
                }

                if (!string.Equals(
                        evaluationPeriod,
                        "Weekly",
                        StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(
                        evaluationPeriod,
                        "Monthly",
                        StringComparison.OrdinalIgnoreCase))
                {
                    throw new ArgumentException(
                        "Invalid evaluation period. Use Weekly or Monthly.");
                }

                evaluationPeriod =
                    string.Equals(
                        evaluationPeriod,
                        "Weekly",
                        StringComparison.OrdinalIgnoreCase)
                        ? "Weekly"
                        : "Monthly";

                DateTime periodStartUtc;
                DateTime periodEndUtc;

                if (evaluationPeriod == "Weekly")
                {
                    // Week starts on Monday and ends before
                    // the following Monday (UTC).
                    var daysSinceMonday =
                        ((int)nowUtc.DayOfWeek + 6) % 7;

                    periodStartUtc = nowUtc.Date.AddDays(
                        -daysSinceMonday);

                    periodEndUtc = periodStartUtc.AddDays(7);
                }
                else
                {
                    // Calendar month in UTC.
                    periodStartUtc = new DateTime(
                        nowUtc.Year,
                        nowUtc.Month,
                        1,
                        0,
                        0,
                        0,
                        DateTimeKind.Utc);

                    periodEndUtc = periodStartUtc.AddMonths(1);
                }

                // Prevent duplicate submissions for the same
                // trainee, trainer, module, and evaluation period.
                var alreadySubmitted =
                    await _repository
                        .HasSubmittedTrainerEvaluationAsync(
                            dto.TraineeId,
                            dto.TrainerId.Value,
                            dto.ModuleId,
                            evaluationPeriod,
                            periodStartUtc,
                            periodEndUtc);

                if (alreadySubmitted)
                {
                    if (evaluationPeriod == "Weekly")
                    {
                        throw new InvalidOperationException(
                            "تم إرسال التقييم الأسبوعي مسبقًا. يمكنك التقييم مرة أخرى في الأسبوع القادم.");
                    }

                    throw new InvalidOperationException(
                        "تم إرسال التقييم الشهري مسبقًا. يمكنك التقييم مرة أخرى في الشهر القادم.");
                }
            }

            // =====================================================
            // CREATE FEEDBACK
            // =====================================================

            var feedback = new NFD_Feedback
            {
                Type = dto.Type,

                TraineeId = dto.TraineeId,

                ModuleId = dto.ModuleId,

                TrainerId =
                    dto.Type == NFD_FeedbackType.TrainerRating
                        ? dto.TrainerId
                        : null,

                BatchId =
                    dto.Type == NFD_FeedbackType.BatchExperienceRating
                        ? dto.BatchId
                        : null,

                EvaluationPeriod = evaluationPeriod,

                Comment = dto.Comment,

                SubmittedAt = nowUtc,

                Scores = dto.Scores.Select(s =>
                    new NFD_FeedbackScore
                    {
                        CriterionId = s.CriterionId,
                        Score = s.Score
                    }).ToList()
            };

            var created =
                await _repository.AddFeedbackAsync(feedback);

            // =====================================================
            // RETURN CREATED FEEDBACK
            // =====================================================

            return new FeedbackDTO
            {
                FeedbackId = created.FeedbackId,

                Type = created.Type,

                TraineeId = created.TraineeId,

                ModuleId = created.ModuleId,

                TrainerId = created.TrainerId,

                BatchId = created.BatchId,

                EvaluationPeriod = created.EvaluationPeriod,

                Comment = created.Comment,

                SubmittedAt = created.SubmittedAt,

                Scores = dto.Scores
            };
        }

        // =========================================================
        // TRAINER FEEDBACK SUMMARY
        // =========================================================

        public async Task<FeedbackSummaryDTO> GetTrainerSummaryAsync(
            int trainerId)
        {
            var feedbacks =
                await _repository.GetByTrainerAsync(trainerId);

            return Summarize(feedbacks);
        }

        // =========================================================
        // BATCH FEEDBACK SUMMARY
        // =========================================================

        public async Task<FeedbackSummaryDTO> GetBatchSummaryAsync(
            int batchId)
        {
            var feedbacks =
                await _repository.GetByBatchAsync(batchId);

            return Summarize(feedbacks);
        }

        // =========================================================
        // PENDING FEEDBACK
        // =========================================================

        public async Task<FeedbackPendingDTO> GetPendingAsync(
            int moduleId,
            int traineeId)
        {
            // Existing pending contract is preserved.
            // Period-specific trainer eligibility must be checked
            // through HasSubmittedTrainerEvaluationAsync.

            var trainerRatingSubmitted =
                await _repository.HasSubmittedAsync(
                    traineeId,
                    moduleId,
                    NFD_FeedbackType.TrainerRating);

            var batchRatingSubmitted =
                await _repository.HasSubmittedAsync(
                    traineeId,
                    moduleId,
                    NFD_FeedbackType.BatchExperienceRating);

            return new FeedbackPendingDTO
            {
                TrainerRatingPending = !trainerRatingSubmitted,

                BatchRatingPending = !batchRatingSubmitted
            };
        }

        // =========================================================
        // FEEDBACK SUMMARY HELPER
        // =========================================================

        private static FeedbackSummaryDTO Summarize(
            List<NFD_Feedback> feedbacks)
        {
            var allScores = feedbacks
                .SelectMany(f => f.Scores)
                .ToList();

            var perCriterion = allScores
                .GroupBy(s => new
                {
                    s.CriterionId,
                    Name = s.Criterion?.Name
                })
                .Select(g => new FeedbackCriterionAverageDTO
                {
                    CriterionId = g.Key.CriterionId,

                    Name = g.Key.Name,

                    Average = g.Average(s => s.Score)
                })
                .ToList();

            return new FeedbackSummaryDTO
            {
                AverageOverall = allScores.Count > 0
                    ? allScores.Average(s => s.Score)
                    : 0,

                PerCriterion = perCriterion,

                Comments = feedbacks
                    .Where(f =>
                        !string.IsNullOrWhiteSpace(f.Comment))
                    .Select(f => new FeedbackCommentDTO
                    {
                        Comment = f.Comment!,

                        Date = f.SubmittedAt
                    })
                    .OrderByDescending(c => c.Date)
                    .ToList(),

                ResponseCount = feedbacks.Count
            };
        }
    }
}
