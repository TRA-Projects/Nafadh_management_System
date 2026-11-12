using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using System.Globalization;

namespace Nafadh_Backend.Services
{
    /// <summary>
    /// Company-only implementation of Admin's period dashboard performance semantics.
    /// Does not write to grades, warnings or any Admin settings.
    /// All reads are restricted to the company supplied by an authorized controller.
    /// </summary>
    public sealed class CompanyDashboardPeriodPerformanceService
    {
        private readonly Nafadhcontext _context;

        public CompanyDashboardPeriodPerformanceService(Nafadhcontext context)
        {
            _context = context;
        }

        private static decimal? ParseTaskGrade(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            value = value.Trim();
            var culture = CultureInfo.InvariantCulture;
            const NumberStyles style = NumberStyles.Number;

            if (value.Contains('/'))
            {
                var parts = value.Split('/');
                if (parts.Length != 2 ||
                    !decimal.TryParse(parts[0].Trim(), style, culture, out var earned) ||
                    !decimal.TryParse(parts[1].Trim(), style, culture, out var maximum) ||
                    maximum <= 0 || earned < 0 || earned > maximum)
                    return null;
                return Math.Round(earned / maximum * 100m, 2);
            }

            if (!decimal.TryParse(value, style, culture, out var score)) return null;
            return score is >= 0m and <= 100m ? score : null;
        }

        public async Task<CompanyDashboardPeriodPerformanceDTO> GetAsync(
            int companyId, DateTime? startDate, DateTime? endDate)
        {
            var from = startDate?.Date;
            var until = endDate?.Date.AddDays(1); // inclusive end date
            if (from.HasValue && until.HasValue && from.Value >= until.Value)
                throw new ArgumentException("startDate cannot be later than endDate.");

            bool InPeriod(DateTime date) =>
                (!from.HasValue || date >= from.Value) &&
                (!until.HasValue || date < until.Value);

            // Admin dashboard considers historical enrollments when there is
            // activity in the chosen period. Company does the same, but *only*
            // within its own enrollments. No other company's records are read.
            var enrollments = await _context.NFD_Enrollments
                .AsNoTracking()
                .Where(e => e.CompanyId == companyId)
                .Include(e => e.Trainee).ThenInclude(t => t.User)
                .Include(e => e.Batch).ThenInclude(b => b.Program)
                .Include(e => e.DailyAttendances).ThenInclude(a => a.Excuses)
                .ToListAsync();

            if (enrollments.Count == 0)
                return new CompanyDashboardPeriodPerformanceDTO();

            var batchIds = enrollments.Select(e => e.BatchId).Distinct().ToList();
            var traineeIds = enrollments.Select(e => e.TraineeId).Distinct().ToList();
            var enrollmentIds = enrollments.Select(e => e.EnrollmentId).ToList();

            var tasks = await _context.NFD_Tasks.AsNoTracking()
                .Where(t => batchIds.Contains(t.BatchId))
                .ToListAsync();
            var quizzes = await _context.NFD_Quizzes.AsNoTracking()
                .Where(q => batchIds.Contains(q.BatchId) &&
                    (q.Status == NFD_QuizStatus.Open ||
                     q.Status == NFD_QuizStatus.Closed ||
                     q.Status == NFD_QuizStatus.Archived))
                .ToListAsync();
            var projectBatches = await _context.NFD_ProjectBatches.AsNoTracking()
                .Where(p => batchIds.Contains(p.BatchId))
                .ToListAsync();
            var submissions = await _context.NFD_Submissions.AsNoTracking()
                .Where(s => traineeIds.Contains(s.TraineeId) &&
                            s.Status == NFD_SubmissionStatus.Graded)
                .ToListAsync();
            var attempts = await _context.NFD_QuizAttempts.AsNoTracking()
                .Where(a => traineeIds.Contains(a.TraineeId) && a.SubmittedAt.HasValue)
                .ToListAsync();
            var grades = await _context.NFD_TrainerProjectGrades.AsNoTracking()
                .Where(g => enrollmentIds.Contains(g.EnrollmentId))
                .ToListAsync();

            var stats = enrollments.Select(enrollment =>
            {
                var batch = enrollment.Batch;
                var attendanceRecords = enrollment.DailyAttendances
                    .Where(a => InPeriod(a.Date) &&
                                !a.Excuses.Any(x => x.Status == NFD_ExcuseStatus.Approved))
                    .ToList();
                var hasAttendance = attendanceRecords.Count > 0;
                var attendance = hasAttendance
                    ? Math.Round(attendanceRecords.Count(a => a.Status == NFD_AttendanceStatus.Present)
                        * 100.0 / attendanceRecords.Count, 2)
                    : 0;

                var batchTaskIds = tasks.Where(t => t.BatchId == enrollment.BatchId)
                    .Select(t => t.TaskId).ToHashSet();
                var taskScores = submissions
                    .Where(s => s.TraineeId == enrollment.TraineeId &&
                                batchTaskIds.Contains(s.TaskId) && InPeriod(s.SubmittedAt))
                    .GroupBy(s => s.TaskId)
                    .Select(g => ParseTaskGrade(g.OrderByDescending(s => s.SubmittedAt).First().Grade))
                    .Where(score => score.HasValue)
                    .Select(score => (double)score!.Value)
                    .ToList();

                var batchQuizIds = quizzes.Where(q => q.BatchId == enrollment.BatchId)
                    .Select(q => q.QuizId).ToHashSet();
                var quizScores = attempts
                    .Where(a => a.TraineeId == enrollment.TraineeId &&
                                batchQuizIds.Contains(a.QuizId) &&
                                a.SubmittedAt.HasValue && InPeriod(a.SubmittedAt.Value))
                    .GroupBy(a => a.QuizId)
                    .Select(g => (double)g.Max(a => a.Percentage))
                    .ToList();

                var batchProjectIds = projectBatches
                    .Where(p => p.BatchId == enrollment.BatchId)
                    .Select(p => p.ProjectId).ToHashSet();
                var projectScores = grades
                    .Where(g => g.EnrollmentId == enrollment.EnrollmentId &&
                                batchProjectIds.Contains(g.ProjectId) && InPeriod(g.GradedAt))
                    .GroupBy(g => g.ProjectId)
                    .Select(g => (double)g.OrderByDescending(x => x.GradedAt).First().Score)
                    .ToList();

                // Exactly as in Admin's period dashboard: normalize weights to
                // the evaluated components; never count unavailable ones as zero.
                double weightedScore = 0;
                double applicableWeight = 0;
                if (batch.AttendanceWeight > 0 && hasAttendance)
                {
                    weightedScore += attendance * (double)batch.AttendanceWeight;
                    applicableWeight += (double)batch.AttendanceWeight;
                }
                if (batch.TasksWeight > 0 && taskScores.Count > 0)
                {
                    weightedScore += taskScores.Average() * (double)batch.TasksWeight;
                    applicableWeight += (double)batch.TasksWeight;
                }
                if (batch.QuizzesWeight > 0 && quizScores.Count > 0)
                {
                    weightedScore += quizScores.Average() * (double)batch.QuizzesWeight;
                    applicableWeight += (double)batch.QuizzesWeight;
                }
                if (batch.ProjectsWeight > 0 && projectScores.Count > 0)
                {
                    weightedScore += projectScores.Average() * (double)batch.ProjectsWeight;
                    applicableWeight += (double)batch.ProjectsWeight;
                }

                var hasPerformance = applicableWeight > 0;
                var performance = hasPerformance
                    ? Math.Round(weightedScore / applicableWeight, 2)
                    : 0;

                var belowAttendance = hasAttendance &&
                    attendance < (double)batch.AtRiskMinAttendance;
                var belowPerformance = hasPerformance &&
                    performance < (double)batch.GoodMinScore;
                var isAtRisk = belowAttendance || belowPerformance;
                var isExcellent = !isAtRisk && hasAttendance && hasPerformance &&
                    performance >= (double)batch.ExcellentMinScore &&
                    attendance >= (double)batch.ExcellentMinAttendance;

                return new
                {
                    Enrollment = enrollment,
                    Attendance = attendance,
                    Performance = performance,
                    IsExcellent = isExcellent,
                    IsAtRisk = isAtRisk,
                    RiskReason = belowAttendance && belowPerformance
                        ? "الحضور والأداء خلال الفترة أقل من المعايير المعتمدة للدفعة"
                        : belowAttendance
                            ? "الحضور خلال الفترة أقل من الحد المعتمد للدفعة"
                            : "الأداء خلال الفترة أقل من الحد المعتمد للدفعة"
                };
            }).ToList();

            static CompanyDashboardTraineeDTO ToDto(
                NFD_Enrollment enrollment, double attendance, double performance, string? reason)
            {
                return new CompanyDashboardTraineeDTO
                {
                    TraineeId = enrollment.TraineeId,
                    EnrollmentId = enrollment.EnrollmentId,
                    FullName = enrollment.Trainee.User?.FullName,
                    Major = enrollment.Trainee.Major,
                    ProgramName = enrollment.Batch?.Program?.Title,
                    GitHubUrl = enrollment.Trainee.GitHubUrl,
                    LinkedInUrl = enrollment.Trainee.LinkedInUrl,
                    AttendancePercent = attendance,
                    PerformancePercent = performance,
                    RiskReason = reason
                };
            }

            // Admin's period dashboard displays a trainee only once even if
            // they have several enrollments in the selected period.
            var top = stats.Where(x => x.IsExcellent)
                .OrderByDescending(x => x.Performance)
                .ThenByDescending(x => x.Attendance)
                .GroupBy(x => x.Enrollment.TraineeId)
                .Select(g => g.First())
                .Select(x => ToDto(x.Enrollment, x.Attendance, x.Performance, null))
                .ToList();
            var risk = stats.Where(x => x.IsAtRisk)
                .OrderBy(x => x.Attendance)
                .ThenBy(x => x.Performance)
                .GroupBy(x => x.Enrollment.TraineeId)
                .Select(g => g.First())
                .Where(x => !top.Any(t => t.TraineeId == x.Enrollment.TraineeId))
                .Select(x => ToDto(x.Enrollment, x.Attendance, x.Performance, x.RiskReason))
                .ToList();

            return new CompanyDashboardPeriodPerformanceDTO
            {
                TopPerformers = top,
                TopPerformersCount = top.Count,
                TopPerformersAveragePercent = top.Count > 0
                    ? Math.Round(top.Average(t => t.PerformancePercent), 1)
                    : 0,
                AtRiskTrainees = risk
            };
        }
    }
}
