using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Models
{
    public class NFD_QuestionAttachment
    {
        [Key]
        public int QuestionAttachmentId { get; set; }

        public int QuestionId { get; set; }

        public string FileName { get; set; } = string.Empty;

        public string FileUrl { get; set; } = string.Empty;

        public DateTime UploadedAt { get; set; }

        public int? UploadedByUserId { get; set; }

        public NFD_QuestionBank? Question { get; set; }
    }
}