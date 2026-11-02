
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class NotificationTemplateController : ControllerBase
    {
        private readonly INotificationTemplateService _service;

        public NotificationTemplateController(
            INotificationTemplateService service)
        {
            _service = service;
        }

        // GET: api/NotificationTemplate
        // Optional filters: ?portalCode=Trainee&type=Email
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? portalCode,
            [FromQuery] string? type)
        {
            try
            {
                var templates = await _service.GetAllAsync(portalCode, type);
                return Ok(templates);
            }
            catch (Exception ex)
            {
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new { message = "حدث خطأ أثناء جلب قوالب الإشعارات.", error = ex.Message });
            }
        }

        // GET: api/NotificationTemplate/5
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var template = await _service.GetByIdAsync(id);

                if (template == null)
                    return NotFound(new { message = "قالب الإشعار غير موجود." });

                return Ok(template);
            }
            catch (Exception ex)
            {
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new { message = "حدث خطأ أثناء جلب قالب الإشعار.", error = ex.Message });
            }
        }

        // POST: api/NotificationTemplate
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateNotificationTemplateDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _service.CreateAsync(dto);

                return CreatedAtAction(
                    nameof(GetById),
                    new { id = result.Id },
                    result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new { message = "حدث خطأ أثناء إنشاء قالب الإشعار.", error = ex.Message });
            }
        }

        // PUT: api/NotificationTemplate/5
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(
            int id,
            [FromBody] UpdateNotificationTemplateDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _service.UpdateAsync(id, dto);

                if (result == null)
                    return NotFound(new { message = "قالب الإشعار غير موجود." });

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new { message = "حدث خطأ أثناء تحديث قالب الإشعار.", error = ex.Message });
            }
        }

        // PATCH: api/NotificationTemplate/5/status
        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(
            int id,
            [FromBody] UpdateNotificationTemplateStatusDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _service.UpdateStatusAsync(id, dto.IsActive);

                if (!result)
                    return NotFound(new { message = "قالب الإشعار غير موجود." });

                return Ok(new
                {
                    message = "تم تحديث حالة قالب الإشعار بنجاح.",
                    isActive = dto.IsActive
                });
            }
            catch (Exception ex)
            {
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new { message = "حدث خطأ أثناء تحديث حالة القالب.", error = ex.Message });
            }
        }
    }
}
