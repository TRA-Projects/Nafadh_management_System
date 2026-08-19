using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class ConversationRepository : IConversationRepository
    {
        private readonly Nafadhcontext _context;

        public ConversationRepository(
            Nafadhcontext context
        )
        {
            _context = context;
        }


        // ============================================================
        // Get conversations
        // ============================================================

        public async Task<List<NFD_SupportTicket>> GetAsync(
            NFD_ConversationType? type,
            int? participantUserId,
            NFD_SupportTicketStatus? status
        )
        {
            var query = _context.NFD_SupportTickets
                .Include(t => t.User)
                .Include(t => t.Messages)
                .AsQueryable();


            if (type.HasValue)
            {
                query = query.Where(
                    t => t.Type == type.Value
                );
            }


            if (participantUserId.HasValue)
            {
                query = query.Where(
                    t =>
                        t.UserId == participantUserId.Value
                        ||
                        t.Messages.Any(
                            m =>
                                m.SenderId ==
                                participantUserId.Value
                        )
                );
            }


            if (status.HasValue)
            {
                query = query.Where(
                    t => t.Status == status.Value
                );
            }


            return await query
                .OrderByDescending(
                    t =>
                        t.Messages.Any()
                            ? t.Messages.Max(
                                m => m.SentDate
                            )
                            : t.CreatedAt
                )
                .ToListAsync();
        }


        // ============================================================
        // Get one conversation
        // ============================================================

        public async Task<NFD_SupportTicket?> GetByIdAsync(
            int conversationId
        )
        {
            return await _context.NFD_SupportTickets

                .Include(t => t.User)

                .Include(t => t.Messages)
                    .ThenInclude(m => m.Sender)

                .FirstOrDefaultAsync(
                    t => t.TicketId == conversationId
                );
        }


        // ============================================================
        // Create conversation
        // ============================================================

        public async Task<NFD_SupportTicket> CreateAsync(
            NFD_SupportTicket conversation,
            NFD_Message firstMessage
        )
        {
            await _context.NFD_SupportTickets.AddAsync(
                conversation
            );

            await _context.SaveChangesAsync();


            firstMessage.TicketId =
                conversation.TicketId;


            await _context.NFD_Messages.AddAsync(
                firstMessage
            );

            await _context.SaveChangesAsync();


            return conversation;
        }


        // ============================================================
        // Add message
        // ============================================================

        public async Task<NFD_Message> AddMessageAsync(
            NFD_Message message
        )
        {
            await _context.NFD_Messages.AddAsync(
                message
            );

            await _context.SaveChangesAsync();

            return message;
        }


        // ============================================================
        // Update status
        // ============================================================

        public async Task UpdateStatusAsync(
            int conversationId,
            NFD_SupportTicketStatus status
        )
        {
            var conversation =
                await _context.NFD_SupportTickets
                    .FindAsync(conversationId);


            if (conversation == null)
            {
                throw new Exception(
                    "Conversation not found."
                );
            }


            conversation.Status = status;

            await _context.SaveChangesAsync();
        }


        // ============================================================
        // Mark conversation messages as read
        // ============================================================

        public async Task MarkMessagesAsReadAsync(
            int conversationId,
            int readerUserId
        )
        {
            var messages =
                await _context.NFD_Messages

                    .Where(
                        m =>
                            m.TicketId == conversationId
                            &&
                            m.SenderId != readerUserId
                            &&
                            m.Status != NFD_MessageStatus.Read
                    )

                    .ToListAsync();


            if (messages.Count == 0)
            {
                return;
            }


            foreach (var message in messages)
            {
                message.Status =
                    NFD_MessageStatus.Read;
            }


            await _context.SaveChangesAsync();
        }
    }
}