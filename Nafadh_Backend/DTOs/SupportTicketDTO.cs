using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    // Represents the data returned when retrieving a support ticket.
    public class SupportTicketDTO
    {
        // Unique identifier of the support ticket.
        public int TicketId { get; set; }

        // Title of the support ticket.
        public string Subject { get; set; } = string.Empty;

        // Detailed description of the support issue.
        public string Message { get; set; } = string.Empty;
        // Current status of the support ticket (e.g., Open, Closed).
        public NFD_SupportTicketStatus Status { get; set; }

        // Timestamp indicating when the ticket was created.
        public DateTime CreatedAt { get; set; }

        // Identifier of the user who created the ticket.
        public int UserId { get; set; }
    }

    // Represents the data required to create a new support ticket.
    public class CreateSupportTicketDTO
    {
        [Required]
        [MaxLength(150)]
        public string Subject { get; set; } = string.Empty;
        [Required]
        public string Message { get; set; } = string.Empty;

        [Required]
        public int UserId { get; set; } // Identifier of the user creating the ticket.
    }

    // Represents the data required to update a ticket's status.
    public class UpdateSupportTickerStatusDTO
    {
        [Required]
        public NFD_SupportTicketStatus Status { get; set; }
    }

}
