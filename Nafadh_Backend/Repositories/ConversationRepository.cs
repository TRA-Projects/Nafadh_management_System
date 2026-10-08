using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
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
                                ||
                                m.ReceiverId ==
                                participantUserId.Value
                        )
                       ||
_context.NFD_ConversationGroupMembers.Any(
    gm =>
        gm.ConversationId == t.TicketId
        &&
        gm.UserId == participantUserId.Value
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
        //=============================
        //create batch group
        //=============================
        public async Task<int> CreateBatchGroupAsync(
            CreateBatchGroupDTO dto
        )
        {
            var batch = await _context.NFD_Batches
                .FirstOrDefaultAsync(
                    b => b.BatchId == dto.BatchId
                );

            if (batch == null)
            {
                throw new Exception(
                    "Batch not found."
                );
            }

            // check if batch group already exists
            var existingGroupId =
     await _context.NFD_ConversationGroupMembers
         .Where(
             gm =>
                 gm.BatchId == dto.BatchId
         )
         .Select(
             gm => gm.ConversationId
         )
         .FirstOrDefaultAsync();

            if (existingGroupId != 0)
            {
                return existingGroupId;
            }

            var conversation =
                new NFD_SupportTicket
                {
                    Type = NFD_ConversationType.Other,

                    Category = "BatchGroup",

                    Subject =
                        $"مجموعة {batch.BatchName}",

                    Message =
                        $"مجموعة {batch.BatchName}",

                    Status =
                        NFD_SupportTicketStatus.Open,

                    CreatedAt =
                        DateTime.UtcNow,

                    UserId =
                        dto.TrainerUserId
                };

            var firstMessage =
                new NFD_Message
                {
                    Content =
                        $"تم إنشاء مجموعة {batch.BatchName}",

                    SentDate =
                        DateTime.UtcNow,

                    Status =
                        NFD_MessageStatus.Sent,

                    SenderId =
                        dto.TrainerUserId,

                    ReceiverId = null
                };

            var created =
                await CreateAsync(
                    conversation,
                    firstMessage
                );

            var traineeUserIds =
                await _context.NFD_Enrollments
                    .Where(
                        e =>
                            e.BatchId ==
                            dto.BatchId
                    )
                    .Include(e => e.Trainee)
                    .ThenInclude(t => t.User)
                    .Select(
                        e =>
                            e.Trainee.User.UserId
                    )
                    .ToListAsync();

            var members =
                traineeUserIds
                    .Append(dto.TrainerUserId)
                    .Distinct()
                    .Select(
                        userId =>
                            new NFD_ConversationGroupMember
                            {
                                ConversationId =
                                    created.TicketId,

                                UserId =
                                    userId,

                                BatchId =
                                    dto.BatchId
                            }
                    )
                    .ToList();

            await _context.NFD_ConversationGroupMembers
                .AddRangeAsync(members);

            await _context.SaveChangesAsync();

            return created.TicketId;
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

        public async Task<int> GetUnreadConversationCountAsync(
            int userId,
            bool includeAllConversations
        )
        {
            // Count distinct threads, not every unread reply, because the bell
            // represents new conversations in the Communication area.
            return await _context.NFD_SupportTickets
                .Where(t =>
                    (includeAllConversations || t.UserId == userId) &&
                    t.Messages.Any(m =>
                        m.SenderId != userId &&
                        m.Status != NFD_MessageStatus.Read))
                .CountAsync();
        }


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