using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using System.Globalization;

namespace Nafadh_Backend.Controllers
{
    // Company-portal-only read model. Keeping this endpoint separate avoids
    // changing shared ReportController/ReportRepository behavior used by the
    // Admin and Trainer portals.
    [ApiController]
    [Route("api/[controller]")]
    public class CompanyDashboardController : ControllerBase
    {
        private readonly Nafadhcontext _context;

        public CompanyDashboardController(Nafadhcontext context)
        {
            _context = context;
        }

        [HttpGet("{companyId:int}")]
        public async Task<ActionResult<CompanyDashboardDTO>> Get(int companyId)
        {
            var company = await _context.NFD_Companies
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.CompanyId == companyId);

            if (company is null)
                return NotFound(new { message = "Company not found." });

            var enrollments = await _context.NFD_Enrollments
                .AsNoTracking()
                .Include(e => e.Trainee).ThenInclude(t => t.User)
                .Include(e => e.Batch).ThenInclude(b => b.Program)
                .Include(e => e.DailyAttendances)
                .Include(e => e.Evaluations)
                .Where(e => e.CompanyId == companyId)
                .ToListAsync();

            var capacity = company.Capacity;
            var used = enrollments.Count;

            var baseRows = enrollments.Select(e => new
            {
                e.EnrollmentId,
                e.TraineeId,
                FullName = e.Trainee?.User?.FullName,
                Major = e.Trainee?.Major,
                GitHubUrl = e.Trainee?.GitHubUrl,
                Performance = e.Evaluations.Count > 0
                    ? Math.Round((double)e.Evaluations.Average(x => x.Score), 1)
                    : 0,
                Attendance = e.DailyAttendances.Count > 0
                    ? Math.Round(e.DailyAttendances.Count(x => x.Status == NFD_AttendanceStatus.Present) * 100.0 / e.DailyAttendances.Count, 1)
                    : 0,
                Active = e.CompletionStatus == NFD_EnrollmentCompletionStatus.InProgress
            }).ToList();

            var top = baseRows
                .Where(x => x.Performance > 0)
                .OrderByDescending(x => x.Performance)
                .ThenByDescending(x => x.Attendance)
                .Take(5)
                .Select(x => new CompanyDashboardTraineeDTO
                {
                    TraineeId = x.TraineeId,
                    EnrollmentId = x.EnrollmentId,
                    FullName = x.FullName,
                    Major = x.Major,
                    GitHubUrl = x.GitHubUrl,
                    PerformancePercent = x.Performance,
                    AttendancePercent = x.Attendance
                })
                .ToList();

            var risk = baseRows
                .Where(x => x.Attendance < 80 || (x.Performance > 0 && x.Performance < 60))
                .OrderBy(x => x.Attendance)
                .ThenBy(x => x.Performance)
                .Take(5)
                .Select(x => new CompanyDashboardTraineeDTO
                {
                    TraineeId = x.TraineeId,
                    EnrollmentId = x.EnrollmentId,
                    FullName = x.FullName,
                    Major = x.Major,
                    GitHubUrl = x.GitHubUrl,
                    PerformancePercent = x.Performance,
                    AttendancePercent = x.Attendance
                })
                .ToList();

            var attendanceRecords = enrollments
                .SelectMany(e => e.DailyAttendances)
                .ToList();

            var attendanceWeeks = attendanceRecords
                .GroupBy(a => new { Year = ISOWeek.GetYear(a.Date), Week = ISOWeek.GetWeekOfYear(a.Date) })
                .OrderByDescending(g => g.Key.Year)
                .ThenByDescending(g => g.Key.Week)
                .Take(6)
                .OrderBy(g => g.Key.Year)
                .ThenBy(g => g.Key.Week)
                .Select(g => new CompanyDashboardChartPointDTO
                {
                    Label = $"أسبوع {g.Key.Week}",
                    Value = Math.Round(g.Count() == 0 ? 0 : g.Count(x => x.Status == NFD_AttendanceStatus.Present) * 100.0 / g.Count(), 1)
                })
                .ToList();

            var programDistribution = enrollments
                .GroupBy(e => e.Batch?.Program?.Title ?? "غير محدد")
                .Select(g => new CompanyDashboardChartPointDTO { Label = g.Key, Value = g.Count() })
                .OrderByDescending(x => x.Value)
                .ToList();

            var recentWarnings = await _context.NFD_Warnings
                .AsNoTracking()
                .Include(w => w.Enrollment).ThenInclude(e => e!.Trainee).ThenInclude(t => t!.User)
                .Where(w => w.Scope == NFD_WarningScope.Trainee
                            && w.Enrollment != null
                            && w.Enrollment.CompanyId == companyId)
                .OrderByDescending(w => w.IssuedDate)
                .Take(10)
                .Select(w => new CompanyDashboardWarningDTO
                {
                    WarningId = w.WarningId,
                    EnrollmentId = w.EnrollmentId ?? 0,
                    TraineeId = w.Enrollment!.TraineeId,
                    TraineeName = w.Enrollment.Trainee.User.FullName,
                    GitHubUrl = w.Enrollment.Trainee.GitHubUrl,
                    Type = w.Type.ToString(),
                    Level = w.Level.ToString(),
                    Status = w.Status.ToString(),
                    IssuedDate = w.IssuedDate
                })
                .ToListAsync();

            return Ok(new CompanyDashboardDTO
            {
                Capacity = new CompanyDashboardCapacityDTO
                {
                    Total = capacity,
                    Used = used,
                    Remaining = Math.Max(0, capacity - used)
                },
                AttendanceWeeks = attendanceWeeks,
                ProgramDistribution = programDistribution,
                TopPerformers = top,
                AtRiskTrainees = risk,
                RecentWarnings = recentWarnings,
                TotalTrainees = enrollments.Select(e => e.TraineeId).Distinct().Count(),
                ActiveTrainees = baseRows.Count(x => x.Active)
            });
        }
    }
}
