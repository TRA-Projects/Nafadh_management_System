
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/trainer/live-sessions")]
    [Authorize(Roles = "Trainer")]
    public class TrainerLiveSessionsController : ControllerBase
    {
        private readonly TrainerLiveSessionService _service;

        public TrainerLiveSessionsController(
            TrainerLiveSessionService service)
        {
            _service = service;
        }

        private async Task<int?> GetCurrentTrainerIdAsync()
        {
            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
                return null;

            return await _service.GetTrainerIdAsync(userId);
        }

        // GET: api/trainer/live-sessions
        // Supports batch, status, date, search and pagination filters.
        [HttpGet]
        public async Task<IActionResult> GetSessions(
            [FromQuery] TrainerLiveSessionFilterDto filter)
        {
            var trainerId = await GetCurrentTrainerIdAsync();

            if (!trainerId.HasValue)
                return Unauthorized();

            var result = await _service.GetSessionsAsync(
                trainerId.Value, filter);

            return Ok(result);
        }

        // GET: api/trainer/live-sessions/5
        [HttpGet("{sessionId:int}")]
        public async Task<IActionResult> GetById(int sessionId)
        {
            var trainerId = await GetCurrentTrainerIdAsync();

            if (!trainerId.HasValue)
                return Unauthorized();

            var result = await _service.GetByIdAsync(
                trainerId.Value, sessionId);

            if (result == null)
                return NotFound(new
                {
                    message = "Session not found."
                });

            return Ok(result);
        }

        // POST: api/trainer/live-sessions
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateTrainerLiveSessionDto dto)
        {
            var trainerId = await GetCurrentTrainerIdAsync();

            if (!trainerId.HasValue)
                return Unauthorized();

            try
            {
                var result = await _service.CreateAsync(
                    trainerId.Value, dto);

                return CreatedAtAction(
                    nameof(GetById),
                    new { sessionId = result.SessionId },
                    result);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/trainer/live-sessions/5
        [HttpPut("{sessionId:int}")]
        public async Task<IActionResult> Update(
            int sessionId,
            [FromBody] UpdateTrainerLiveSessionDto dto)
        {
            var trainerId = await GetCurrentTrainerIdAsync();

            if (!trainerId.HasValue)
                return Unauthorized();

            try
            {
                var result = await _service.UpdateAsync(
                    trainerId.Value, sessionId, dto);

                return result == null
                    ? NotFound(new { message = "Session not found." })
                    : Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // PUT: api/trainer/live-sessions/5/postpone
        [HttpPut("{sessionId:int}/postpone")]
        public async Task<IActionResult> Postpone(
            int sessionId,
            [FromBody] PostponeTrainerLiveSessionDto dto)
        {
            var trainerId = await GetCurrentTrainerIdAsync();

            if (!trainerId.HasValue)
                return Unauthorized();

            try
            {
                var result = await _service.PostponeAsync(
                    trainerId.Value, sessionId, dto);

                return result == null
                    ? NotFound(new { message = "Session not found." })
                    : Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // PUT: api/trainer/live-sessions/5/status
        [HttpPut("{sessionId:int}/status")]
        public async Task<IActionResult> ChangeStatus(
            int sessionId,
            [FromBody] ChangeTrainerLiveSessionStatusDto dto)
        {
            var trainerId = await GetCurrentTrainerIdAsync();

            if (!trainerId.HasValue)
                return Unauthorized();

            try
            {
                var result = await _service.ChangeStatusAsync(
                    trainerId.Value, sessionId, dto);

                return result == null
                    ? NotFound(new { message = "Session not found." })
                    : Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // PUT: api/trainer/live-sessions/5/summary
        [HttpPut("{sessionId:int}/summary")]
        public async Task<IActionResult> UpdateSummary(
            int sessionId,
            [FromBody] UpdateTrainerLiveSessionSummaryDto dto)
        {
            var trainerId = await GetCurrentTrainerIdAsync();

            if (!trainerId.HasValue)
                return Unauthorized();

            try
            {
                var result = await _service.UpdateSummaryAsync(
                    trainerId.Value, sessionId, dto);

                return result == null
                    ? NotFound(new { message = "Session not found." })
                    : Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // GET: api/trainer/live-sessions/5/attendance
        [HttpGet("{sessionId:int}/attendance")]
        public async Task<IActionResult> GetAttendance(int sessionId)
        {
            var trainerId = await GetCurrentTrainerIdAsync();

            if (!trainerId.HasValue)
                return Unauthorized();

            var result = await _service.GetAttendanceAsync(
                trainerId.Value, sessionId);

            return result == null
                ? NotFound(new { message = "Session not found." })
                : Ok(result);
        }

        // PUT: api/trainer/live-sessions/5/attendance/10
        [HttpPut("{sessionId:int}/attendance/{traineeId:int}")]
        public async Task<IActionResult> UpdateAttendance(
            int sessionId,
            int traineeId,
            [FromBody] UpdateTrainerSessionAttendanceDto dto)
        {
            var trainerId = await GetCurrentTrainerIdAsync();

            if (!trainerId.HasValue)
                return Unauthorized();

            try
            {
                var result = await _service.UpdateAttendanceAsync(
                    trainerId.Value, sessionId, traineeId, dto);

                return result == null
                    ? NotFound(new
                    {
                        message = "Session or attendance record not found."
                    })
                    : Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpPut("{sessionId:int}/recording/visibility")]
        public async Task<IActionResult> UpdateRecordingVisibility(
    int sessionId,
    [FromBody] UpdateTrainerRecordingVisibilityDto dto)
        {
            var trainerId = await GetCurrentTrainerIdAsync();

            if (!trainerId.HasValue)
                return Unauthorized();

            try
            {
                var result = await _service
    .UpdateRecordingVisibilityAsync(
        trainerId.Value,
        sessionId,
        dto);

                if (result == null)
                    return NotFound(new
                    {
                        message = "Session not found."
                    });

                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new
                {
                    message = ex.Message
                });
            }
        }
    }
}
