using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;
using Nafadh_Backend.Services;
using System.Security.Claims;

namespace Nafadh_Backend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ConversationController : ControllerBase
    {
        private readonly IConversationService _service;
        private readonly IConversationRepository _repository;

        public ConversationController(IConversationService service, IConversationRepository repository)
        {
            _service = service;
            _repository = repository;
        }

        private bool TryGetUserId(out int userId) =>
            int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId) && userId > 0;

        // Keep the administrator role consistent with the application's JWT role claim.
        private bool IsAdmin => User.IsInRole("Admin");

        private async Task<bool> CanAccessAsync(NFD_SupportTicket ticket, int userId)
        {
            if (IsAdmin) return true;
            if (ticket.Category == "BatchGroup")
                return await _repository.IsBatchGroupMemberAsync(ticket.TicketId, userId);
            return ticket.UserId == userId ||
                (ticket.Messages?.Any(m => m.SenderId == userId || m.ReceiverId == userId) ?? false);
        }

        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] NFD_ConversationType? type,
            [FromQuery] int? participantUserId,
            [FromQuery] NFD_SupportTicketStatus? status)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();
            if (type.HasValue && !Enum.IsDefined(typeof(NFD_ConversationType), type.Value))
                return BadRequest(new { message = "نوع المحادثة غير صالح." });
            if (status.HasValue && !Enum.IsDefined(typeof(NFD_SupportTicketStatus), status.Value))
                return BadRequest(new { message = "حالة المحادثة غير صالحة." });
            if (!IsAdmin && participantUserId.HasValue && participantUserId != userId) return Forbid();
            var participant = IsAdmin ? participantUserId : userId;
            if (participant.HasValue && participant.Value <= 0)
                return BadRequest(new { message = "معرف المستخدم غير صالح." });
            var items = await _service.GetAsync(type, participant, status);
            if (!IsAdmin)
            {
                // Defense in depth: do not rely on a client filter or repository filtering alone.
                var allowed = new List<ConversationListItemDTO>();
                foreach (var item in items)
                {
                    var ticket = await _repository.GetByIdAsync(item.ConversationId);
                    if (ticket != null && await CanAccessAsync(ticket, userId)) allowed.Add(item);
                }
                items = allowed;
            }
            return Ok(items.OrderByDescending(c => c.LastMessageDate).ThenByDescending(c => c.ConversationId));
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();
            var ticket = await _repository.GetByIdAsync(id);
            if (ticket == null || !await CanAccessAsync(ticket, userId)) return NotFound();
            var detail = await _service.GetByIdAsync(id);
            if (detail == null) return NotFound();
            detail.UnreadCount = detail.Messages.Count(m => m.SenderId != userId && m.Status != NFD_MessageStatus.Read);
            return Ok(detail);
        }

        [HttpPost]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Create([FromForm] CreateConversationDTO dto)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();
            if (!Enum.IsDefined(typeof(NFD_ConversationType), dto.Type))
                return BadRequest(new { message = "نوع المحادثة غير صالح." });
            if (dto.Category?.Trim() == "BatchGroup") return Forbid();
            // Identity is always assigned by the server, including requests from other portals.
            dto.StartedByUserId = userId;
            if (dto.Type == NFD_ConversationType.CompanyThread)
            {
                if (!IsAdmin && !User.IsInRole("CompanySupervisor")) return Forbid();
                // Company tickets are addressed to the authority, never a client-selected user.
                if (!IsAdmin) dto.ReceiverUserId = null;
            }
            dto.Subject = dto.Subject.Trim();
            dto.FirstMessage = dto.FirstMessage.Trim();
            dto.Category = dto.Category?.Trim();
            if (dto.Subject.Length == 0 || dto.FirstMessage.Length == 0)
                return BadRequest(new { message = "عنوان المحادثة ونص الرسالة مطلوبان." });
            if (dto.Attachment != null)
            {
                var extension = Path.GetExtension(dto.Attachment.FileName).ToLowerInvariant();
                if (dto.Attachment.Length <= 0 || dto.Attachment.Length > 10 * 1024 * 1024 ||
                    !new[] { ".pdf", ".png", ".jpg", ".jpeg" }.Contains(extension))
                    return BadRequest(new { message = "المرفق يجب أن يكون PDF أو PNG أو JPG أو JPEG وبحجم لا يتجاوز 10 ميجابايت." });
            }
            var created = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.ConversationId }, created);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("batch-group")]
        public async Task<IActionResult> CreateBatchGroup([FromBody] CreateBatchGroupDTO dto)
        {
            if (!TryGetUserId(out _)) return Unauthorized();
            var conversationId = await _service.CreateBatchGroupAsync(dto);
            return Ok(new { conversationId });
        }

        [HttpPost("{id:int}/messages")]
        public async Task<IActionResult> AddMessage(int id, [FromBody] AddConversationMessageDTO dto)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();
            var ticket = await _repository.GetByIdAsync(id);
            if (ticket == null || !await CanAccessAsync(ticket, userId)) return NotFound();
            dto.SenderId = userId;
            dto.Content = dto.Content.Trim();
            if (dto.Content.Length == 0) return BadRequest(new { message = "نص الرسالة مطلوب." });
            if (ticket.Type == NFD_ConversationType.CompanyThread)
                dto.ReceiverUserId = IsAdmin && ticket.UserId != userId ? ticket.UserId : null;
            else if (ticket.Category == "BatchGroup")
                dto.ReceiverUserId = null;
            else if (dto.ReceiverUserId.HasValue)
            {
                var receiver = dto.ReceiverUserId.Value;
                if (receiver == userId || (receiver != ticket.UserId &&
                    !(ticket.Messages?.Any(m => m.SenderId == receiver || m.ReceiverId == receiver) ?? false)))
                    return BadRequest(new { message = "المستلم ليس طرفًا في المحادثة." });
            }
            try
            {
                var message = await _service.AddMessageAsync(id, dto);
                message.SenderName ??= User.FindFirstValue(ClaimTypes.Name) ?? User.Identity?.Name;
                return Ok(message);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (ArgumentException)
            {
                return BadRequest(new { message = "تعذر إرسال الرسالة. تحقق من النص والطرف الآخر في المحادثة." });
            }
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateConversationStatusDTO dto)
        {
            if (!TryGetUserId(out _)) return Unauthorized();
            if (!Enum.IsDefined(typeof(NFD_SupportTicketStatus), dto.Status))
                return BadRequest(new { message = "حالة المحادثة غير صالحة." });
            if (await _repository.GetByIdAsync(id) == null) return NotFound();
            await _service.UpdateStatusAsync(id, dto);
            return Ok(new { message = "تم تحديث حالة المحادثة." });
        }

        [HttpPut("{id:int}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();
            var ticket = await _repository.GetByIdAsync(id);
            if (ticket == null || !await CanAccessAsync(ticket, userId)) return NotFound();
            await _service.MarkAsReadAsync(id, userId);
            return Ok(new { message = "تم تحديث حالة قراءة الرسائل." });
        }
    }
}
