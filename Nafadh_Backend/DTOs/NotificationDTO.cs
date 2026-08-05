using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{

    // Output DTO
    // Used for returning notifications to the client
    public class NotificationDTO
    {
        public int NotificationId { get; set; }


        public int UserId { get; set; }


        public string Title { get; set; }


        public string Message { get; set; }


        public bool IsRead { get; set; }


        public DateTime CreatedAt { get; set; }
    }



    // Input DTO
    // Used when creating a new system notification
    public class CreateNotificationDTO
    {
        [Required]
        public int UserId { get; set; }


        [Required]
        [MaxLength(200)]
        public string Title { get; set; }


        [Required]
        public string Message { get; set; }
    }



    // Input DTO
    // Used to mark one notification as read
    public class MarkNotificationReadDTO
    {
        public bool IsRead { get; set; } = true;
    }



    // Output DTO
    // Used for unread notification badge count
    public class UnreadCountDTO
    {
        public int Count { get; set; }
    }

}