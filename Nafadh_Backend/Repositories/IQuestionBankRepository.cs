using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IQuestionBankRepository
    {
        Task<List<NFD_QuestionBank>> GetByTrainerIdAsync(
            int trainerId);

        Task<NFD_QuestionBank?> GetByIdWithOptionsAsync(
            int questionId);

        Task AddAsync(NFD_QuestionBank question);

        void Update(NFD_QuestionBank question);

        Task SaveChangesAsync();
    }
}
