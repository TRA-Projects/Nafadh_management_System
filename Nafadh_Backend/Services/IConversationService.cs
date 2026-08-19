using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.Services
{
    public interface IConversationService
    {
        Task<List<ConversationListItemDTO>> GetAsync(
            NFD_ConversationType? type,
            int? participantUserId,
            NFD_SupportTicketStatus? status
        );

        Task<ConversationDetailDTO?> GetByIdAsync(
            int conversationId
        );

        Task<ConversationDetailDTO> CreateAsync(
            CreateConversationDTO dto
        );

        Task<ConversationMessageDTO> AddMessageAsync(
            int conversationId,
            AddConversationMessageDTO dto
        );

        Task UpdateStatusAsync(
            int conversationId,
            UpdateConversationStatusDTO dto
        );

        Task MarkAsReadAsync(
            int conversationId,
            int userId
        );
    }
}