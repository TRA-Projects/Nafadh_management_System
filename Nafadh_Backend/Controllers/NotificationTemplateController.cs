
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize(Roles = "Admin")]
    public class NotificationTemplateController : ControllerBase
    {
        private readonly INotificationTemplateService _service;
        private readonly IEmailService _emailService;
        private readonly IWebHostEnvironment _environment;

        public NotificationTemplateController(
            INotificationTemplateService service,
            IEmailService emailService,
            IWebHostEnvironment environment)
        {
            _service = service;
            _emailService = emailService;
            _environment = environment;
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
                var templates = await _service.GetAllAsync(
                    portalCode,
                    type);

                return Ok(templates);
            }
            catch (Exception ex)
            {
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = "حدث خطأ أثناء جلب قوالب الإشعارات.",
                        error = ex.Message
                    });
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
                {
                    return NotFound(new
                    {
                        message = "قالب الإشعار غير موجود."
                    });
                }

                return Ok(template);
            }
            catch (Exception ex)
            {
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = "حدث خطأ أثناء جلب قالب الإشعار.",
                        error = ex.Message
                    });
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
                    new
                    {
                        message = "حدث خطأ أثناء إنشاء قالب الإشعار.",
                        error = ex.Message
                    });
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
                {
                    return NotFound(new
                    {
                        message = "قالب الإشعار غير موجود."
                    });
                }

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
                    new
                    {
                        message = "حدث خطأ أثناء تحديث قالب الإشعار.",
                        error = ex.Message
                    });
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
                var result = await _service.UpdateStatusAsync(
                    id,
                    dto.IsActive);

                if (!result)
                {
                    return NotFound(new
                    {
                        message = "قالب الإشعار غير موجود."
                    });
                }

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
                    new
                    {
                        message = "حدث خطأ أثناء تحديث حالة القالب.",
                        error = ex.Message
                    });
            }
        }

        // POST: api/NotificationTemplate/test-email
        // Development only - sends a real test email.
        [HttpPost("test-email")]
        public async Task<IActionResult> TestEmail(
            [FromBody] TestNotificationEmailRequest request)
        {
            if (!_environment.IsDevelopment())
            {
                return NotFound();
            }

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                await _emailService.SendTraineeEnrolledAsync(
                    request.Email,
                    request.TraineeName,
                    request.BatchName,
                    request.ProgramName);

                return Ok(new
                {
                    message = "تم تنفيذ طلب إرسال البريد الإلكتروني بنجاح.",
                    email = request.Email
                });
            }
            catch (Exception ex)
            {
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = "حدث خطأ أثناء إرسال البريد الإلكتروني.",
                        error = ex.Message
                    });
            }
        }
    }

    public class TestNotificationEmailRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string TraineeName { get; set; } = string.Empty;

        [Required]
        public string BatchName { get; set; } = string.Empty;

        [Required]
        public string ProgramName { get; set; } = string.Empty;
    }
}