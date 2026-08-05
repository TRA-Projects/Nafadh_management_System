using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{

    // Output
    public class NotificationDTO
    {
        public int NotificationId { get; set; }

        public int UserId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public string? RelatedEntity { get; set; }

        public bool IsRead { get; set; }

        public DateTime CreatedAt { get; set; }
    }



    // Input - Create Notification
    public class CreateNotificationDTO
    {
        [Required]
        public int UserId { get; set; }


        [Required]
        [MaxLength(150)]
        public string Title { get; set; } = string.Empty;


        [Required]
        public string Message { get; set; } = string.Empty;


        [MaxLength(100)]
        public string? RelatedEntity { get; set; }
    }



    // Input - Mark notification as read
    public class MarkNotificationReadDTO
    {
        public bool IsRead { get; set; } = true;
    }



    // Output - unread count
    public class UnreadCountDTO
    {
        public int Count { get; set; }
    }

}