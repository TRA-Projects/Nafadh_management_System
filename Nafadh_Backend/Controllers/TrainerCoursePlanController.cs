using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    /// <summary>
    /// Trainer-side execution endpoint for Company Portal course plans.
    /// The trainer can start an Authority-approved plan only when assigned to one of its stages/items.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Trainer")]
    public sealed class TrainerCoursePlanController : ControllerBase
    {
        private readonly ICoursePlanExecutionService _service;
        private readonly CoursePlanReader _reader;
        private readonly Nafadhcontext _context;

        public TrainerCoursePlanController(
            ICoursePlanExecutionService service,
            CoursePlanReader reader,
            Nafadhcontext context)
        {
            _service = service;
            _reader = reader;
            _context = context;
        }
        // GET: api/TrainerCoursePlan
        [HttpGet]
        public async Task<ActionResult<List<CoursePlanSummaryDTO>>> GetMyPlans()
        {
            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
                return Unauthorized();

            var plans = await _reader.ListQuery()
                .Where(p =>
                    p.ApprovalStatus == Nafadh_Backend.Enums.NFD_CoursePlanApprovalStatus.Approved &&
                    (
                        p.Trainers.Any(pt => pt.Trainer.UserId == userId) ||
                        p.Stages.Any(s =>
                            (s.Trainer != null && s.Trainer.UserId == userId) ||
                            s.Trainers.Any(st => st.Trainer.UserId == userId) ||
                            s.Items.Any(i =>
                                i.Trainer != null && i.Trainer.UserId == userId))
                    ))
                .ToListAsync();

            var result = plans
                .Select(p => CoursePlanReader.ToSummary(p, DateTime.Today))
                .ToList();

            return Ok(result);
        }
        // GET: api/TrainerCoursePlan/{planId}
        [HttpGet("{planId:int}")]
        public async Task<ActionResult<CoursePlanDetailDTO>> GetMyPlan(int planId)
        {
            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
                return Unauthorized();

            var plan = await _reader.DetailQuery(tracking: false)
                .FirstOrDefaultAsync(p =>
                    p.PlanId == planId &&
                    p.ApprovalStatus == Nafadh_Backend.Enums.NFD_CoursePlanApprovalStatus.Approved &&
                    (
                        p.Trainers.Any(pt => pt.Trainer.UserId == userId) ||
                        p.Stages.Any(s =>
                            (s.Trainer != null && s.Trainer.UserId == userId) ||
                            s.Trainers.Any(st => st.Trainer.UserId == userId) ||
                            s.Items.Any(i => i.Trainer != null && i.Trainer.UserId == userId))
                    ));

            if (plan == null)
                return NotFound(new { message = "Course plan not found." });

            var dto = CoursePlanReader.ToDetail(plan, DateTime.Today);

            var wholePlanAssigned =
                plan.Trainers.Any(pt => pt.Trainer.UserId == userId);

            if (!wholePlanAssigned)
            {
                var allowedStageIds = plan.Stages
                    .Where(s =>
                        (s.Trainer != null && s.Trainer.UserId == userId) ||
                        s.Trainers.Any(st => st.Trainer.UserId == userId) ||
                        s.Items.Any(i => i.Trainer != null && i.Trainer.UserId == userId))
                    .Select(s => s.StageId)
                    .ToHashSet();

                dto.Stages = dto.Stages
                    .Where(s => allowedStageIds.Contains(s.StageId))
                    .ToList();
            }
            var visibleStageIds = dto.Stages
    .Select(s => s.StageId)
    .ToHashSet();

            var visibleItemIds = dto.Stages
                .SelectMany(s => s.Items)
                .Select(i => i.ItemId)
                .ToHashSet();

            dto.Notes = dto.Notes
                .Where(n =>
                    (!n.StageId.HasValue && !n.ItemId.HasValue) ||
                    (n.StageId.HasValue && visibleStageIds.Contains(n.StageId.Value)) ||
                    (n.ItemId.HasValue && visibleItemIds.Contains(n.ItemId.Value)))
                .ToList();
            dto.CanEditStructure = false;
            dto.CanSubmit = false;
            dto.CanWithdraw = false;
            dto.CanDelete = false;

            return Ok(dto);
        }
        // POST: api/TrainerCoursePlan/{planId}/start
        [HttpPost("{planId:int}/start")]
        public async Task<ActionResult<CoursePlanDetailDTO>> Start(
            int planId,
            [FromBody] StartCoursePlanDTO dto)
        {
            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
                return Unauthorized();

            var result = await _service.StartAsync(planId, userId, dto.Note);

            if (!result.Success)
                return StatusCode(
                    result.StatusCode,
                    new { message = result.Message });

            var fresh = _reader.DetailQuery(tracking: false)
                .FirstOrDefault(p => p.PlanId == planId);

            if (fresh == null)
                return NotFound(new { message = "Course plan not found." });

            var planDto = CoursePlanReader.ToDetail(fresh, DateTime.Today);

            var wholePlanAssigned =
                fresh.Trainers.Any(pt => pt.Trainer.UserId == userId);

            if (!wholePlanAssigned)
            {
                var allowedStageIds = fresh.Stages
                    .Where(s =>
                        (s.Trainer != null && s.Trainer.UserId == userId) ||
                        s.Trainers.Any(st => st.Trainer.UserId == userId) ||
                        s.Items.Any(i =>
                            i.Trainer != null && i.Trainer.UserId == userId))
                    .Select(s => s.StageId)
                    .ToHashSet();

                planDto.Stages = planDto.Stages
     .Where(s => allowedStageIds.Contains(s.StageId))
     .ToList();
            }

            var visibleStageIds = planDto.Stages
      .Select(s => s.StageId)
      .ToHashSet();

            var visibleItemIds = planDto.Stages
                .SelectMany(s => s.Items)
                .Select(i => i.ItemId)
                .ToHashSet();

            planDto.Notes = planDto.Notes
                .Where(n =>
                    (!n.StageId.HasValue && !n.ItemId.HasValue) ||
                    (n.StageId.HasValue && visibleStageIds.Contains(n.StageId.Value)) ||
                    (n.ItemId.HasValue && visibleItemIds.Contains(n.ItemId.Value)))
                .ToList();

            planDto.CanEditStructure = false;
            planDto.CanSubmit = false;
            planDto.CanWithdraw = false;
            planDto.CanDelete = false;

            return Ok(planDto);

        }
    }
}