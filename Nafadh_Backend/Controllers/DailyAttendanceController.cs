
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend;
using Nafadh_Backend.Services;
using static Nafadh_Backend.DTOs.DailyAttendanceDto;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DailyAttendanceController : ControllerBase
    {
        private readonly IDailyAttendanceService _service;
        private readonly Nafadhcontext _context;

        public DailyAttendanceController(
            IDailyAttendanceService service,
            Nafadhcontext context)
        {
            _service = service;
            _context = context;
        }

        // GET /api/DailyAttendance/enrollment/{enrollmentId}
        [HttpGet("enrollment/{enrollmentId}")]
        public async Task<IActionResult> GetByEnrollmentId(int enrollmentId)
        {
            List<DailyAttendanceReadDto> result =
                await _service.GetByEnrollmentIdAsync(enrollmentId);

            return Ok(result);
        }


        // GET /api/DailyAttendance/latest-recorded-date
        // Returns the latest date with actual attendance records.
        [HttpGet("latest-recorded-date")]
        public async Task<IActionResult> GetLatestRecordedDate()
        {
            DateTime? latestDailyDate =
                await _context.NFD_DailyAttendances
                    .AsNoTracking()
                    .MaxAsync(a => (DateTime?)a.Date);

            DateTime? latestSessionDate =
                await _context.NFD_SessionAttendances
                    .AsNoTracking()
                    .Select(a => (DateTime?)a.Session.SessionDate)
                    .MaxAsync();

            DateTime? latestDate = null;

            if (latestDailyDate.HasValue)
            {
                latestDate = latestDailyDate.Value;
            }

            if (latestSessionDate.HasValue &&
                (!latestDate.HasValue ||
                 latestSessionDate.Value > latestDate.Value))
            {
                latestDate = latestSessionDate.Value;
            }

            if (!latestDate.HasValue)
            {
                return Ok(new
                {
                    date = (string?)null,
                    hasRecords = false
                });
            }

            return Ok(new
            {
                date = latestDate.Value.ToString("yyyy-MM-dd"),
                hasRecords = true
            });
        }


        // GET /api/DailyAttendance/batch/{batchId}?date=2026-11-09
        // Admin Portal:
        // Read daily attendance and trainer session attendance.
        [HttpGet("batch/{batchId:int}")]
        public async Task<IActionResult> GetByBatch(
            int batchId,
            [FromQuery] DateTime? date)
        {
            if (batchId <= 0)
            {
                return BadRequest("Invalid batch ID.");
            }

            var selectedDate = (date ?? DateTime.Today).Date;
            var nextDate = selectedDate.AddDays(1);

            var batchExists = await _context.NFD_Batches
                .AsNoTracking()
                .AnyAsync(b => b.BatchId == batchId);

            if (!batchExists)
            {
                return NotFound("Batch not found.");
            }

            // 1. Get trainees enrolled in the selected batch.
            var enrollments = await _context.NFD_Enrollments
                .AsNoTracking()
                .Where(e => e.BatchId == batchId)
                .Select(e => new
                {
                    e.EnrollmentId,
                    e.TraineeId,
                    TraineeName = e.Trainee.User.FullName,
                    BatchName = e.Batch.BatchName,
                    e.CompanyId,
                    CompanyName = e.Company.CompanyName
                })
                .OrderBy(e => e.TraineeName)
                .ToListAsync();

            var enrollmentIds = enrollments
                .Select(e => e.EnrollmentId)
                .ToList();

            var traineeIds = enrollments
                .Select(e => e.TraineeId)
                .Distinct()
                .ToList();

            // 2. Read daily attendance records.
            var dailyAttendanceRecords =
                await _context.NFD_DailyAttendances
                    .AsNoTracking()
                    .Where(a =>
                        enrollmentIds.Contains(a.EnrollmentId) &&
                        a.Date >= selectedDate &&
                        a.Date < nextDate)
                    .OrderByDescending(a => a.DailyAttendanceId)
                    .ToListAsync();

            var dailyAttendanceByEnrollment =
                dailyAttendanceRecords
                    .GroupBy(a => a.EnrollmentId)
                    .ToDictionary(
                        g => g.Key,
                        g => g.First());

            // 3. Find sessions belonging to the selected
            // batch and selected date.
            var sessionIds = await _context.NFD_Sessions
                .AsNoTracking()
                .Where(s =>
                    s.BatchId == batchId &&
                    s.SessionDate >= selectedDate &&
                    s.SessionDate < nextDate)
                .Select(s => s.SessionId)
                .ToListAsync();

            // 4. Read attendance saved by trainers
            // for those sessions.
            var sessionAttendanceRecords =
                await _context.NFD_SessionAttendances
                    .AsNoTracking()
                    .Where(a =>
                        sessionIds.Contains(a.SessionId) &&
                        traineeIds.Contains(a.TraineeId))
                    .OrderByDescending(a => a.SessionId)
                    .ThenByDescending(a => a.AttendanceId)
                    .ToListAsync();

            // Keep one session attendance record per trainee
            // to avoid duplicate rows and counts.
            var sessionAttendanceByTrainee =
                sessionAttendanceRecords
                    .GroupBy(a => a.TraineeId)
                    .ToDictionary(
                        g => g.Key,
                        g => g.First());

            // 5. Merge attendance sources.
            // Daily attendance takes priority.
            // Session attendance is used as fallback.
            var result = enrollments.Select(e =>
            {
                dailyAttendanceByEnrollment.TryGetValue(
                    e.EnrollmentId,
                    out var dailyAttendance);

                sessionAttendanceByTrainee.TryGetValue(
                    e.TraineeId,
                    out var sessionAttendance);

                var hasDailyAttendance =
                    dailyAttendance != null;

                var hasSessionAttendance =
                    sessionAttendance != null;

                var hasAttendanceRecord =
                    hasDailyAttendance || hasSessionAttendance;

                var status = hasDailyAttendance
                    ? dailyAttendance!.Status.ToString()
                    : hasSessionAttendance
                        ? sessionAttendance!.Status.ToString()
                        : "NotRecorded";

                var note = hasDailyAttendance
                    ? dailyAttendance!.Note
                    : hasSessionAttendance
                        ? sessionAttendance!.Note
                        : null;

                return new
                {
                    e.EnrollmentId,
                    e.TraineeId,
                    e.TraineeName,
                    e.BatchName,
                    e.CompanyId,
                    e.CompanyName,

                    Date = selectedDate,

                    DailyAttendanceId =
                        dailyAttendance?.DailyAttendanceId,

                    SessionAttendanceId =
                        sessionAttendance?.AttendanceId,

                    SessionId =
                        sessionAttendance?.SessionId,

                    Status = status,

                    CheckInTime =
                        dailyAttendance?.CheckInTime,

                    CheckOutTime =
                        dailyAttendance?.CheckOutTime,

                    IsLate = hasDailyAttendance
                        ? dailyAttendance!.IsLate
                        : status == "Late",

                    Note = note,

                    HasAttendanceRecord =
                        hasAttendanceRecord,

                    AttendanceSource = hasDailyAttendance
                        ? "DailyAttendance"
                        : hasSessionAttendance
                            ? "SessionAttendance"
                            : "NotRecorded"
                };
            }).ToList();

            return Ok(result);
        }

        // POST /api/DailyAttendance/check-in
        [HttpPost("check-in")]
        public async Task<IActionResult> CheckIn(
            [FromBody] CreateDailyAttendanceDto dto)
        {
            try
            {
                DailyAttendanceReadDto created =
                    await _service.CreateAsync(dto);

                return CreatedAtAction(
                    nameof(GetByEnrollmentId),
                    new
                    {
                        enrollmentId = created.EnrollmentId
                    },
                    created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // POST /api/DailyAttendance/{id}/confirm-absence
        [HttpPost("{id}/confirm-absence")]
        public async Task<IActionResult> ConfirmAbsence(int id)
        {
            try
            {
                bool success =
                    await _service.ConfirmAbsenceAsync(id);

                if (!success)
                {
                    return NotFound();
                }

                return Ok(new
                {
                    message = "Absence confirmed successfully."
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // PUT /api/DailyAttendance/{id}/check-out
        [HttpPut("{id}/check-out")]
        public async Task<IActionResult> CheckOut(
            int id,
            [FromBody] CheckOutDailyAttendanceDto dto)
        {
            try
            {
                bool success =
                    await _service.CheckOutAsync(id, dto);

                if (!success)
                {
                    return NotFound();
                }

                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // PUT /api/DailyAttendance/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            int id,
            [FromBody] UpdateDailyAttendanceDto dto)
        {
            bool success =
                await _service.UpdateAsync(id, dto);

            if (!success)
            {
                return NotFound();
            }

            return NoContent();
        }

        // GET /api/DailyAttendance/company/{companyId}/today
        [HttpGet("company/{companyId}/today")]
        public async Task<IActionResult> GetTodayByCompany(
            int companyId)
        {
            List<DailyAttendanceReadDto> result =
                await _service.GetTodayByCompanyIdAsync(companyId);

            return Ok(result);
        }

        // GET /api/DailyAttendance/enrollment/{enrollmentId}/compliance-rate
        [HttpGet("enrollment/{enrollmentId}/compliance-rate")]
        public async Task<IActionResult> GetComplianceRate(
            int enrollmentId)
        {
            ComplianceRateDto result =
                await _service.GetComplianceRateAsync(enrollmentId);

            return Ok(result);
        }
    }
}
