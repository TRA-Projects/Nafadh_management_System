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
                var userId = participantUserId.Value;

                query = query.Where(t =>
                    t.Category == "BatchGroup"
                        ? _context.NFD_ConversationGroupMembers.Any(gm =>
                            gm.ConversationId == t.TicketId &&
                            gm.UserId == userId)
                        : (
                            t.UserId == userId ||
                            t.Messages.Any(m =>
                                m.SenderId == userId ||
                                m.ReceiverId == userId)
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
                    .Where(gm => gm.BatchId == dto.BatchId)
                    .Join(
                        _context.NFD_SupportTickets,
                        gm => gm.ConversationId,
                        ticket => ticket.TicketId,
                        (gm, ticket) => new { gm, ticket }
                    )
                    .Where(x => x.ticket.Category == "BatchGroup")
                    .Select(x => x.ticket.TicketId)
                    .FirstOrDefaultAsync();


            if (existingGroupId != 0)
            {
                // جلب المتدربين المسجلين حاليًا في الدفعة
                var existingGroupTraineeUserIds = await _context.NFD_Enrollments
                     .Where(e => e.BatchId == dto.BatchId)
                    .Select(e => e.Trainee.User.UserId)
                    .ToListAsync();

                // إضافة المدرب إلى قائمة الأعضاء المطلوبين
                var requiredUserIds = existingGroupTraineeUserIds
                     .Append(dto.TrainerUserId)
                    .Distinct()
                    .ToList();

                // جلب الأعضاء الموجودين بالفعل في الجروب
                var existingMemberIds = await _context.NFD_ConversationGroupMembers
                    .Where(gm => gm.ConversationId == existingGroupId)
                    .Select(gm => gm.UserId)
                    .ToListAsync();

                // تحديد الأعضاء الجدد فقط
                var newMemberIds = requiredUserIds
                    .Except(existingMemberIds)
                    .ToList();

                if (newMemberIds.Any())
                {
                    var newMembers = newMemberIds.Select(userId =>
                        new NFD_ConversationGroupMember
                        {
                            ConversationId = existingGroupId,
                            UserId = userId,
                            BatchId = dto.BatchId
                        }
                    );

                    await _context.NFD_ConversationGroupMembers
                        .AddRangeAsync(newMembers);

                    await _context.SaveChangesAsync();
                }

                // إرجاع نفس الجروب دون إنشاء جروب جديد
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
        public async Task<int?> GetBatchIdAsync(
      int conversationId
  )
        {
            return await _context.NFD_ConversationGroupMembers
                .Where(
                    gm => gm.ConversationId == conversationId
                )
                .Select(
                    gm => (int?)gm.BatchId
                )
                .FirstOrDefaultAsync();
        }
        public async Task<bool> IsBatchGroupMemberAsync(
    int conversationId,
    int userId
)
        {
            return await _context.NFD_ConversationGroupMembers
                .AnyAsync(gm =>
                    gm.ConversationId == conversationId &&
                    gm.UserId == userId
                );
        }
        public async Task<string?> GetBatchNameAsync(
            int conversationId
        )
        {
            return await _context.NFD_ConversationGroupMembers
                .Where(
                    gm => gm.ConversationId == conversationId
                )
                .Join(
                    _context.NFD_Batches,
                    gm => gm.BatchId,
                    b => b.BatchId,
                    (gm, b) => b.BatchName
                )
                .FirstOrDefaultAsync();
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

        public async Task<Dictionary<int, int>> GetGroupUnreadCountsAsync(
            int userId,
            List<int> conversationIds
        )
        {
            if (conversationIds.Count == 0)
                return new Dictionary<int, int>();

            var counts = await (
                from member in _context.NFD_ConversationGroupMembers
                where member.UserId == userId
                      && conversationIds.Contains(member.ConversationId)
                select new
                {
                    member.ConversationId,
                    UnreadCount = _context.NFD_Messages.Count(m =>
                        m.TicketId == member.ConversationId &&
                        m.SenderId != userId &&
                        (!member.LastReadMessageId.HasValue ||
                         m.MessageId > member.LastReadMessageId.Value))
                }
            ).ToListAsync();

            return counts
                .GroupBy(x => x.ConversationId)
                .ToDictionary(
                    g => g.Key,
                    g => g.First().UnreadCount
                );
        }


        public async Task<int> GetUnreadConversationCountAsync(
            int userId,
            bool includeAllConversations
        )
        {
            // المحادثات الفردية: نحتفظ بطريقة الحساب السابقة
            var individualCount = await _context.NFD_SupportTickets
                .Where(t =>
                    t.Category != "BatchGroup" &&
                    (includeAllConversations || t.UserId == userId) &&
                    t.Messages.Any(m =>
                        m.SenderId != userId &&
                        m.Status != NFD_MessageStatus.Read))
                .CountAsync();

            // جروبات الدفعات: كل عضو له حالة قراءة مستقلة
            var groupCount = await _context.NFD_ConversationGroupMembers
                .Where(gm => gm.UserId == userId)
                .Where(gm => _context.NFD_SupportTickets.Any(t =>
                    t.TicketId == gm.ConversationId &&
                    t.Category == "BatchGroup"))
                .Where(gm => _context.NFD_Messages.Any(m =>
                    m.TicketId == gm.ConversationId &&
                    m.SenderId != userId &&
                    (!gm.LastReadMessageId.HasValue ||
                     m.MessageId > gm.LastReadMessageId.Value)))
                .Select(gm => gm.ConversationId)
                .Distinct()
                .CountAsync();

            return individualCount + groupCount;
        }


        public async Task MarkMessagesAsReadAsync(
            int conversationId,
            int readerUserId
        )
        {
            // تحديد نوع المحادثة
            var conversation = await _context.NFD_SupportTickets
                .FirstOrDefaultAsync(t => t.TicketId == conversationId);

            if (conversation == null)
            {
                throw new InvalidOperationException(
                    "Conversation not found."
                );
            }

            // جروبات الدفعات: قراءة مستقلة لكل عضو
            if (conversation.Category == "BatchGroup")
            {
                var member = await _context.NFD_ConversationGroupMembers
                    .FirstOrDefaultAsync(gm =>
                        gm.ConversationId == conversationId &&
                        gm.UserId == readerUserId
                    );

                if (member == null)
                {
                    throw new InvalidOperationException(
                        "User is not a member of this batch group."
                    );
                }

                // آخر رسالة موجودة في الجروب
                var lastMessageId = await _context.NFD_Messages
                    .Where(m => m.TicketId == conversationId)
                    .MaxAsync(m => (int?)m.MessageId);

                if (lastMessageId.HasValue &&
                    (!member.LastReadMessageId.HasValue ||
                     lastMessageId.Value > member.LastReadMessageId.Value))
                {
                    member.LastReadMessageId = lastMessageId.Value;
                    await _context.SaveChangesAsync();
                }

                return;
            }

            // المحادثات الفردية: الاحتفاظ بالنظام الحالي
            var messages = await _context.NFD_Messages
                .Where(m =>
                    m.TicketId == conversationId &&
                    m.SenderId != readerUserId &&
                    m.Status != NFD_MessageStatus.Read
                )
                .ToListAsync();

            if (messages.Count == 0)
            {
                return;
            }

            foreach (var message in messages)
            {
                message.Status = NFD_MessageStatus.Read;
            }

            await _context.SaveChangesAsync();
        }

       
    }
}