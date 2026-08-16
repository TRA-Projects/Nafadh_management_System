using Nafadh_Backend.Enums;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    // NEW: the Conversation feature — built on the extended NFD_SupportTicket
    // (as the conversation container) + NFD_Message (as threaded replies, via
    // TicketId). See api-contract-shared-entities.md §1.

    // ============================================================
    // Output DTO — GET /api/Conversation (list)
    // ============================================================
    public class ConversationListItemDTO
    {
        public int ConversationId { get; set; }
        public NFD_ConversationType Type { get; set; }
        public string? Category { get; set; }
        public string Subject { get; set; } = string.Empty;
        public NFD_SupportTicketStatus Status { get; set; }
        public string? LastMessagePreview { get; set; }
        public DateTime? LastMessageDate { get; set; }
        public int UnreadCount { get; set; }
        public string? StartedByName { get; set; }
    }

    // ============================================================
    // Output DTO — a single threaded message within a conversation
    // ============================================================
    public class ConversationMessageDTO
    {
        public int MessageId { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime SentDate { get; set; }
        public NFD_MessageStatus Status { get; set; }
        public int SenderId { get; set; }
        public string? SenderName { get; set; }
        public int? ReceiverId { get; set; }
        public int? TicketId { get; set; }
    }

    // ============================================================
    // Output DTO — GET /api/Conversation/{id}
    // ============================================================
    public class ConversationDetailDTO : ConversationListItemDTO
    {
        public List<ConversationMessageDTO> Messages { get; set; } = new List<ConversationMessageDTO>();
    }

    // ============================================================
    // Input DTO — POST /api/Conversation
    // ============================================================
    public class CreateConversationDTO
    {
        [Required]
        public NFD_ConversationType Type { get; set; }

        [MaxLength(150)]
        public string? Category { get; set; }

        [Required]
        [MaxLength(150)]
        public string Subject { get; set; } = string.Empty;

        [Required]
        public int StartedByUserId { get; set; }

        [Required]
        public string FirstMessage { get; set; } = string.Empty;
    }

    // ============================================================
    // Input DTO — POST /api/Conversation/{id}/messages
    // ============================================================
    public class AddConversationMessageDTO
    {
        [Required]
        public int SenderId { get; set; }

        [Required]
        [MaxLength(1000)]
        public string Content { get; set; } = string.Empty;
    }

    // ============================================================
    // Input DTO — PUT /api/Conversation/{id}/status
    // ============================================================
    public class UpdateConversationStatusDTO
    {
        [Required]
        public NFD_SupportTicketStatus Status { get; set; }
    }
}
