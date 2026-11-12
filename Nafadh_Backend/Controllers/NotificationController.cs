using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _service;
        private readonly INotificationSummaryService _summaryService;

        public NotificationController(INotificationService service, INotificationSummaryService summaryService)
        {
            _service = service;
            _summaryService = summaryService;
        }

        private bool TryGetCurrentUserId(out int userId)
        {
            return int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);
        }

        // Existing endpoint kept for backward compatibility with existing portals.
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetByUserId(int userId)
        {
            var notifications = await _service.GetByUserIdAsync(userId);
            return Ok(notifications);
        }

        // Secure endpoint for the authenticated user's own notifications.
        [HttpGet("me")]
        public async Task<IActionResult> GetMine()
        {
            if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
            return Ok(await _service.GetByUserIdAsync(userId));
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateNotificationDTO dto)
        {
            await _service.CreateAsync(dto);
            return Ok("Notification created successfully.");
        }

        // Only the owner of the notification can mark it as read.
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
            await _service.MarkAsReadAsync(id, userId);
            return Ok("Notification marked as read.");
        }

        [HttpPut("me/read-all")]
        public async Task<IActionResult> MarkAllMineAsRead()
        {
            if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
            await _service.MarkAllAsReadAsync(userId);
            return Ok("All notifications marked as read.");
        }

        // Existing endpoint kept for backward compatibility.
        [HttpPut("user/{userId}/read-all")]
        public async Task<IActionResult> MarkAllAsRead(int userId)
        {
            await _service.MarkAllAsReadAsync(userId);
            return Ok("All notifications marked as read.");
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            if (!TryGetCurrentUserId(out var userId)) return Unauthorized();

            var role = User.FindFirstValue(ClaimTypes.Role);
            var includeAllConversations = string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase);

            var summary = await _summaryService.GetForUserAsync(userId, includeAllConversations);
            return Ok(summary);
        }

        [HttpGet("user/{userId}/unread-count")]
        public async Task<IActionResult> GetUnreadCount(int userId)
        {
            return Ok(await _service.GetUnreadCountAsync(userId));
        }

        [HttpGet("me/unread-count")]
        public async Task<IActionResult> GetMyUnreadCount()
        {
            if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
            return Ok(await _service.GetUnreadCountAsync(userId));
        }
        [HttpPost("trainer/send")]
        public async Task<IActionResult> SendToBatch(
    [FromBody] SendBatchNotificationDTO dto)
        {
            if (dto.BatchId <= 0 ||
                string.IsNullOrWhiteSpace(dto.Title) ||
                string.IsNullOrWhiteSpace(dto.Message))
            {
                return BadRequest(new
                {
                    message = "يرجى تحديد الدفعة وكتابة عنوان الإشعار ومحتواه."
                });
            }

            var count = await _service.SendToBatchAsync(
                dto.BatchId,
                dto.TraineeId,
                dto.Title,
                dto.Message);

            if (count == 0)
                return BadRequest(new
                {
                    message = "لم يتم العثور على متدربين لإرسال الإشعار."
                });

            return Ok(new
            {
                message = "تم إرسال الإشعارات بنجاح.",
                sentCount = count
            });
        }
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            if (!TryGetCurrentUserId(out var userId))
                return Unauthorized();

            var deleted = await _service.DeleteAsync(id, userId);

            if (!deleted)
                return NotFound(new
                {
                    message = "الإشعار غير موجود."
                });

            return NoContent();
        }
    }


}
