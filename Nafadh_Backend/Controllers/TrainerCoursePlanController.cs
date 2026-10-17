using System.Security.Claims;
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

            return Ok(CoursePlanReader.ToDetail(fresh, DateTime.Today));
        }
    }
}