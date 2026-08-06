using Nafadh_Backend.Enums;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class MessageDtos
    {

        //CreateMessage
        // 3. POST: /api/Message:
        public class CreateMessageDto
        {
            [Required]
            public int SenderId { get; set; }

            [Required]
            public int ReceiverId { get; set; }

            [Required]
            [MaxLength(1000)]
            public string Content { get; set; } = string.Empty;
        }

        //UpdateMessage
        //4. PUT: /api/Message/{id}/status:
        public class UpdateMessageStatusDto
        {
            [Required]
            public NFD_MessageStatus Status { get; set; }
        }
    }
}
