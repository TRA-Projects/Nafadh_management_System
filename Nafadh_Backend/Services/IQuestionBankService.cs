using Nafadh_Backend.Models;

namespace Nafadh_Backend.Services
{
    public interface IQuestionBankService
    {
        Task<IEnumerable<NFD_QuestionBank>> GetTrainerQuestionsAsync(
            int trainerId);

        Task<NFD_QuestionBank?> GetQuestionByIdAsync(
            int questionId,
            int trainerId);

        Task<NFD_QuestionBank> CreateQuestionAsync(
            NFD_QuestionBank question,
            int trainerId);

        Task<bool> UpdateQuestionAsync(
            int questionId,
            NFD_QuestionBank updatedQuestion,
            int trainerId);

        Task<bool> DeactivateQuestionAsync(
            int questionId,
            int trainerId);
    }
}
