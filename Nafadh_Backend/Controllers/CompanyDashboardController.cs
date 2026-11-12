using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Services;
using System.Globalization;
using System.Security.Claims;

namespace Nafadh_Backend.Controllers
{
    // Company Portal only.
    // Company Dashboard and weighted results use the Admin report evaluator,
    // restricted to the authenticated supervisor's company.
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "CompanySupervisor")]
    public class CompanyDashboardController : ControllerBase
    {
        private readonly Nafadhcontext _context;

        private readonly Nafadh_Backend.Repositories.IReportRepository _reports;

        public CompanyDashboardController(
            Nafadhcontext context,
            Nafadh_Backend.Repositories.IReportRepository reports)
        {
            _context = context;
            _reports = reports;
        }

        // Detailed batch results for Company Reports: same Admin report evaluator.
        [HttpGet("{companyId:int}/weighted-results")]
        public async Task<ActionResult<List<CompanyWeightedEvaluationDTO>>> GetWeightedResults(int companyId)
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");
            if (!int.TryParse(userIdValue, out var userId)) return Unauthorized();
            if (!await _context.NFD_CompanySupervisors.AsNoTracking().AnyAsync(s =>
                    s.UserId == userId && s.CompanyId == companyId)) return Forbid();
            return Ok(await _reports.GetCompanyWeightedEvaluationsAsync(companyId));
        }

        // Company-only periodic *temporary* performance, matching the Admin
        // dashboard's observed-component weighting and selected date range.
        // Final weighted grades and official warnings remain unchanged.
        [HttpGet("{companyId:int}/period-performance")]
        [ProducesResponseType(typeof(CompanyDashboardPeriodPerformanceDTO), StatusCodes.Status200OK)]
        public async Task<ActionResult<CompanyDashboardPeriodPerformanceDTO>> GetPeriodPerformance(
            int companyId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");
            if (!int.TryParse(userIdValue, out var userId)) return Unauthorized();

            var ownsCompany = await _context.NFD_CompanySupervisors.AsNoTracking()
                .AnyAsync(s => s.UserId == userId && s.CompanyId == companyId);
            if (!ownsCompany) return Forbid();

            if (startDate.HasValue && endDate.HasValue &&
                startDate.Value.Date > endDate.Value.Date)
            {
                return BadRequest(new { message = "startDate cannot be later than endDate." });
            }

            var evaluator = new CompanyDashboardPeriodPerformanceService(_context);
            return Ok(await evaluator.GetAsync(companyId, startDate, endDate));
        }

        [HttpGet("{companyId:int}")]
        [ProducesResponseType(typeof(CompanyDashboardDTO), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<CompanyDashboardDTO>> Get(int companyId)
        {
            // ============================================================
            // 1. Get authenticated user
            // ============================================================

            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
            {
                return Unauthorized();
            }

            // ============================================================
            // 2. Security check
            //
            // Make sure the logged-in Company Supervisor actually
            // belongs to the requested company.
            // ============================================================

            var ownsCompany = await _context.NFD_CompanySupervisors
                .AsNoTracking()
                .AnyAsync(s =>
                    s.UserId == userId &&
                    s.CompanyId == companyId);

            if (!ownsCompany)
            {
                return Forbid();
            }

            // ============================================================
            // 3. Load company
            // ============================================================

            var company = await _context.NFD_Companies
                .AsNoTracking()
                .FirstOrDefaultAsync(c =>
                    c.CompanyId == companyId);

            if (company is null)
            {
                return NotFound(new
                {
                    message = "Company not found."
                });
            }

            // ============================================================
            // 4. Load company enrollments and dashboard-related data
            //
            // Enrollment
            //   -> Trainee
            //   -> User
            //   -> Batch
            //   -> Program
            //   -> Attendance
            //   -> Attendance excuses (evaluation is calculated in ReportRepository)
            // ============================================================

            var enrollments = await _context.NFD_Enrollments
                .AsNoTracking()

                .Include(e => e.Trainee)
                    .ThenInclude(t => t.User)

                .Include(e => e.Batch)
                    .ThenInclude(b => b.Program)

                .Include(e => e.DailyAttendances)
                    .ThenInclude(a => a.Excuses)

                .Where(e => e.CompanyId == companyId)

                .ToListAsync();

            // ============================================================
            // 5. Company name
            // ============================================================

            var companyName = company.CompanyName;

            // ============================================================
            // 6. Attendance records
            // ============================================================

            // ACTIVE enrollments only (InProgress). Completed / Dropped /
            // Failed enrollments must not affect any dashboard number.
            var attendanceRecords = enrollments
                .Where(e =>
                    e.CompletionStatus ==
                    NFD_EnrollmentCompletionStatus.InProgress)
                .SelectMany(e => e.DailyAttendances)
                .Where(a => !a.Excuses.Any(x => x.Status == NFD_ExcuseStatus.Approved))
                .ToList();

            // ============================================================
            // 7. Average company attendance
            // ============================================================

            var averageAttendancePercent =
                attendanceRecords.Count == 0
                    ? 0
                    : Math.Round(
                        attendanceRecords.Count(x =>
                            x.Status == NFD_AttendanceStatus.Present)
                        * 100.0
                        / attendanceRecords.Count,
                        1);

            // ============================================================
            // 8. Active enrollments
            // ============================================================

            var activeEnrollments = enrollments
                .Where(e =>
                    e.CompletionStatus ==
                    NFD_EnrollmentCompletionStatus.InProgress)
                .ToList();

            // ============================================================
            // 9. Capacity
            //
            // Count unique active trainees so one trainee with more than
            // one enrollment does not consume capacity multiple times.
            // ============================================================

            var usedCapacity = activeEnrollments
                .Select(e => e.TraineeId)
                .Distinct()
                .Count();

            var capacity = company.Capacity;

            var remainingCapacity =
                Math.Max(
                    0,
                    capacity - usedCapacity);

            // ============================================================
            // 10. Build common dashboard rows
            // ============================================================

            // Final assessment must be identical to Admin batch-performance.
            // Incomplete grades remain null; we do not invent 0% classifications.
            // One row per EnrollmentId: a trainee may have multiple active batches.
            var weightedRows = await _reports.GetCompanyWeightedEvaluationsAsync(companyId);

            var topPerformerRows = weightedRows
                .Where(x => x.IsComplete && x.Level == "ممتاز")
                .OrderByDescending(x => x.FinalScore)
                .ThenByDescending(x => x.AttendancePercent)
                .ToList();

            var topPerformersCount = topPerformerRows.Count;
            var topPerformersAveragePercent = topPerformersCount == 0
                ? 0 : Math.Round(topPerformerRows.Average(x => (double)x.FinalScore!.Value), 1);

            var topPerformers = topPerformerRows.Select(x => new CompanyDashboardTraineeDTO
            {
                TraineeId = x.TraineeId,
                EnrollmentId = x.EnrollmentId,
                FullName = x.FullName,
                Major = x.Major,
                ProgramName = x.ProgramName,
                GitHubUrl = x.GitHubUrl,
                LinkedInUrl = x.LinkedInUrl,
                PerformancePercent = (double)x.FinalScore!.Value,
                AttendancePercent = x.AttendancePercent,
                RiskReason = null
            }).ToList();

            // "متعثر" and "راسب" here are academic classifications.
            // Real issued warnings remain sourced from NFD_Warnings below.
            var atRiskTrainees = weightedRows
                .Where(x => x.IsComplete && (x.Level == "متعثر" || x.Level == "راسب"))
                .OrderBy(x => x.AttendancePercent)
                .ThenBy(x => x.FinalScore)
                .Select(x => new CompanyDashboardTraineeDTO
                {
                    TraineeId = x.TraineeId,
                    EnrollmentId = x.EnrollmentId,
                    FullName = x.FullName,
                    Major = x.Major,
                    ProgramName = x.ProgramName,
                    GitHubUrl = x.GitHubUrl,
                    LinkedInUrl = x.LinkedInUrl,
                    PerformancePercent = (double)x.FinalScore!.Value,
                    AttendancePercent = x.AttendancePercent,
                    RiskReason = x.Level == "متعثر"
                        ? "الحضور دون الحد المعتمد للدفعة"
                        : "الدرجة النهائية دون الحد المعتمد للدفعة"
                }).ToList();

            // ============================================================
            // 13. Attendance chart
            //
            // Latest six ISO weeks.
            // ============================================================

            var attendanceWeeks = attendanceRecords
                .GroupBy(a => new
                {
                    Year =
                        ISOWeek.GetYear(a.Date),

                    Week =
                        ISOWeek.GetWeekOfYear(a.Date)
                })

                .OrderByDescending(g =>
                    g.Key.Year)

                .ThenByDescending(g =>
                    g.Key.Week)

                .Take(6)

                .OrderBy(g =>
                    g.Key.Year)

                .ThenBy(g =>
                    g.Key.Week)

                .Select(g =>
                    new CompanyDashboardChartPointDTO
                    {
                        Label =
                            $"أسبوع {g.Key.Week} / {g.Key.Year}",

                        Value =
                            Math.Round(
                                g.Count() == 0
                                    ? 0
                                    : g.Count(x =>
                                        x.Status ==
                                        NFD_AttendanceStatus.Present)
                                      * 100.0
                                      / g.Count(),
                                1)
                    })

                .ToList();

            // ============================================================
            // 14. Program distribution
            //
            // Current active trainees grouped by training program.
            // ============================================================

            var programDistribution =
                activeEnrollments

                    .GroupBy(e =>
                        e.Batch?.Program?.Title
                        ?? "غير محدد")

                    .Select(g =>
                        new CompanyDashboardChartPointDTO
                        {
                            Label =
                                g.Key,

                            Value =
                                g.Select(e =>
                                    e.TraineeId)
                                .Distinct()
                                .Count()
                        })

                    .OrderByDescending(x =>
                        x.Value)

                    .ToList();

            // ============================================================
            // 15. Recent warnings
            // ============================================================

            var recentWarnings =
                await _context.NFD_Warnings

                    .AsNoTracking()

                    .Include(w =>
                        w.Enrollment)
                        .ThenInclude(e =>
                            e!.Trainee)
                        .ThenInclude(t =>
                            t!.User)

                    .Where(w =>
                        w.Scope ==
                        NFD_WarningScope.Trainee

                        &&
                        w.Enrollment != null

                        &&
                        w.Enrollment.CompanyId ==
                        companyId

                        // Active trainees only.
                        &&
                        w.Enrollment.CompletionStatus ==
                        NFD_EnrollmentCompletionStatus.InProgress)

                    .OrderByDescending(w =>
                        w.IssuedDate)

                    .Select(w =>
                        new CompanyDashboardWarningDTO
                        {
                            WarningId =
                                w.WarningId,

                            EnrollmentId =
                                w.EnrollmentId ?? 0,

                            TraineeId =
                                w.Enrollment!.TraineeId,

                            TraineeName =
                                w.Enrollment.Trainee.User.FullName,

                            GitHubUrl =
                                w.Enrollment.Trainee.GitHubUrl,

                            LinkedInUrl =
                                w.Enrollment.Trainee.LinkedInUrl,

                            Type =
                                w.Type.ToString(),

                            Level =
                                w.Level.ToString(),

                            Status =
                                w.Status.ToString(),

                            IssuedDate =
                                w.IssuedDate
                        })

                    .ToListAsync();

            // ============================================================
            // 16. Unique trainee counts
            // ============================================================

            // Active trainees only, so TotalTrainees == ActiveTrainees.
            var totalTrainees =
                activeEnrollments
                    .Select(e =>
                        e.TraineeId)
                    .Distinct()
                    .Count();

            var activeTrainees =
                activeEnrollments
                    .Select(e =>
                        e.TraineeId)
                    .Distinct()
                    .Count();

            // ============================================================
            // 17. Final Company Dashboard response
            // ============================================================

            return Ok(
                new CompanyDashboardDTO
                {
                    CompanyName =
                        companyName,

                    Capacity =
                        new CompanyDashboardCapacityDTO
                        {
                            Total =
                                capacity,

                            Used =
                                usedCapacity,

                            Remaining =
                                remainingCapacity
                        },

                    AverageAttendancePercent =
                        averageAttendancePercent,

                    AttendanceWeeks =
                        attendanceWeeks,

                    ProgramDistribution =
                        programDistribution,

                    TopPerformers =
                        topPerformers,

                    TopPerformersCount =
                        topPerformersCount,

                    TopPerformersAveragePercent =
                        topPerformersAveragePercent,

                    AtRiskTrainees =
                        atRiskTrainees,

                    RecentWarnings =
                        recentWarnings,

                    TotalTrainees =
                        totalTrainees,

                    ActiveTrainees =
                        activeTrainees
                });
        }
    }
}