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

        // Resolve strictly by the actual BatchId, never by company, program title,
        // or the first plan for a reused ProgramId.
        private async Task<(int? PlanId, ActionResult? Error)> ResolveBatchPlanAsync(int batchId)
        {
            var batch = await _context.NFD_Batches.AsNoTracking()
                .Where(b => b.BatchId == batchId)
                .Select(b => new { b.CompanyId, b.ProgramId, b.Status })
                .SingleOrDefaultAsync();
            if (batch is null)
                return (null, NotFound(new { message = "الدفعة غير موجودة." }));
            if (!batch.CompanyId.HasValue || batch.Status == NFD_BatchStatus.Cancelled)
                return (null, Conflict(new { message = "الدفعة غير مسندة حاليًا أو ملغاة." }));

            var plans = await _context.NFD_CoursePlans.AsNoTracking()
                .Where(p => p.BatchId == batchId && p.ProgramId == batch.ProgramId &&
                            p.CompanyId == batch.CompanyId.Value)
                .Select(p => new { p.PlanId, p.ApprovalStatus }).Take(2).ToListAsync();
            if (plans.Count == 0 || plans[0].ApprovalStatus == NFD_CoursePlanApprovalStatus.Draft)
                return (null, NotFound(new { message = "لم تُرسل خطة هذه الدفعة للاعتماد بعد." }));
            if (plans.Count != 1)
                return (null, Conflict(new { message = "توجد عدة خطط للدفعة نفسها؛ يلزم مراجعة قاعدة البيانات." }));
            return (plans[0].PlanId, null);
        }

        // GET: api/CoursePlanApproval/batch/{batchId}/plan
        [HttpGet("batch/{batchId:int}/plan")]
        public async Task<ActionResult<CoursePlanDetailDTO>> GetBatchPlan(int batchId)
        {
            var match = await ResolveBatchPlanAsync(batchId);
            if (match.Error is not null) return match.Error;
            return await GetPlan(match.PlanId!.Value);
        }

        // Link a plan notification directly to its unique Admin batch.
        [HttpGet("{planId:int}/batch")]
        public async Task<IActionResult> GetBatchForPlan(int planId)
        {
            var plan = await _context.NFD_CoursePlans.AsNoTracking()
                .Where(p => p.PlanId == planId && p.ApprovalStatus != NFD_CoursePlanApprovalStatus.Draft)
                .Select(p => new { p.CompanyId, p.ProgramId, p.BatchId })
                .SingleOrDefaultAsync();
            if (plan is null)
                return NotFound(new { message = "الخطة غير موجودة." });
            if (!plan.BatchId.HasValue)
                return Conflict(new { message = "الخطة القديمة ليس لها دفعة مؤكدة. يلزم تصحيح الربط قبل المراجعة." });
            var valid = await _context.NFD_Batches.AsNoTracking().AnyAsync(b =>
                b.BatchId == plan.BatchId.Value && b.ProgramId == plan.ProgramId &&
                b.CompanyId == plan.CompanyId && b.Status != NFD_BatchStatus.Cancelled);
            if (!valid)
                return Conflict(new { message = "تكليف الدفعة لا يطابق الخطة الحالية." });
            return Ok(new { batchId = plan.BatchId.Value });
        }

        // PUT: api/CoursePlanApproval/batch/{batchId}/plans/{planId}/decision
        // This route verifies again at decision time that the reviewed plan belongs
        // to the selected batch; the existing plan-id API remains compatible.
        [HttpPut("batch/{batchId:int}/plans/{planId:int}/decision")]
        public async Task<ActionResult<CoursePlanDetailDTO>> DecideForBatch(
            int batchId, int planId, [FromBody] CoursePlanDecisionDTO dto)
        {
            var match = await ResolveBatchPlanAsync(batchId);
            if (match.Error is not null) return match.Error;
            if (match.PlanId != planId)
                return Conflict(new { message = "الخطة المختارة لا تتبع الدفعة المحددة. لم يُحفظ أي قرار." });
            return await Decide(planId, dto);
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

            if (dto.Decision != CoursePlanDecision.Approve && dto.Decision != CoursePlanDecision.Reject)
                return BadRequest(new { message = "قرار الاعتماد غير صالح." });

            if (dto.Decision == CoursePlanDecision.Reject && note is null)
                return BadRequest(new { message = "سبب الرفض مطلوب." });

            var plan = await _reader.DetailQuery(tracking: true)
                .FirstOrDefaultAsync(p => p.PlanId == planId);

            if (plan is null)
                return NotFound(new { message = "الخطة غير موجودة." });

            // Double-check the exact assignment when applying the decision. Legacy
            // plans with unknown BatchId are deliberately not auto-approved.
            if (!plan.BatchId.HasValue ||
                !await _context.NFD_Batches.AsNoTracking().AnyAsync(b =>
                    b.BatchId == plan.BatchId.Value && b.ProgramId == plan.ProgramId &&
                    b.CompanyId == plan.CompanyId && b.Status != NFD_BatchStatus.Cancelled))
                return Conflict(new { message = "لا يمكن اعتماد الخطة قبل تأكيد الدفعة والشركة والبرنامج المرتبطين بها." });

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

            // Admin owns program publication and company-batch assignment.
            // A plan decision must not publish a program or change eligibility.

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
    