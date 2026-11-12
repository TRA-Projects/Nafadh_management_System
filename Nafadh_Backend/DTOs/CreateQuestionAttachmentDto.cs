using Microsoft.AspNetCore.Http;

namespace Nafadh_Backend.DTOs
{
    public class CreateQuestionAttachmentDto
    {
        public int QuestionId { get; set; }

        public IFormFile File { get; set; } = null!;

        public string? FileUrl { get; set; } = string.Empty;
    }
}