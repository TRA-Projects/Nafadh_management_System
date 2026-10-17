using Nafadh_Backend.DTOs;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public interface IQuizResultService
    {
        Task<List<QuizResultDto>> GetTrainerResultsAsync(
            int trainerId,
            int? quizId = null);

        Task<List<QuizResultDto>> GetTraineeResultsAsync(
    int traineeId);
    }

    public class QuizResultService
        : IQuizResultService
    {
        private readonly IQuizResultRepository _repository;

        public QuizResultService(
            IQuizResultRepository repository)
        {
            _repository = repository;
        }

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
                .Select(a => new QuizResultDto
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
                    Status = a.Status
                })
                .ToList();
        }
        public async Task<List<QuizResultDto>> GetTraineeResultsAsync(
    int traineeId)
        {
            var attempts = await _repository.GetTraineeResultsAsync(
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
                Status = a.Status
            }).ToList();
        }
    }
}
