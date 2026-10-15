using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IQuizAttemptRepository
    {
        Task<NFD_Quiz?> GetQuizForAttemptAsync(int quizId);

        Task<int> GetAttemptsCountAsync(
            int quizId,
            int traineeId);


        Task<bool> IsTraineeEnrolledInBatchAsync(
            int traineeId,
            int batchId);

        Task AddAttemptAsync(
            NFD_QuizAttempt attempt);

        Task SaveChangesAsync();
        Task<NFD_QuizAttempt?> GetAttemptForAnswerAsync(
    int attemptId);

        Task<NFD_QuizAttempt?> GetAttemptForSubmissionAsync(
            int attemptId);

        Task<NFD_QuizAnswer?> GetAnswerAsync(
            int attemptQuestionId);

        Task AddAnswerAsync(
            NFD_QuizAnswer answer);

        void UpdateAnswer(
            NFD_QuizAnswer answer);

    }
}
