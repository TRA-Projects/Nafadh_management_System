using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using System.Globalization;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminDashboardController : ControllerBase
    {
        private readonly Nafadhcontext _context;

        public AdminDashboardController(Nafadhcontext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<AdminDashboardDTO>> GetSummary()
        {
            var companies = await _context.NFD_Companies
                .AsNoTracking()
                .ToListAsync();

            var totalTraineesCount = await _context.NFD_Trainees.CountAsync();
            var totalBatchesCount = await _context.NFD_Batches.CountAsync();
            var totalCertificatesCount = await _context.NFD_Certificates.CountAsync();

            var enrollments = await _context.NFD_Enrollments
                .AsNoTracking()
                .Include(e => e.Trainee).ThenInclude(t => t.User)
                .Include(e => e.Company)
                .Include(e => e.Batch).ThenInclude(b => b.Program)
                .Include(e => e.DailyAttendances)
                .Include(e => e.Evaluations)
                .ToListAsync();

            var totalCapacity = companies.Sum(c => c.Capacity);
            var usedCapacity = enrollments.Count;

            var baseRows = enrollments.Select(e => new
            {
                e.EnrollmentId,
                e.TraineeId,
                FullName = e.Trainee?.User?.FullName ?? "غير محدد",
                Major = e.Trainee?.Major ?? "غير محدد",
                CompanyName = e.Company?.CompanyName ?? "غير محدد",
                GitHubUrl = e.Trainee?.GitHubUrl,
                LinkedInUrl = e.Trainee?.LinkedInUrl,
                Performance = e.Evaluations.Count > 0
                    ? Math.Round((double)e.Evaluations.Average(x => x.Score), 1)
                    : 0,
                Attendance = e.DailyAttendances.Count > 0
                    ? Math.Round(e.DailyAttendances.Count(x => x.Status == NFD_AttendanceStatus.Present) * 100.0 / e.DailyAttendances.Count, 1)
                    : 0,
                Active = e.CompletionStatus == NFD_EnrollmentCompletionStatus.InProgress
            }).ToList();

            // المتميزون (Performance >= 80 أو أعلى 5)
            var allTop = baseRows
                .Where(x => x.Performance >= 80)
                .OrderByDescending(x => x.Performance)
                .ThenByDescending(x => x.Attendance)
                .ToList();

            if (allTop.Count == 0)
            {
                allTop = baseRows
                    .Where(x => x.Performance > 0)
                    .OrderByDescending(x => x.Performance)
                    .ThenByDescending(x => x.Attendance)
                    .ToList();
            }

            var topPerformers = allTop
                .Take(5)
                .Select(x => new AdminDashboardTraineeDTO
                {
                    TraineeId = x.TraineeId,
                    EnrollmentId = x.EnrollmentId,
                    FullName = x.FullName,
                    Major = x.Major,
                    CompanyName = x.CompanyName,
                    GitHubUrl = x.GitHubUrl,
                    LinkedInUrl = x.LinkedInUrl,
                    PerformancePercent = x.Performance,
                    AttendancePercent = x.Attendance
                })
                .ToList();

            // المتعثرون (حضور أقل من 80% أو تقييم أقل من 60%)
            var allRisk = baseRows
                .Where(x => x.Attendance < 80 || (x.Performance > 0 && x.Performance < 60))
                .OrderBy(x => x.Attendance)
                .ThenBy(x => x.Performance)
                .ToList();

            var atRiskTrainees = allRisk
                .Take(5)
                .Select(x => new AdminDashboardTraineeDTO
                {
                    TraineeId = x.TraineeId,
                    EnrollmentId = x.EnrollmentId,
                    FullName = x.FullName,
                    Major = x.Major,
                    CompanyName = x.CompanyName,
                    GitHubUrl = x.GitHubUrl,
                    LinkedInUrl = x.LinkedInUrl,
                    PerformancePercent = x.Performance,
                    AttendancePercent = x.Attendance
                })
                .ToList();

            var attendanceRecords = enrollments
                .SelectMany(e => e.DailyAttendances)
                .ToList();

            var overallAttendanceRate = attendanceRecords.Count > 0
                ? Math.Round(attendanceRecords.Count(x => x.Status == NFD_AttendanceStatus.Present) * 100.0 / attendanceRecords.Count, 1)
                : 0;

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

            var companyDistribution = enrollments
                .GroupBy(e => e.Company?.CompanyName ?? "غير محدد")
                .Select(g => new CompanyDashboardChartPointDTO { Label = g.Key, Value = g.Count() })
                .OrderByDescending(x => x.Value)
                .Take(6)
                .ToList();

            var programDistribution = enrollments
                .GroupBy(e => e.Batch?.Program?.Title ?? "غير محدد")
                .Select(g => new CompanyDashboardChartPointDTO { Label = g.Key, Value = g.Count() })
                .OrderByDescending(x => x.Value)
                .Take(6)
                .ToList();

            var recentWarnings = await _context.NFD_Warnings
                .AsNoTracking()
                .Include(w => w.Company)
                .Include(w => w.Enrollment).ThenInclude(e => e!.Trainee).ThenInclude(t => t!.User)
                .OrderByDescending(w => w.IssuedDate)
                .Take(8)
                .Select(w => new AdminDashboardWarningDTO
                {
                    WarningId = w.WarningId,
                    Scope = w.Scope.ToString(),
                    TraineeId = w.Enrollment != null ? w.Enrollment.TraineeId : null,
                    CompanyId = w.CompanyId ?? (w.Enrollment != null ? w.Enrollment.CompanyId : null),
                    TargetName = w.Scope == NFD_WarningScope.Company
                        ? (w.Company != null ? w.Company.CompanyName : "شركة مستضيفة")
                        : (w.Enrollment != null && w.Enrollment.Trainee != null && w.Enrollment.Trainee.User != null
                            ? w.Enrollment.Trainee.User.FullName
                            : "متدرب"),
                    GitHubUrl = w.Enrollment != null && w.Enrollment.Trainee != null ? w.Enrollment.Trainee.GitHubUrl : null,
                    LinkedInUrl = w.Enrollment != null && w.Enrollment.Trainee != null ? w.Enrollment.Trainee.LinkedInUrl : null,
                    Type = w.Type.ToString(),
                    Level = w.Level.ToString(),
                    Status = w.Status.ToString(),
                    IssuedDate = w.IssuedDate
                })
                .ToListAsync();

            return Ok(new AdminDashboardDTO
            {
                TotalTrainees = totalTraineesCount > 0 ? totalTraineesCount : enrollments.Select(e => e.TraineeId).Distinct().Count(),
                ActiveTrainees = baseRows.Count(x => x.Active),
                TotalCompanies = companies.Count,
                TotalBatches = totalBatchesCount,
                TotalCertificates = totalCertificatesCount,
                OverallAttendanceRate = overallAttendanceRate,
                TopPerformersCount = allTop.Count,
                TopPerformersAvgScore = allTop.Count > 0 ? Math.Round(allTop.Average(x => x.Performance), 1) : 0,
                AtRiskCount = allRisk.Count,
                Capacity = new CompanyDashboardCapacityDTO
                {
                    Total = totalCapacity,
                    Used = usedCapacity,
                    Remaining = Math.Max(0, totalCapacity - usedCapacity)
                },
                AttendanceWeeks = attendanceWeeks,
                CompanyDistribution = companyDistribution,
                ProgramDistribution = programDistribution,
                TopPerformers = topPerformers,
                AtRiskTrainees = atRiskTrainees,
                RecentWarnings = recentWarnings
            });
        }
    }
}