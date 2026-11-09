using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Services
{
    public interface IQuestionAttachmentService
    {
        Task<IEnumerable<QuestionAttachmentDto>> GetByQuestionIdAsync(
            int questionId);

        Task<QuestionAttachmentDto> CreateAsync(
            CreateQuestionAttachmentDto dto,
            int userId);

        Task<bool> DeleteAsync(int id);

        Task<string?> GetDownloadUrlAsync(int id);
    }
}