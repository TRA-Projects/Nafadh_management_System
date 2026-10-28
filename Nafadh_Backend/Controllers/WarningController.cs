using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Services;
using static Nafadh_Backend.Services.WarningService;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WarningController : ControllerBase
    {
        private readonly IWarningService _service;
        private readonly INotificationService _notificationService;
        private readonly IEmailService _emailService;
        private readonly Nafadhcontext _context;

        public WarningController(
            IWarningService service,
            INotificationService notificationService,
            IEmailService emailService,
            Nafadhcontext context)
        {
            _service = service;
            _notificationService = notificationService;
            _emailService = emailService;
            _context = context;
        }

        // GET: api/Warning?scope=&companyId=&enrollmentId=&status=&level=
        [HttpGet]
        public async Task<ActionResult<IEnumerable<WarningOutputDTO>>> GetWarnings(
            [FromQuery] NFD_WarningScope? scope,
            [FromQuery] int? companyId,
            [FromQuery] int? enrollmentId,
            [FromQuery] NFD_WarningStatus? status,
            [FromQuery] NFD_WarningLevel? level)
        {
            var warnings = await _service
                .GetWarningsAsync(scope, companyId, enrollmentId, status, level);

            return Ok(warnings);
        }

        // GET: api/Warning/enrollment/{enrollmentId}
        [HttpGet("enrollment/{enrollmentId}")]
        public async Task<ActionResult<IEnumerable<WarningOutputDTO>>> GetWarningsByEnrollment(
            int enrollmentId)
        {
            var warnings = await _service
                .GetWarningsByEnrollmentAsync(enrollmentId);

            return Ok(warnings);
        }

        // GET: api/Warning/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<WarningDetailsDTO>> GetWarningById(int id)
        {
            var warning = await _service
                .GetWarningByIdAsync(id);

            if (warning == null)
                return NotFound("Warning not found");

            return Ok(warning);
        }

        // POST: api/Warning
        // إنشاء إنذار جديد + إرسال إشعار داخل المنصة + إرسال إيميل رسمي للشركة
        [HttpPost]
        public async Task<IActionResult> CreateWarning(
            [FromBody] WarningInputDTO dto)
        {
            // التأكد من صحة معرف المستخدم الرافع للإنذار لتفادي خطأ Foreign Key
            bool raiserExists = dto.RaisedByUserId > 0 &&
                await _context.NFD_Users.AnyAsync(u => u.UserId == dto.RaisedByUserId);

            if (!raiserExists)
            {
                dto.RaisedByUserId = await _context.NFD_Users
                    .OrderBy(u => u.RoleId == 1 ? 0 : 1)
                    .Select(u => u.UserId)
                    .FirstOrDefaultAsync();
            }

            await _service.CreateWarningAsync(dto);

            bool notificationSent = false;
            bool emailSent = false;
            string? targetEmail = null;
            string? emailError = null;
            // إذا كان الإنذار موجهاً لشركة (Scope == Company)
            if (dto.Scope == NFD_WarningScope.Company && dto.CompanyId.HasValue)
            {
                var company = await _context.Set<NFD_Company>()
                    .Include(c => c.User)
                    .FirstOrDefaultAsync(c => c.CompanyId == dto.CompanyId.Value);

                if (company != null)
                {
                    string levelLabel = MapLevelToArabic(dto.Level.ToString());
                    string typeLabel = MapTypeToArabic(dto.Type.ToString());

                    string detailsText = string.IsNullOrWhiteSpace(dto.Evidence)
                        ? $"نوع المخالفة: {typeLabel}"
                        : $"نوع المخالفة: {typeLabel} — التفاصيل: {dto.Evidence.Trim()}";

                    // اختيار الإيميل الحقيقي غير المنتهي بـ .test (إيميل الشركة أولاً ثم حساب المستخدم)
                    string? validEmail = PickValidEmail(company.Email, company.User?.Email);

                    int? companyUserId = company.UserId;
                    if (!companyUserId.HasValue)
                    {
                        string? lookupEmail = company.User?.Email ?? company.Email;
                        if (!string.IsNullOrWhiteSpace(lookupEmail))
                        {
                            companyUserId = await _context.NFD_Users
                                .Where(u => u.Email == lookupEmail)
                                .Select(u => (int?)u.UserId)
                                .FirstOrDefaultAsync();
                        }
                    }

                    // 1) إرسال إشعار داخل بوابة الشركة (الجرس)
                    if (companyUserId.HasValue)
                    {
                        try
                        {
                            await _notificationService.CreateAsync(new CreateNotificationDTO
                            {
                                UserId = companyUserId.Value,
                                Title = $"تنبيه إداري: {levelLabel}",
                                Message = detailsText,
                                RelatedEntity = "Warning"
                            });
                            notificationSent = true;
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Failed to create company warning notification: {ex.Message}");
                        }
                    }

                    targetEmail = validEmail;

                    // 2) إرسال بريد إلكتروني رسمي للشركة إذا كان لديها إيميل حقيقي
                    if (!string.IsNullOrWhiteSpace(validEmail))
                    {
                        try
                        {
                            await _emailService.SendCompanyWarningAsync(
                                validEmail,
                                company.CompanyName,
                                detailsText,
                                levelLabel
                            );
                            emailSent = true;
                        }
                        catch (Exception ex)
                        {
                            emailError = ex.Message;
                            Console.WriteLine($"Failed to send company warning email: {ex.Message}");
                        }
                    }
                }
            }

            return Ok(new
            {
                message = "Warning created successfully",
                notificationSent,
                emailSent,
                targetEmail,
                emailError
            });
        }

        // PUT: api/Warning/{id}/status
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateWarningStatus(
            int id,
            [FromBody] WarningStatusInputDTO dto)
        {
            await _service
                .UpdateWarningStatusAsync(id, dto);

            return Ok(new
            {
                message = "Warning status updated successfully"
            });
        }

        // PUT: api/Warning/{id}/resolve
        [HttpPut("{id}/resolve")]
        public async Task<IActionResult> ResolveWarning(
            int id,
            [FromBody] WarningResolveInputDTO dto)
        {
            await _service
                .ResolveWarningAsync(id, dto);

            return Ok(new
            {
                message = "Warning resolved successfully"
            });
        }

        // GET: api/Warning/pending
        [HttpGet("pending")]
        public async Task<ActionResult<IEnumerable<WarningOutputDTO>>> GetPendingWarnings()
        {
            var warnings = await _service
                .GetPendingWarningsAsync();

            return Ok(warnings);
        }

        // GET: api/Warning/level/{level}
        [HttpGet("level/{level}")]
        public async Task<ActionResult<IEnumerable<WarningOutputDTO>>> GetWarningsByLevel(
            NFD_WarningLevel level)
        {
            var warnings = await _service
                .GetWarningsByLevelAsync(level);

            return Ok(warnings);
        }

        [HttpPut("{id}/reply")]
        public async Task<IActionResult> ReplyToCompanyWarning(
            int id,
            [FromQuery] int companyId,
            [FromBody] CompanyWarningReplyDTO dto)
        {
            await _service.ReplyToCompanyWarningAsync(
                id,
                companyId,
                dto.Reply);

            return Ok(new
            {
                message = "Company reply saved successfully"
            });
        }

        private static string? PickValidEmail(params string?[] candidates)
        {
            foreach (var raw in candidates)
            {
                if (string.IsNullOrWhiteSpace(raw))
                    continue;

                var cleaned = new string(raw
                    .Where(c => !char.IsWhiteSpace(c) &&
                                char.GetUnicodeCategory(c) != UnicodeCategory.Format)
                    .ToArray());

                if (!string.IsNullOrWhiteSpace(cleaned) &&
                    cleaned.Contains('@') &&
                    !cleaned.EndsWith(".test", StringComparison.OrdinalIgnoreCase))
                {
                    return cleaned;
                }
            }

            return null;
        }

        private static string MapLevelToArabic(string level)
        {
            return level.ToLowerInvariant() switch
            {
                "low" => "تنبيه أولي (مستوى منخفض)",
                "medium" => "إنذار إداري (مستوى متوسط)",
                "high" => "إنذار شديد (مستوى مرتفع)",
                "critical" or "urgent" => "إنذار عاجل ونهائي",
                "first" => "الإنذار الأول",
                "second" => "الإنذار الثاني",
                "third" or "final" => "الإنذار النهائي",
                _ => $"إنذار إداري ({level})"
            };
        }

        private static string MapTypeToArabic(string type)
        {
            return type.ToLowerInvariant() switch
            {
                "attendance" or "absence" => "مخالفة متابعة الحضور والالتزام",
                "performance" or "quality" => "ملاحظات على جودة التدريب والأداء",
                "behavior" or "conduct" => "مخالفة سلوكية أو مهنية",
                "compliance" or "policy" => "عدم الالتزام بلوائح وسياسات المنصة",
                _ => type
            };
        }
    }
}