using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IQuestionBankRepository
    {
        Task<IEnumerable<NFD_QuestionBank>>
            GetByTrainerIdAsync(int trainerId);

        Task<NFD_QuestionBank?>
            GetByIdAsync(int questionId);

        Task AddAsync(
            NFD_QuestionBank question);

        Task UpdateAsync(
            NFD_QuestionBank question);

        Task SaveChangesAsync();
    }
}
