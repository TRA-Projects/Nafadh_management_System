
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
        [HttpGet("company/{companyId:int}/trainers")]
        public async Task<IActionResult> GetCompanyTrainers(int companyId)
        {
            var items = await _service.GetCompanyTrainersAsync(companyId);
            return Ok(items);
        }

        // Get attendance records within a date range.
        // Example:
        // GET api/TrainerAttendance/company/3?from=2026-10-01&to=2026-10-07
        [HttpGet("company/{companyId:int}")]
        public async Task<IActionResult> GetRange(
            int companyId,
            [FromQuery] DateTime from,
            [FromQuery] DateTime to,
            [FromQuery] int? trainerId)
        {
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
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

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
        [Authorize(Roles = "CompanySupervisor")]
        [HttpPost("{id:int}/proof")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(6 * 1024 * 1024)]
        public async Task<IActionResult> UploadProof(
            int id,
            [FromForm] TrainerAttendanceProofUploadDto dto)
        {
            try
            {
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
        [Authorize(Roles = "CompanySupervisor")]
        [HttpDelete("{id:int}/proof")]
        public async Task<IActionResult> RemoveProof(int id)
        {
            try
            {
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

        // Confirm daily attendance for all company trainers.
        [Authorize(Roles = "CompanySupervisor")]
        [HttpPost("confirm")]
        public async Task<IActionResult> ConfirmDay(
            [FromBody] TrainerAttendanceConfirmDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

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
    }
}
