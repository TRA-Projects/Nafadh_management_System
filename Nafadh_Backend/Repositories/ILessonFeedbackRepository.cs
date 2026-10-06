


using Nafadh_Backend.Models;

namespace Nafadh_Backend.Interfaces
{
    public interface ILessonFeedbackRepository
    {
        Task<NFD_LessonFeedback?> GetByTraineeAndLessonAsync(
            int traineeId,
            int lessonId);

        Task<NFD_LessonFeedback> AddAsync(
            NFD_LessonFeedback feedback);

        Task UpdateAsync(
            NFD_LessonFeedback feedback);

        Task<bool> LessonExistsAsync(
            int lessonId);

        Task<bool> TraineeExistsAsync(
            int traineeId);
    }
}