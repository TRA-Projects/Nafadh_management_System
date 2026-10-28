using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Services;
using System.Globalization;

namespace Nafadh_Backend.Controllers
{
    /// <summary>
    /// Authority (Admin) side of the course-plan workflow: review and approve/reject the
    /// course plans that host companies submit from the Company Portal.
    ///
    /// API only — the Authority UI is intentionally NOT part of this change; the Authority
    /// team can wire a screen to these endpoints (or use Swagger meanwhile).
    /// A plan can only be decided while it is PendingApproval.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class CoursePlanApprovalController : ControllerBase
    {
        private readonly Nafadhcontext _context;
        private readonly CoursePlanReader _reader;
        private readonly IEmailService _emailService;

        public CoursePlanApprovalController(Nafadhcontext context, IEmailService emailService)
        {
            _context = context;
            _reader = new CoursePlanReader(context);
            _emailService = emailService;
        }

        // GET: api/CoursePlanApproval?status=PendingApproval&companyId=1
        // Defaults to the approval queue (PendingApproval, oldest submission first).
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CoursePlanSummaryDTO>>> GetPlans(
            [FromQuery] NFD_CoursePlanApprovalStatus? status,
            [FromQuery] int? companyId)
        {
            var wanted = status ?? NFD_CoursePlanApprovalStatus.PendingApproval;

            var query = _reader.ListQuery().Where(p => p.ApprovalStatus == wanted);
            if (companyId.HasValue)
                query = query.Where(p => p.CompanyId == companyId.Value);

            var plans = await query.ToListAsync();
            var today = DateTime.Today;

            var result = plans
                .Select(p => CoursePlanReader.ToSummary(p, today))
                .OrderBy(p => p.SubmittedAt ?? p.CreatedAt)
                .ToList();

            return Ok(result);
        }

        // GET: api/CoursePlanApproval/{planId}
        // Full plan (stages, tasks, trainers, notes). Drafts are not visible to the Authority.
        [HttpGet("{planId:int}")]
        public async Task<ActionResult<CoursePlanDetailDTO>> GetPlan(int planId)
        {
            var plan = await _reader.DetailQuery(tracking: false)
                .FirstOrDefaultAsync(p => p.PlanId == planId
                                          && p.ApprovalStatus != NFD_CoursePlanApprovalStatus.Draft);

            if (plan is null)
                return NotFound(new { message = "الخطة غير موجودة." });

            return Ok(CoursePlanReader.ToDetail(plan, DateTime.Today));
        }

        // PUT: api/CoursePlanApproval/{planId}/decision
        // Approve (note optional) or Reject (note required). The company is notified and the
        // note is added to the plan's notes timeline as an Authority note.
        [HttpPut("{planId:int}/decision")]
        public async Task<ActionResult<CoursePlanDetailDTO>> Decide(int planId, [FromBody] CoursePlanDecisionDTO dto)
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (!int.TryParse(userIdValue, out var reviewerId))
                return Unauthorized();

            var note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();

            if (dto.Decision == CoursePlanDecision.Reject && note is null)
                return BadRequest(new { message = "سبب الرفض مطلوب." });

            var plan = await _reader.DetailQuery(tracking: true)
                .FirstOrDefaultAsync(p => p.PlanId == planId);

            if (plan is null)
                return NotFound(new { message = "الخطة غير موجودة." });

            if (plan.ApprovalStatus != NFD_CoursePlanApprovalStatus.PendingApproval)
                return Conflict(new { message = "لا يمكن البت إلا في الخطط التي بانتظار الاعتماد." });

            var now = DateTime.Now;
            var approved = dto.Decision == CoursePlanDecision.Approve;

            plan.ApprovalStatus = approved
                ? NFD_CoursePlanApprovalStatus.Approved
                : NFD_CoursePlanApprovalStatus.Rejected;
            plan.ExecutionStatus = NFD_CoursePlanExecutionStatus.NotStarted;
            plan.ReviewedAt = now;
            plan.ReviewedByUserId = reviewerId;
            plan.ReviewNote = note;
            plan.UpdatedAt = now;

            // A manually-created course becomes a normal company program only after Authority approval.
            // Existing company-program links are left untouched.
            if (approved && plan.ProgramId.HasValue)
            {
                var companyProgramExists = await _context.NFD_CompanyPrograms
                    .AnyAsync(cp => cp.CompanyId == plan.CompanyId && cp.ProgramId == plan.ProgramId.Value);

                if (!companyProgramExists)
                {
                    _context.NFD_CompanyPrograms.Add(new NFD_CompanyProgram
                    {
                        CompanyId = plan.CompanyId,
                        ProgramId = plan.ProgramId.Value
                    });

                    var program = await _context.NFD_Programs
                        .FirstOrDefaultAsync(p => p.ProgramId == plan.ProgramId.Value);

                    // Only programs created by this Company Course Plan flow are promoted from Draft.
                    if (program is not null && program.Status == NFD_ProgramStatus.Draft)
                        program.Status = NFD_ProgramStatus.Published;
                }
            }

            if (note is not null)
            {
                _context.NFD_CoursePlanNotes.Add(new NFD_CoursePlanNote
                {
                    PlanId = plan.PlanId,
                    UserId = reviewerId,
                    Text = note,
                    IsAuthority = true,
                    CreatedAt = now
                });
            }

            var supervisorIds = await _context.NFD_CompanySupervisors
                .AsNoTracking()
                .Where(s => s.CompanyId == plan.CompanyId)
                .Select(s => s.UserId)
                .ToListAsync();

            foreach (var userId in supervisorIds.Append(plan.CreatedByUserId).Distinct())
            {
                _context.NFD_Notifications.Add(new NFD_Notification
                {
                    UserId = userId,
                    Title = approved ? "تم اعتماد خطة الكورس" : "تم رفض خطة الكورس",
                    Message = approved
                        ? $"اعتمدت الهيئة خطة الكورس «{plan.Title}». يمكن للمدرب المكلّف الآن الشروع في تنفيذها في الوقت المناسب له."
                        : $"رفضت الهيئة خطة الكورس «{plan.Title}». راجعوا الملاحظات وعدّلوا الخطة ثم أعيدوا إرسالها.",
                    RelatedEntity = $"CoursePlan:{plan.PlanId}",
                    IsRead = false,
                    CreatedAt = now
                });
            }

            await _context.SaveChangesAsync();

            await SendPlanDecisionEmailAsync(plan.CompanyId, plan.CreatedByUserId, plan.Title, approved, note);

            var fresh = await _reader.DetailQuery(tracking: false)
                .FirstAsync(p => p.PlanId == planId);

            return Ok(CoursePlanReader.ToDetail(fresh, DateTime.Today));
        }

        private async Task SendPlanDecisionEmailAsync(
            int companyId,
            int createdByUserId,
            string planTitle,
            bool approved,
            string? note)
        {
            var company = await _context.NFD_Companies
                .Include(c => c.User)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.CompanyId == companyId);

            if (company is null)
                return;

            var creatorEmail = await _context.NFD_Users
                .AsNoTracking()
                .Where(u => u.UserId == createdByUserId)
                .Select(u => u.Email)
                .FirstOrDefaultAsync();

            string? validEmail = PickValidEmail(company.Email, creatorEmail, company.User?.Email);
            if (string.IsNullOrWhiteSpace(validEmail))
                return;

            try
            {
                await _emailService.SendCoursePlanDecisionAsync(
                    validEmail,
                    company.CompanyName,
                    planTitle,
                    approved,
                    note);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to send course plan decision email: {ex.Message}");
            }
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
    }
}
    