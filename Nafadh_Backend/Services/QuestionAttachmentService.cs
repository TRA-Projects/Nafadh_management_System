using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class QuestionAttachmentService : IQuestionAttachmentService
    {
        private readonly IQuestionAttachmentRepository _repository;
        private readonly IQuestionBankRepository _questionRepository;

        public QuestionAttachmentService(
            IQuestionAttachmentRepository repository,
            IQuestionBankRepository questionRepository)
        {
            _repository = repository;
            _questionRepository = questionRepository;
        }

        public async Task<IEnumerable<QuestionAttachmentDto>> GetByQuestionIdAsync(
            int questionId)
        {
            var question = await _questionRepository.GetByIdAsync(questionId);

            if (question == null)
            {
                throw new KeyNotFoundException(
                    $"Question with ID {questionId} was not found.");
            }

            var attachments =
                await _repository.GetByQuestionIdAsync(questionId);

            return attachments.Select(a => new QuestionAttachmentDto
            {
                QuestionAttachmentId = a.QuestionAttachmentId,
                QuestionId = a.QuestionId,
                FileName = a.FileName,
                FileUrl = a.FileUrl,
                UploadedAt = a.UploadedAt,
                UploadedByUserId = a.UploadedByUserId
            });
        }

        public async Task<QuestionAttachmentDto> CreateAsync(
            CreateQuestionAttachmentDto dto,
            int userId)
        {
            var question =
                await _questionRepository.GetByIdAsync(dto.QuestionId);

            if (question == null)
            {
                throw new KeyNotFoundException(
                    $"Cannot attach file. Question with ID {dto.QuestionId} does not exist.");
            }

            var attachment = new NFD_QuestionAttachment
            {
                QuestionId = dto.QuestionId,
                FileName = dto.File.FileName,
                FileUrl = dto.FileUrl ?? string.Empty,
                UploadedAt = DateTime.UtcNow,
                UploadedByUserId = userId
            };

            var created =
                await _repository.CreateAsync(attachment);

            return new QuestionAttachmentDto
            {
                QuestionAttachmentId = created.QuestionAttachmentId,
                QuestionId = created.QuestionId,
                FileName = created.FileName,
                FileUrl = created.FileUrl,
                UploadedAt = created.UploadedAt,
                UploadedByUserId = created.UploadedByUserId
            };
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var attachment =
                await _repository.GetByIdAsync(id);

            if (attachment == null)
            {
                return false;
            }

            await _repository.DeleteAsync(attachment);

            return true;
        }

        public async Task<string?> GetDownloadUrlAsync(int id)
        {
            var attachment =
                await _repository.GetByIdAsync(id);

            if (attachment == null)
            {
                return null;
            }

            return attachment.FileUrl;
        }
    }
}