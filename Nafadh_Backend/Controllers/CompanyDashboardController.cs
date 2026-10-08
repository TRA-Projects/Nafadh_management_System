using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using System.Globalization;
using System.Security.Claims;

namespace Nafadh_Backend.Controllers
{
    // Company Portal only.
    // This endpoint is dedicated to the Company Dashboard and does not
    // change the shared ReportController or any other portal.
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "CompanySupervisor")]
    public class CompanyDashboardController : ControllerBase
    {
        private readonly Nafadhcontext _context;

        public CompanyDashboardController(Nafadhcontext context)
        {
            _context = context;
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
            //   -> Evaluations
            // ============================================================

            var enrollments = await _context.NFD_Enrollments
                .AsNoTracking()

                .Include(e => e.Trainee)
                    .ThenInclude(t => t.User)

                .Include(e => e.Batch)
                    .ThenInclude(b => b.Program)

                .Include(e => e.DailyAttendances)

                .Include(e => e.Evaluations)

                .Where(e => e.CompanyId == companyId)

                .ToListAsync();

            // ============================================================
            // 5. Company name
            // ============================================================

            var companyName = company.CompanyName;

            // ============================================================
            // 6. Attendance records
            // ============================================================

            var attendanceRecords = enrollments
                .SelectMany(e => e.DailyAttendances)
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

            var baseRows = enrollments
                .Select(e =>
                {
                    var evaluations = e.Evaluations
                        .Where(x =>
                            x.EnrollmentId ==
                            e.EnrollmentId)
                        .ToList();

                    var attendances =
                        e.DailyAttendances.ToList();

                    // ----------------------------------------------------
                    // Overall performance
                    //
                    // IMPORTANT:
                    // We use ALL evaluations belonging to the enrollment.
                    // We do NOT restrict them to the current month.
                    // ----------------------------------------------------

                    var performance =
                        evaluations.Count > 0
                            ? Math.Round(
                                (double)evaluations.Average(
                                    x => x.Score),
                                1)
                            : 0;

                    // ----------------------------------------------------
                    // Overall attendance
                    // ----------------------------------------------------

                    var attendance =
                        attendances.Count > 0
                            ? Math.Round(
                                attendances.Count(x =>
                                    x.Status ==
                                    NFD_AttendanceStatus.Present)
                                * 100.0
                                / attendances.Count,
                                1)
                            : 0;

                    var isActive =
                        e.CompletionStatus ==
                        NFD_EnrollmentCompletionStatus.InProgress;

                    return new
                    {
                        e.EnrollmentId,

                        e.TraineeId,

                        FullName =
                            e.Trainee?.User?.FullName,

                        Major =
                            e.Trainee?.Major,

                        // ------------------------------------------------
                        // Program comes from:
                        //
                        // Enrollment -> Batch -> Program -> Title
                        // ------------------------------------------------

                        ProgramName =
                            e.Batch?.Program?.Title,

                        GitHubUrl =
                            e.Trainee?.GitHubUrl,

                        LinkedInUrl =
                            e.Trainee?.LinkedInUrl,

                        Performance =
                            performance,

                        Attendance =
                            attendance,

                        Active =
                            isActive,

                        CompletionStatus =
                            e.CompletionStatus,

                        Evaluations =
                            evaluations,

                        Attendances =
                            attendances
                    };
                })
                .ToList();

            // ============================================================
            // 11. TOP PERFORMERS
            //
            // IMPORTANT:
            // Do NOT filter by current month.
            //
            // The trainee is considered a top performer when they have
            // at least one evaluation. Their overall average evaluation
            // score is used for ranking.
            //
            // This prevents Top Performers from becoming 0 just because
            // the current month has no new evaluations.
            // ============================================================

            var topPerformers = baseRows
                .Where(x =>
                    x.Evaluations.Count > 0)

                .OrderByDescending(x =>
                    x.Performance)

                .ThenByDescending(x =>
                    x.Attendance)

                .Take(5)

                .Select(x => new CompanyDashboardTraineeDTO
                {
                    TraineeId =
                        x.TraineeId,

                    EnrollmentId =
                        x.EnrollmentId,

                    FullName =
                        x.FullName,

                    Major =
                        x.Major,

                    ProgramName =
                        x.ProgramName,

                    GitHubUrl =
                        x.GitHubUrl,

                    LinkedInUrl =
                        x.LinkedInUrl,

                    PerformancePercent =
                        x.Performance,

                    AttendancePercent =
                        x.Attendance,

                    RiskReason =
                        null
                })

                .ToList();

            // ============================================================
            // 12. AT-RISK TRAINEES
            //
            // A trainee is considered at risk when:
            //
            // - Attendance < 80%
            // OR
            // - They have evaluations and performance < 60%
            //
            // The backend generates the reason so the frontend does not
            // have to duplicate business rules.
            // ============================================================

            var riskRows = baseRows
                .Where(x =>
                    x.Attendance < 80
                    ||
                    (
                        x.Evaluations.Count > 0
                        &&
                        x.Performance < 60
                    ))

                .OrderBy(x =>
                    x.Attendance)

                .ThenBy(x =>
                    x.Performance)

                .Take(5)

                .ToList();

            var atRiskTrainees = riskRows
                .Select(x =>
                {
                    string riskReason;

                    if (
                        x.Attendance < 80
                        &&
                        x.Evaluations.Count > 0
                        &&
                        x.Performance < 60
                    )
                    {
                        riskReason =
                            $"انخفاض الحضور ({Math.Round(x.Attendance)}%) ومستوى الأداء ({Math.Round(x.Performance)}%)";
                    }
                    else if (x.Attendance < 80)
                    {
                        riskReason =
                            $"انخفاض الحضور ({Math.Round(x.Attendance)}%)";
                    }
                    else
                    {
                        riskReason =
                            $"انخفاض مستوى الأداء ({Math.Round(x.Performance)}%)";
                    }

                    return new CompanyDashboardTraineeDTO
                    {
                        TraineeId =
                            x.TraineeId,

                        EnrollmentId =
                            x.EnrollmentId,

                        FullName =
                            x.FullName,

                        Major =
                            x.Major,

                        // Program displayed in the Company Dashboard
                        ProgramName =
                            x.ProgramName,

                        GitHubUrl =
                            x.GitHubUrl,

                        LinkedInUrl =
                            x.LinkedInUrl,

                        PerformancePercent =
                            x.Performance,

                        AttendancePercent =
                            x.Attendance,

                        RiskReason =
                            riskReason
                    };
                })

                .ToList();

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
                            $"أسبوع {g.Key.Week}",

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
                        companyId)

                    .OrderByDescending(w =>
                        w.IssuedDate)

                    .Take(10)

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

            var totalTrainees =
                enrollments
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