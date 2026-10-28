using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnnouncementController : ControllerBase
    {
        private readonly IAnnouncementService _service;
        private readonly INotificationService _notificationService;
        private readonly IEmailService _emailService;
        private readonly Nafadhcontext _context;

        public AnnouncementController(
            IAnnouncementService service,
            INotificationService notificationService,
            IEmailService emailService,
            Nafadhcontext context)
        {
            _service = service;
            _notificationService = notificationService;
            _emailService = emailService;
            _context = context;
        }

        // جلب جميع الإعلانات بجميع فئاتها لعرضها في مركز الإشعارات للأدمن
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var list = await _context.Set<NFD_Announcement>()
                .OrderByDescending(a => a.Date)
                .ToListAsync();

            var result = list.Select(a =>
            {
                string rawMsg = a.Message ?? string.Empty;
                string title = "إعلان نظامي";
                string body = rawMsg;

                int newLineIdx = rawMsg.IndexOf('\n');
                if (newLineIdx > 0)
                {
                    title = rawMsg.Substring(0, newLineIdx).Trim();
                    body = rawMsg.Substring(newLineIdx + 1).Trim();
                }
                else if (!string.IsNullOrWhiteSpace(rawMsg))
                {
                    title = rawMsg.Length > 50 ? rawMsg.Substring(0, 50) + "..." : rawMsg;
                }

                string targetScope = a.ScopeType switch
                {
                    NFD_AnnouncementScopeType.Company => "companies",
                    NFD_AnnouncementScopeType.Trainer => "trainers",
                    NFD_AnnouncementScopeType.Trainee => "trainees",
                    _ => "all"
                };

                return new AnnouncementDTO
                {
                    AnnouncementId = a.AnnouncementId,
                    ScopeType = a.ScopeType,
                    ScopeId = a.ScopeId,
                    Title = title,
                    Message = body,
                    TargetScope = targetScope,
                    Date = a.Date,
                    CreatedByUserId = a.CreatedByUserId
                };
            }).ToList();

            return Ok(result);
        }

        [HttpGet("scope/{scopeType}/{scopeId?}")]
        public async Task<IActionResult> GetByScope(
            NFD_AnnouncementScopeType scopeType,
            int? scopeId)
        {
            var result = await _service.GetByScopeAsync(scopeType, scopeId);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            return Ok(result);
        }

        // نشر الإعلان + إرسال إشعار داخل المنصة + إرسال إيميل للفئة أو الأشخاص المحددين
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateAnnouncementDTO dto)
        {
            // 1. تحديد الفئة بدقة بناءً على اختيار الواجهة (TargetScope أو ScopeType)
            NFD_AnnouncementScopeType resolvedScope = dto.ScopeType;
            if (!string.IsNullOrWhiteSpace(dto.TargetScope))
            {
                resolvedScope = dto.TargetScope.Trim().ToLowerInvariant() switch
                {
                    "companies" => NFD_AnnouncementScopeType.Company,
                    "trainers" => NFD_AnnouncementScopeType.Trainer,
                    "trainees" => NFD_AnnouncementScopeType.Trainee,
                    "admins" => NFD_AnnouncementScopeType.Admin,
                    "all" => NFD_AnnouncementScopeType.Platform,
                    _ => dto.ScopeType
                };
            }

            string cleanTitle = !string.IsNullOrWhiteSpace(dto.Title)
                ? dto.Title.Trim()
                : "إعلان جديد - نظام نفاذ";

            string cleanMessage = dto.Message.Trim();

            // التأكد من صحة رقم المستخدم المنشئ للإعلان لتفادي خطأ Foreign Key
            int creatorId = dto.CreatedByUserId;
            bool userExists = creatorId > 0 && await _context.NFD_Users.AnyAsync(u => u.UserId == creatorId);
            if (!userExists)
            {
                creatorId = await _context.NFD_Users
                    .OrderBy(u => u.RoleId == 1 ? 0 : 1)
                    .Select(u => u.UserId)
                    .FirstOrDefaultAsync();
            }

            // تحديد ScopeId لو كان المستهدف عنصراً واحداً فقط
            int? singleScopeId = dto.ScopeId;
            if (!singleScopeId.HasValue)
            {
                if (resolvedScope == NFD_AnnouncementScopeType.Company && dto.CompanyIds?.Count == 1)
                    singleScopeId = dto.CompanyIds[0];
                else if (resolvedScope == NFD_AnnouncementScopeType.Trainee && dto.TraineeIds?.Count == 1)
                    singleScopeId = dto.TraineeIds[0];
                else if (resolvedScope == NFD_AnnouncementScopeType.Trainer && dto.TrainerIds?.Count == 1)
                    singleScopeId = dto.TrainerIds[0];
            }

            // حفظ الإعلان في قاعدة البيانات (العنوان + الرسالة)
            await _service.CreateAsync(new CreateAnnouncementDTO
            {
                ScopeType = resolvedScope,
                ScopeId = singleScopeId,
                Message = $"{cleanTitle}\n{cleanMessage}",
                CreatedByUserId = creatorId
            });

            // 2. تجهيز قائمة المستلمين حسب الفئة المختارة والأشخاص المحددين
            var recipients = new List<(int? UserId, string? Email, string Name)>();

            switch (resolvedScope)
            {
                // الجميع (كامل المنظومة)
                case NFD_AnnouncementScopeType.Platform:
                    {
                        var users = await _context.NFD_Users.ToListAsync();
                        foreach (var u in users)
                        {
                            recipients.Add((u.UserId, u.Email, u.FullName ?? "المستخدم"));
                        }
                        break;
                    }

                // الإداريون / الأدمن
                case NFD_AnnouncementScopeType.Admin:
                    {
                        var admins = await _context.NFD_Users
                            .Where(u => u.RoleId == 1)
                            .ToListAsync();

                        foreach (var a in admins)
                        {
                            recipients.Add((a.UserId, a.Email, a.FullName ?? "المسؤول"));
                        }
                        break;
                    }

                // المتدربون (الكل أو متدربون محددون بالاسم)
                case NFD_AnnouncementScopeType.Trainee:
                    {
                        var ids = new HashSet<int>(dto.TraineeIds ?? new List<int>());
                        if (dto.ScopeId.HasValue && dto.ScopeId.Value > 0)
                            ids.Add(dto.ScopeId.Value);

                        var query = _context.Set<NFD_Trainee>()
                            .Include(t => t.User)
                            .AsQueryable();

                        if (ids.Count > 0)
                        {
                            query = query.Where(t => ids.Contains(t.TraineeId) || ids.Contains(t.UserId));
                        }

                        var trainees = await query.ToListAsync();
                        foreach (var t in trainees)
                        {
                            if (t.User != null)
                            {
                                recipients.Add((t.User.UserId, t.User.Email, t.User.FullName ?? "المتدرب"));
                            }
                        }
                        break;
                    }

                // المدربون (الكل أو مدربون محددون بالاسم)
                case NFD_AnnouncementScopeType.Trainer:
                    {
                        var ids = new HashSet<int>(dto.TrainerIds ?? new List<int>());
                        if (dto.ScopeId.HasValue && dto.ScopeId.Value > 0)
                            ids.Add(dto.ScopeId.Value);

                        var query = _context.Set<NFD_Trainer>()
                            .Include(tr => tr.User)
                            .AsQueryable();

                        if (ids.Count > 0)
                        {
                            query = query.Where(tr => ids.Contains(tr.TrainerId) || ids.Contains(tr.UserId));
                        }

                        var trainers = await query.ToListAsync();
                        foreach (var tr in trainers)
                        {
                            if (tr.User != null)
                            {
                                recipients.Add((tr.User.UserId, tr.User.Email, tr.User.FullName ?? "المدرب"));
                            }
                        }
                        break;
                    }

                // الشركات (الكل أو شركات محددة)
                case NFD_AnnouncementScopeType.Company:
                    {
                        var ids = new HashSet<int>(dto.CompanyIds ?? new List<int>());
                        if (dto.ScopeId.HasValue && dto.ScopeId.Value > 0)
                            ids.Add(dto.ScopeId.Value);

                        var query = _context.Set<NFD_Company>()
                            .Include(c => c.User)
                            .AsQueryable();

                        if (ids.Count > 0)
                        {
                            query = query.Where(c => ids.Contains(c.CompanyId) || (c.UserId.HasValue && ids.Contains(c.UserId.Value)));
                        }

                        var companies = await query.ToListAsync();
                        foreach (var c in companies)
                        {
                            string? companyEmail = !string.IsNullOrWhiteSpace(c.User?.Email)
                                ? c.User.Email
                                : c.Email;

                            int? companyUserId = c.UserId;
                            if (!companyUserId.HasValue && !string.IsNullOrWhiteSpace(companyEmail))
                            {
                                companyUserId = await _context.NFD_Users
                                    .Where(u => u.Email == companyEmail)
                                    .Select(u => (int?)u.UserId)
                                    .FirstOrDefaultAsync();
                            }

                            string companyName = !string.IsNullOrWhiteSpace(c.CompanyName)
                                ? c.CompanyName
                                : (c.User?.FullName ?? "الشركة");

                            recipients.Add((companyUserId, companyEmail, companyName));
                        }
                        break;
                    }

                // دفعة تدريبية محددة (Batch)
                case NFD_AnnouncementScopeType.Batch:
                    {
                        var enrollmentQuery = _context.NFD_Enrollments.AsQueryable();
                        if (dto.ScopeId.HasValue && dto.ScopeId.Value > 0)
                        {
                            enrollmentQuery = enrollmentQuery.Where(e => e.BatchId == dto.ScopeId.Value);
                        }

                        var batchTraineeIds = await enrollmentQuery
                            .Select(e => e.TraineeId)
                            .Distinct()
                            .ToListAsync();

                        var trainees = await _context.Set<NFD_Trainee>()
                            .Include(t => t.User)
                            .Where(t => batchTraineeIds.Contains(t.TraineeId))
                            .ToListAsync();

                        foreach (var t in trainees)
                        {
                            if (t.User != null)
                            {
                                recipients.Add((t.User.UserId, t.User.Email, t.User.FullName ?? "المتدرب"));
                            }
                        }
                        break;
                    }
            }

            bool sendInApp = dto.Channels?.InApp ?? true;
            bool sendEmail = dto.Channels?.Email ?? true;

            // 3. إرسال إشعار داخل المنصة (في الجرس لكل مستخدم مستهدف)
            int notificationsCreated = 0;
            if (sendInApp)
            {
                var notifiedUserIds = new HashSet<int>();
                foreach (var r in recipients)
                {
                    if (r.UserId.HasValue && notifiedUserIds.Add(r.UserId.Value))
                    {
                        try
                        {
                            await _notificationService.CreateAsync(new CreateNotificationDTO
                            {
                                UserId = r.UserId.Value,
                                Title = cleanTitle,
                                Message = cleanMessage,
                                RelatedEntity = "Announcement"
                            });
                            notificationsCreated++;
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Failed to create notification for user {r.UserId}: {ex.Message}");
                        }
                    }
                }
            }

            // 4. إرسال البريد الإلكتروني (مع تخطي الإيميلات الوهمية .test)
            int emailsSent = 0;
            if (sendEmail)
            {
                var emailedAddresses = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var r in recipients)
                {
                    if (string.IsNullOrWhiteSpace(r.Email))
                        continue;

                    string cleanEmail = new string(r.Email
                        .Where(c => !char.IsWhiteSpace(c) &&
                                    char.GetUnicodeCategory(c) != UnicodeCategory.Format)
                        .ToArray());

                    if (string.IsNullOrWhiteSpace(cleanEmail) ||
                        cleanEmail.EndsWith(".test", StringComparison.OrdinalIgnoreCase))
                        continue;

                    if (!emailedAddresses.Add(cleanEmail))
                        continue;

                    try
                    {
                        await _emailService.SendAnnouncementAsync(
                            cleanEmail,
                            r.Name,
                            cleanTitle,
                            cleanMessage
                        );
                        emailsSent++;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Failed to send announcement email to {cleanEmail}: {ex.Message}");
                    }
                }
            }

            return Ok(new
            {
                message = "تم نشر الإعلان وتوزيع الإشعارات بنجاح.",
                notificationsCreated,
                emailsSent
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateAnnouncementDTO dto)
        {
            await _service.UpdateAsync(id, dto);
            return Ok("Announcement updated successfully.");
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _service.DeleteAsync(id);
            return Ok("Announcement deleted successfully.");
        }
    }
}