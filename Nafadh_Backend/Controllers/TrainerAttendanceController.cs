
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TrainerAttendanceController : ControllerBase
    {
        private readonly ITrainerAttendanceService _service;

        public TrainerAttendanceController(ITrainerAttendanceService service)
        {
            _service = service;
        }

        // Get all trainers assigned to a company.
        [Authorize(Roles = "CompanySupervisor")]
        [HttpGet("company/{companyId:int}/trainers")]
        public async Task<IActionResult> GetCompanyTrainers(int companyId, [FromQuery] DateTime? date)
        {
            if (!TryCompanyId(out var authorizedCompany) || authorizedCompany != companyId) return Forbid();
            var attendanceDate = date?.Date ?? TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow, GetOmanTimeZone()).Date;
            var items = await _service.GetCompanyTrainersAsync(companyId, attendanceDate);
            return Ok(items);
        }

        // Get attendance records within a date range.
        // Example:
        // GET api/TrainerAttendance/company/3?from=2026-10-01&to=2026-10-07
        [Authorize(Roles = "CompanySupervisor")]
        [HttpGet("company/{companyId:int}")]
        public async Task<IActionResult> GetRange(
            int companyId,
            [FromQuery] DateTime from,
            [FromQuery] DateTime to,
            [FromQuery] int? trainerId)
        {
            if (!TryCompanyId(out var authorizedCompany) || authorizedCompany != companyId) return Forbid();
            try
            {
                var items = await _service.GetRangeAsync(
                    companyId,
                    from,
                    to,
                    trainerId
                );

                return Ok(items);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Create or update daily attendance.
        [Authorize(Roles = "CompanySupervisor")]
        [HttpPut]
        public async Task<IActionResult> Upsert(
            [FromBody] TrainerAttendanceUpsertDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (!TryCompanyId(out var authorizedCompany) || authorizedCompany != dto.CompanyId) return Forbid();

            try
            {
                var saved = await _service.UpsertAsync(dto);
                return Ok(saved);
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

        // Upload attendance proof.
        [Authorize(Roles = "Trainer")]
        [HttpPost("{id:int}/proof")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(6 * 1024 * 1024)]
        public async Task<IActionResult> UploadProof(
            int id,
            [FromForm] TrainerAttendanceProofUploadDto dto)
        {
            try
            {
                if (!int.TryParse(
                        User.FindFirstValue(ClaimTypes.NameIdentifier),
                        out var userId) || userId <= 0)
                {
                    return Forbid();
                }

                var trainerId = await _service.GetTrainerIdByUserIdAsync(userId);

                if (!trainerId.HasValue)
                {
                    return Forbid();
                }

                if (!await _service.TrainerOwnsAttendanceAsync(id, trainerId.Value))
                {
                    return NotFound();
                }
                var url = await _service.UploadProofAsync(
                    id,
                    dto.File
                );

                if (url == null)
                {
                    return NotFound(new
                    {
                        message = "Attendance record not found."
                    });
                }

                return Ok(new
                {
                    excuseProofUrl = url
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (IOException ex)
            {
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new { message = ex.Message }
                );
            }
        }

        // Remove attendance proof.
        [Authorize(Roles = "Trainer")]
        [HttpDelete("{id:int}/proof")]
        public async Task<IActionResult> RemoveProof(int id)
        {
            try
            {
                if (!TryTrainerId(out var trainerId)) return Forbid();
                if (!await _service.TrainerOwnsAttendanceAsync(id, trainerId)) return NotFound();
                var found = await _service.RemoveProofAsync(id);

                if (!found)
                {
                    return NotFound(new
                    {
                        message = "Attendance record not found."
                    });
                }

                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        private static TimeZoneInfo GetOmanTimeZone()
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Muscat"); }
            catch (TimeZoneNotFoundException) { return TimeZoneInfo.FindSystemTimeZoneById("Arabian Standard Time"); }
        }

        // Claim names must match authenticated JWT issuance. Missing claims always deny access.
        private bool TryTrainerId(out int id) => int.TryParse(
            User.FindFirst("trainerId")?.Value ?? User.FindFirst("TrainerId")?.Value, out id) && id > 0;
        private bool TryCompanyId(out int id) => int.TryParse(
            User.FindFirst("companyId")?.Value ?? User.FindFirst("CompanyId")?.Value, out id) && id > 0;
        [Authorize(Roles = "Trainer")]
        [HttpPut("{id:int}/excuse")]
        public async Task<IActionResult> SubmitExcuse(
            int id,
            [FromBody] TrainerAttendanceExcuseSubmissionDto dto)
        {
            if (!int.TryParse(
                User.FindFirstValue(ClaimTypes.NameIdentifier),
                out var userId))
            {
                return Forbid();
            }

            var trainerId = await _service.GetTrainerIdByUserIdAsync(userId);

            if (!trainerId.HasValue)
                return Forbid();

            try
            {
                var result = await _service.SubmitExcuseAsync(
                    id,
                    trainerId.Value,
                    dto.Reason
                );

                return result == null ? NotFound() : Ok(result);
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

        [Authorize(Roles = "CompanySupervisor")]
        [HttpPut("{id:int}/excuse-review")]
        public async Task<IActionResult> ReviewExcuse(int id, [FromBody] TrainerAttendanceReviewDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            // Company identity comes from verified authentication, not a client-supplied companyId.
            if (!TryCompanyId(out var companyId)) return Forbid();
            var reviewerClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (!int.TryParse(reviewerClaim, out var reviewerUserId) || reviewerUserId <= 0) return Forbid();
            try
            {
                var result = await _service.ReviewExcuseAsync(id, companyId, dto.Decision, reviewerUserId);
                return result == null ? NotFound() : Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        }

        // Confirm daily attendance for all company trainers.
        [Authorize(Roles = "CompanySupervisor")]
        [HttpPost("confirm")]
        public async Task<IActionResult> ConfirmDay(
            [FromBody] TrainerAttendanceConfirmDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (!TryCompanyId(out var authorizedCompany) || authorizedCompany != dto.CompanyId) return Forbid();

            try
            {
                var count = await _service.ConfirmDayAsync(dto);

                return Ok(new
                {
                    confirmedRecords = count
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [Authorize(Roles = "Trainer")]
        [HttpGet("{id:int}/excuse-window")]
        public async Task<IActionResult> IsExcuseWindowOpen(int id)
        {
            if (!int.TryParse(
                User.FindFirstValue(ClaimTypes.NameIdentifier),
                out var userId))
            {
                return Forbid();
            }

            var trainerId = await _service.GetTrainerIdByUserIdAsync(userId);

            if (!trainerId.HasValue)
                return Forbid();

            var isOpen = await _service.IsExcuseWindowOpenAsync(
                id,
                trainerId.Value
            );

            return Ok(new
            {
                isOpen
            });
        }
        [Authorize(Roles = "Trainer")]
        [HttpGet("my")]
        public async Task<IActionResult> GetMyAttendance()
        {
            if (!int.TryParse(
                User.FindFirstValue(ClaimTypes.NameIdentifier),
                out var userId))
            {
                return Forbid();
            }

            var trainerId = await _service.GetTrainerIdByUserIdAsync(userId);

            if (!trainerId.HasValue)
                return Forbid();

            var items = await _service.GetMyAttendanceAsync(trainerId.Value);

            return Ok(items);
        }
    }
}
