using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IQuestionBankRepository
    {
        Task<IEnumerable<NFD_QuestionBank>>
            GetByTrainerIdAsync(int trainerId);

        Task<NFD_QuestionBank?>
            GetByIdAsync(int questionId);

        Task<bool> ModuleExistsAsync(int moduleId);

        Task<List<NFD_QuestionBank>> GetRandomQuestionsAsync(
    int trainerId,
    int moduleId,
    NFD_QuestionDifficulty difficulty,
    int count,
    HashSet<int> excludedQuestionIds);

        Task AddAsync(
            NFD_QuestionBank question);

        Task UpdateAsync(
            NFD_QuestionBank question);

        Task SaveChangesAsync();
    }
}
