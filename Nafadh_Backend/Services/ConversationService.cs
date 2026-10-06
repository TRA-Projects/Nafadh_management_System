using Nafadh_Backend.DTOs;
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


            return conversations
                .Select(
                    t =>
                        MapToListItem(
                            t,
                            participantUserId
                        )
                )
                .ToList();
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


            return MapToDetail(
                conversation
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
                        dto.StartedByUserId
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


            return MapToDetail(full!);
        }


        // ============================================================
        // Add message
        // ============================================================

        public async Task<ConversationMessageDTO> AddMessageAsync(
            int conversationId,
            AddConversationMessageDTO dto
        )
        {
            var message =
                new NFD_Message
                {
                    Content =
                        dto.Content,

                    SentDate =
                        DateTime.UtcNow,

                    Status =
                        NFD_MessageStatus.Sent,

                    SenderId =
                        dto.SenderId,

                    TicketId =
                        conversationId
                };


            var created =
                await _repository.AddMessageAsync(
                    message
                );


            // Reload the conversation so the Sender navigation
            // property is available.
            var conversation =
                await _repository.GetByIdAsync(
                    conversationId
                );


            var savedMessage =
                conversation?
                    .Messages
                    .FirstOrDefault(
                        m =>
                            m.MessageId ==
                            created.MessageId
                    );


            return new ConversationMessageDTO
            {
                MessageId =
                    created.MessageId,

                Content =
                    created.Content,

                SentDate =
                    created.SentDate,

                Status =
                    created.Status,

                SenderId =
                    created.SenderId,

                SenderName =
                    savedMessage?
                        .Sender?
                        .FullName,

                ReceiverId =
                    created.ReceiverId,

                TicketId =
                    created.TicketId,

                AttachmentUrl =
                    created.AttachmentUrl,

                AttachmentFileName =
                    created.AttachmentFileName,

                AttachmentContentType =
                    created.AttachmentContentType,

                AttachmentFileSize =
                    created.AttachmentFileSize
            };
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
            int? participantUserId
        )
        {
            var lastMessage =
                t.Messages?
                    .OrderByDescending(
                        m => m.SentDate
                    )
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
            NFD_SupportTicket t
        )
        {
            var listItem =
                MapToListItem(
                    t,
                    null
                );


            return new ConversationDetailDTO
            {
                ConversationId =
                    listItem.ConversationId,

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
                        )

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