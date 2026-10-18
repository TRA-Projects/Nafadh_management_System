using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IQuizResultRepository
    {
        Task<List<NFD_QuizAttempt>> GetTrainerResultsAsync(
            int trainerId,
            int? quizId = null);

        // جلب نتائج المتدرب
        Task<List<NFD_QuizAttempt>> GetTraineeResultsAsync(
            int traineeId);
    }
}