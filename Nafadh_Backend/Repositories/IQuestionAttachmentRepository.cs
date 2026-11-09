using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IQuestionAttachmentRepository
    {
        Task<IEnumerable<NFD_QuestionAttachment>> GetByQuestionIdAsync(int questionId);

        Task<NFD_QuestionAttachment?> GetByIdAsync(int id);

        Task<NFD_QuestionAttachment> CreateAsync(
            NFD_QuestionAttachment attachment);

        Task DeleteAsync(
            NFD_QuestionAttachment attachment);

        Task<bool> ExistsAsync(int id);
    }
}