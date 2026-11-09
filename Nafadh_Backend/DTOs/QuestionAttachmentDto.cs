namespace Nafadh_Backend.DTOs
{
    public class QuestionAttachmentDto
    {
        public int QuestionAttachmentId { get; set; }

        public int QuestionId { get; set; }

        public string FileName { get; set; } = string.Empty;

        public string FileUrl { get; set; } = string.Empty;

        public DateTime UploadedAt { get; set; }

        public int? UploadedByUserId { get; set; }
    }
}