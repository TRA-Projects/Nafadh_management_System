
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IFeedbackRepository
    {
        Task<List<NFD_FeedbackCriterion>> GetCriteriaAsync(
            NFD_FeedbackType? appliesTo);

        Task<NFD_Feedback> AddFeedbackAsync(
            NFD_Feedback feedback);

        Task<List<NFD_Feedback>> GetByTrainerAsync(
            int trainerId);

        Task<List<NFD_Feedback>> GetByBatchAsync(
            int batchId);

        Task<bool> HasSubmittedAsync(
            int traineeId,
            int moduleId,
            NFD_FeedbackType type);

        // Checks whether a trainer evaluation was submitted
        // during the specified weekly or monthly period.
        Task<bool> HasSubmittedTrainerEvaluationAsync(
            int traineeId,
            int trainerId,
            int moduleId,
            string evaluationPeriod,
            DateTime periodStartUtc,
            DateTime periodEndUtc);
    }
}
