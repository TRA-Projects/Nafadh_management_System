
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IQuizQuestionRepository
    {
        Task<NFD_Quiz?> GetQuizWithQuestionsAsync(int quizId);

        Task<List<NFD_QuestionBank>> GetQuestionsByIdsAsync(
            List<int> questionIds);

        Task<List<NFD_QuizQuestion>> GetQuizQuestionsAsync(
            int quizId);

        Task AddRangeAsync(
            List<NFD_QuizQuestion> quizQuestions);

        Task<NFD_QuizQuestion?> GetQuizQuestionByIdAsync(
    int quizId,
    int quizQuestionId);

        Task<bool> HasQuizAttemptsAsync(int quizId);

        void RemoveQuizQuestion(NFD_QuizQuestion quizQuestion);

        Task SaveChangesAsync();
    }
}
