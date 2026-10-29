using Nafadh_Backend.DTOs;
using Nafadh_Backend.DTOs.CompanyPayment;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class ConversationService : IConversationService
    {
        private readonly IConversationRepository _repository;
        private readonly IConfiguration _configuration;


        public ConversationService(
            IConversationRepository repository,
            IConfiguration configuration
        )
        {
            _repository = repository;
            _configuration = configuration;
        }


        // ============================================================
        // Get conversations
        // ============================================================

        public async Task<List<ConversationListItemDTO>> GetAsync(
            NFD_ConversationType? type,
            int? participantUserId,
            NFD_SupportTicketStatus? status
        )
        {
            var conversations =
                await _repository.GetAsync(
                    type,
                    participantUserId,
                    status
                );


            var result = new List<ConversationListItemDTO>();
            var groupUnreadCounts = participantUserId.HasValue
    ? await _repository.GetGroupUnreadCountsAsync(
        participantUserId.Value,
        conversations
            .Where(c => c.Category == "BatchGroup")
            .Select(c => c.TicketId)
            .ToList()
      )
    : new Dictionary<int, int>();

            foreach (var conversation in conversations)
            {
                var batchId =
                    await _repository.GetBatchIdAsync(
                        conversation.TicketId
                    );
                var batchName =
    await _repository.GetBatchNameAsync(
        conversation.TicketId
    );

                result.Add(
                    MapToListItem(
                        conversation,
                        participantUserId,
                        batchId,
        batchName
                    )
                );
            }
            foreach (var item in result.Where(
      x => x.Category == "BatchGroup"))
            {
                item.UnreadCount =
                    groupUnreadCounts.GetValueOrDefault(item.ConversationId);
            }
            return result;
        }


        // ============================================================
        // Get conversation details
        // ============================================================

        public async Task<ConversationDetailDTO?> GetByIdAsync(
            int conversationId
        )
        {
            var conversation =
                await _repository.GetByIdAsync(
                    conversationId
                );


            if (conversation == null)
            {
                return null;
            }

            var batchId =
                await _repository.GetBatchIdAsync(
                    conversationId
                );

            var detail = MapToDetail(conversation, batchId);
            detail.BatchName = await _repository.GetBatchNameAsync(conversationId);
            return detail;
        }

        public async Task<List<AdminBatchGroupListDTO>> GetAdminBatchGroupsAsync()
        {
            return await _repository.GetAdminBatchGroupsAsync();
        }

        public async Task<List<AdminBatchGroupMessageDTO>?>
    GetAdminBatchGroupMessagesAsync(int conversationId)
        {
            return await _repository.GetAdminBatchGroupMessagesAsync(conversationId);
        }

        public async Task<bool> IsBatchGroupMemberAsync(
    int conversationId,
    int userId
)
        {
            return await _repository.IsBatchGroupMemberAsync(
                conversationId,
                userId
            );
        }
        // ============================================================
        // Create conversation
        // ============================================================

        public async Task<ConversationDetailDTO> CreateAsync(
            CreateConversationDTO dto
        )
        {
            var conversation =
                new NFD_SupportTicket
                {
                    Type = dto.Type,

                    Category = dto.Category,

                    Subject = dto.Subject,

                    Message = dto.FirstMessage,

                    Status =
                        NFD_SupportTicketStatus.Open,

                    CreatedAt =
                        DateTime.UtcNow,

                    UserId =
                        dto.StartedByUserId
                };


            var firstMessage =
                new NFD_Message
                {
                    Content =
                        dto.FirstMessage,

                    SentDate =
                        DateTime.UtcNow,

                    Status =
                        NFD_MessageStatus.Sent,

                    SenderId =
                        dto.StartedByUserId,

                    ReceiverId = dto.ReceiverUserId

                };


            // ========================================================
            // Save optional attachment
            // ========================================================

            if (
                dto.Attachment != null &&
                dto.Attachment.Length > 0
            )
            {
                // ----------------------------------------------------
                // Validate maximum file size: 10 MB
                // ----------------------------------------------------

                const long maxFileSize =
                    10 * 1024 * 1024;


                if (dto.Attachment.Length > maxFileSize)
                {
                    throw new InvalidOperationException(
                        "Attachment size cannot exceed 10 MB."
                    );
                }


                // ----------------------------------------------------
                // Validate extension
                // ----------------------------------------------------

                var extension =
                    Path.GetExtension(
                        dto.Attachment.FileName
                    )
                    .ToLowerInvariant();


                var allowedExtensions =
                    new[]
                    {
                        ".pdf",
                        ".png",
                        ".jpg",
                        ".jpeg"
                    };


                if (!allowedExtensions.Contains(extension))
                {
                    throw new InvalidOperationException(
                        "Only PDF, PNG, JPG and JPEG files are allowed."
                    );
                }


                // ----------------------------------------------------
                // Get storage folder
                // ----------------------------------------------------

                var uploadsFolder =
                    _configuration[
                        "Storage:ConversationAttachmentsPath"
                    ];


                if (string.IsNullOrWhiteSpace(uploadsFolder))
                {
                    throw new InvalidOperationException(
                        "Conversation attachments storage path is not configured."
                    );
                }


                Directory.CreateDirectory(
                    uploadsFolder
                );


                // ----------------------------------------------------
                // Generate unique file name
                // ----------------------------------------------------

                var generatedFileName =
                    $"{Guid.NewGuid()}{extension}";


                var fullPath =
                    Path.Combine(
                        uploadsFolder,
                        generatedFileName
                    );


                // ----------------------------------------------------
                // Save physical file
                // ----------------------------------------------------

                await using (
                    var stream =
                        new FileStream(
                            fullPath,
                            FileMode.Create
                        )
                )
                {
                    await dto.Attachment.CopyToAsync(
                        stream
                    );
                }


                // ----------------------------------------------------
                // Create public/request URL
                // ----------------------------------------------------

                var requestPath =
                    _configuration[
                        "Storage:ConversationAttachmentsRequestPath"
                    ];


                if (string.IsNullOrWhiteSpace(requestPath))
                {
                    requestPath =
                        "/uploads/conversation-attachments";
                }


                requestPath =
                    requestPath.TrimEnd('/');


                var attachmentUrl =
                    $"{requestPath}/{generatedFileName}";


                // ----------------------------------------------------
                // Save attachment information in NFD_Message
                // ----------------------------------------------------

                firstMessage.AttachmentUrl =
                    attachmentUrl;

                firstMessage.AttachmentFileName =
                    dto.Attachment.FileName;

                firstMessage.AttachmentContentType =
                    dto.Attachment.ContentType;

                firstMessage.AttachmentFileSize =
                    dto.Attachment.Length;
            }


            var created =
                await _repository.CreateAsync(
                    conversation,
                    firstMessage
                );


            var full =
                await _repository.GetByIdAsync(
                    created.TicketId
                );

            return MapToDetail(
                full!,
                null
            );
        }


        // ============================================================
        // Add message
        // ============================================================
        public async Task<ConversationMessageDTO> AddMessageAsync(
            int conversationId,
            AddConversationMessageDTO dto
        )
        {
            // Load the conversation once; the repository includes its messages.
            var conversation = await _repository.GetByIdAsync(conversationId);
            if (conversation == null)
                throw new KeyNotFoundException("المحادثة غير موجودة.");

            var content = dto.Content?.Trim() ?? string.Empty;
            if (dto.SenderId <= 0 || content.Length == 0 || content.Length > 1000)
                throw new ArgumentException("معرف المرسل ونص رسالة من 1 إلى 1000 حرف مطلوبة.");

            int? receiverId = dto.ReceiverUserId;

            if (conversation.Category == "BatchGroup")
            {
                // Group messages have no single recipient.
                receiverId = null;
            }
            else if (conversation.Type == NFD_ConversationType.Other &&
                     conversation.Category == "TrainerTrainee")
            {
                // Resolve the two original participants, not the most recent sender.
                // This keeps replies correct even after consecutive messages.
                var messages = conversation.Messages?
                    .OrderBy(m => m.SentDate)
                    .ThenBy(m => m.MessageId)
                    .ToList() ?? new List<NFD_Message>();

                var creatorUserId = conversation.UserId;
                var firstMessage = messages.FirstOrDefault();
                int? otherUserId = firstMessage?.SenderId == creatorUserId
                    ? firstMessage.ReceiverId
                    : firstMessage?.SenderId;

                // Older threads may not store a receiver in their first message.
                // Recover it from the existing participants in those threads.
                if (!otherUserId.HasValue)
                {
                    otherUserId = messages
                        .Where(m => m.SenderId > 0 && m.SenderId != creatorUserId)
                        .Select(m => (int?)m.SenderId)
                        .FirstOrDefault();
                    otherUserId ??= messages
                        .Where(m => m.ReceiverId.HasValue && m.ReceiverId != creatorUserId)
                        .Select(m => m.ReceiverId)
                        .FirstOrDefault();
                }

                if (!otherUserId.HasValue || otherUserId.Value <= 0 ||
                    otherUserId.Value == creatorUserId)
                    throw new ArgumentException("تعذر تحديد الطرف الآخر في المحادثة.");

                if (dto.SenderId == creatorUserId)
                    receiverId = otherUserId.Value;
                else if (dto.SenderId == otherUserId.Value)
                    receiverId = creatorUserId;
                else
                    throw new ArgumentException("المرسل ليس طرفًا في المحادثة.");
            }

            var message = new NFD_Message
            {
                Content = content,
                SentDate = DateTime.UtcNow,
                Status = NFD_MessageStatus.Sent,
                SenderId = dto.SenderId,
                ReceiverId = receiverId,
                TicketId = conversationId
            };

            var created = await _repository.AddMessageAsync(message);

            return new ConversationMessageDTO
            {
                MessageId = created.MessageId,
                Content = created.Content,
                SentDate = created.SentDate,
                Status = created.Status,
                SenderId = created.SenderId,
                SenderName = null,
                ReceiverId = created.ReceiverId,
                TicketId = created.TicketId,
                AttachmentUrl = created.AttachmentUrl,
                AttachmentFileName = created.AttachmentFileName,
                AttachmentContentType = created.AttachmentContentType,
                AttachmentFileSize = created.AttachmentFileSize
            };
        }
        //----------------------------------
        //group 
        //---------------------------------------
        public async Task<int> CreateBatchGroupAsync(
    CreateBatchGroupDTO dto
)
        {
            return await _repository.CreateBatchGroupAsync(dto);
        }
        // ============================================================
        // Update conversation status
        // ============================================================

        public Task UpdateStatusAsync(
            int conversationId,
            UpdateConversationStatusDTO dto
        )
        {
            return _repository.UpdateStatusAsync(
                conversationId,
                dto.Status
            );
        }


        // ============================================================
        // Mark messages as read
        // ============================================================

        public Task MarkAsReadAsync(
            int conversationId,
            int userId
        )
        {
            return _repository.MarkMessagesAsReadAsync(
                conversationId,
                userId
            );
        }


        // ============================================================
        // Map list item
        // ============================================================

        private static ConversationListItemDTO MapToListItem(
     NFD_SupportTicket t,
     int? participantUserId,
     int? batchId,
     string? batchName
 )
        {
            var lastMessage =
                t.Messages?
                    .OrderByDescending(
                        m => m.SentDate
                    ).ThenByDescending(m => m.MessageId)
                    .FirstOrDefault();


            /*
             * Important:
             *
             * For a company user, only messages sent by
             * someone else should be counted as unread.
             *
             * This prevents the user's own messages from
             * appearing as unread.
             *
             * For Admin, participantUserId is normally null,
             * therefore all unread messages are counted.
             */

            var unreadCount =
                t.Messages?
                    .Count(
                        m =>
                            m.Status !=
                                NFD_MessageStatus.Read
                            &&
                            (
                                !participantUserId.HasValue
                                ||
                                m.SenderId !=
                                    participantUserId.Value
                            )
                    )
                    ?? 0;


            return new ConversationListItemDTO
            {
                ConversationId =
                    t.TicketId,
                BatchId =
    batchId,
                BatchName = batchName,

                Type =
                    t.Type,

                Category =
                    t.Category,

                Subject =
                    t.Subject,

                Status =
                    t.Status,

                LastMessagePreview =
                    lastMessage?.Content ??
                    t.Message,

                LastMessageDate =
                    lastMessage?.SentDate ??
                    t.CreatedAt,

                UnreadCount =
                    unreadCount,

                StartedByName =
                    t.User?.FullName
            };
        }


        // ============================================================
        // Map details
        // ============================================================

        private static ConversationDetailDTO MapToDetail(
           NFD_SupportTicket t, int? batchId

        )
        {
            var listItem =
     MapToListItem(
         t,
         null,
         batchId,
         null
     );

            return new ConversationDetailDTO
            {
                ConversationId =
                    listItem.ConversationId,

                BatchId =
                    listItem.BatchId,

                Type =
                    listItem.Type,

                Category =
                    listItem.Category,

                Subject =
                    listItem.Subject,

                Status =
                    listItem.Status,

                LastMessagePreview =
                    listItem.LastMessagePreview,

                LastMessageDate =
                    listItem.LastMessageDate,

                UnreadCount =
                    listItem.UnreadCount,

                StartedByName =
                    listItem.StartedByName,

                Messages =
                    t.Messages?

                        .OrderBy(
                            m => m.SentDate
                        ).ThenBy(m => m.MessageId)

                        .Select(
                            m =>
                                new ConversationMessageDTO
                                {
                                    MessageId =
                                        m.MessageId,

                                    Content =
                                        m.Content,

                                    SentDate =
                                        m.SentDate,

                                    Status =
                                        m.Status,

                                    SenderId =
                                        m.SenderId,

                                    SenderName =
                                        m.Sender?.FullName,

                                    ReceiverId =
                                        m.ReceiverId,

                                    TicketId =
                                        m.TicketId,

                                    AttachmentUrl =
                                        m.AttachmentUrl,

                                    AttachmentFileName =
                                        m.AttachmentFileName,

                                    AttachmentContentType =
                                        m.AttachmentContentType,

                                    AttachmentFileSize =
                                        m.AttachmentFileSize
                                }
                        )

                        .ToList()

                    ??
                    new List<ConversationMessageDTO>()
            };
        }
    }
}