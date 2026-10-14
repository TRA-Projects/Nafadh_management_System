using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IQuizQuestionRepository
    {
        Task<NFD_Quiz?> GetQuizWithQuestionsAsync(int quizId);

        Task<List<NFD_QuestionBank>> GetQuestionsByIdsAsync(
            List<int> questionIds);

        Task AddRangeAsync(
            List<NFD_QuizQuestion> quizQuestions);

        Task SaveChangesAsync();
    }
}
