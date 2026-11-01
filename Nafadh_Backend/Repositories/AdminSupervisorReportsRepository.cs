
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Interfaces;
using Nafadh_Backend.Models;



namespace Nafadh_Backend.Repositories
{
    public class AdminSupervisorReportsRepository
        : IAdminSupervisorReportsRepository
    {
        private readonly Nafadhcontext _context;

        public AdminSupervisorReportsRepository(Nafadhcontext context)
        {
            _context = context;
        }

        public async Task<List<AdminSupervisorReportDto>>
            GetSupervisorReportsAsync(
                DateTime monthStart,
                DateTime nextMonthStart)
        {
            var supervisors = await _context
                .Set<NFD_CompanySupervisor>()
                .AsNoTracking()
                .Select(s => new
                {
                    s.SupervisorId,
                    FullName = s.User.FullName,
                    s.Department,
                    s.Position,
                    CompanyName = s.Company.CompanyName,
                    s.Status,
                    s.UserId
                })
                .ToListAsync();

            var supervisorIds = supervisors
                .Select(s => s.SupervisorId)
                .ToList();

            var enrollments = await _context
                .Set<NFD_Enrollment>()
                .AsNoTracking()
                .Where(e =>
                    e.SupervisorId.HasValue &&
                    supervisorIds.Contains(e.SupervisorId.Value))
                .Select(e => new
                {
                    e.EnrollmentId,
                    e.SupervisorId,
                    e.TraineeId
                })
                .ToListAsync();

            var enrollmentIds = enrollments
                .Select(e => e.EnrollmentId)
                .ToList();

            var attendance = await _context
                .Set<NFD_DailyAttendance>()
                .AsNoTracking()
                .Where(a => enrollmentIds.Contains(a.EnrollmentId))
                .Select(a => new
                {
                    a.EnrollmentId,
                    a.Status
                })
                .ToListAsync();

            var evaluations = await _context
                .Set<NFD_Evaluation>()
                .AsNoTracking()
                .Where(e =>
                    e.EnrollmentId.HasValue &&
                    enrollmentIds.Contains(e.EnrollmentId.Value) &&
                    e.Period == NFD_EvaluationPeriod.Monthly &&
                    e.EvaluationDate >= monthStart &&
                    e.EvaluationDate < nextMonthStart)
                .Select(e => new
                {
                    e.EnrollmentId
                    
                })
                .ToListAsync();

            var trainerEvaluations = await _context
    .Set<NFD_Evaluation>()
    .AsNoTracking()
    .Where(e =>
        e.TrainerId.HasValue &&
        e.EvaluationTemplate.Type ==
            NFD_EvaluationType.TrainerPerformance &&
        e.EvaluationDate >= monthStart &&
        e.EvaluationDate < nextMonthStart)
    .Select(e => new
    {
        e.EvaluatorUserId,
        e.TrainerId,
        e.EvaluationDate
    })
    .ToListAsync();


            var pendingWarnings = await _context
                .Set<NFD_Warning>()
                .AsNoTracking()
                .Where(w =>
                    w.Scope == NFD_WarningScope.Trainee &&
                    w.EnrollmentId.HasValue &&
                    enrollmentIds.Contains(w.EnrollmentId.Value) &&
                    w.Status != NFD_WarningStatus.Resolved)
                .Select(w => w.EnrollmentId)
                .ToListAsync();



            return supervisors.Select(s =>
            {
                var assigned = enrollments
                    .Where(e => e.SupervisorId == s.SupervisorId)
                    .ToList();

                var assignedIds = assigned
                    .Select(e => e.EnrollmentId)
                    .ToHashSet();

                var records = attendance
                    .Where(a => assignedIds.Contains(a.EnrollmentId))
                    .Where(a => a.Status != NFD_AttendanceStatus.Excused)
                    .ToList();

                decimal? attendanceRate = records.Count == 0
                    ? null
                    : Math.Round(
                        100m * records.Count(a =>
                            a.Status == NFD_AttendanceStatus.Present ||
                            a.Status == NFD_AttendanceStatus.Late)
                        / records.Count,
                        2);


                var monthlyEvaluations = evaluations.Count(e =>
                    e.EnrollmentId.HasValue &&
                    assignedIds.Contains(e.EnrollmentId.Value));

                var completedTrainerEvaluations = trainerEvaluations
    .Where(e => e.EvaluatorUserId == s.UserId)
    .ToList();

                var trainerEvaluationsCount =
                    completedTrainerEvaluations.Count;

                var evaluatedTrainersCount = completedTrainerEvaluations
                    .Where(e => e.TrainerId.HasValue)
                    .Select(e => e.TrainerId!.Value)
                    .Distinct()
                    .Count();

                DateTime? lastTrainerEvaluationDate =
                    completedTrainerEvaluations.Count > 0
                        ? completedTrainerEvaluations.Max(e => e.EvaluationDate)
                        : null;


                var traineesNeedingFollowUp = assigned
                    .Where(e => pendingWarnings.Contains(e.EnrollmentId))
                    .Select(e => e.TraineeId)
                    .Distinct()
                    .Count();

                



                return new AdminSupervisorReportDto
                {
                    SupervisorId = s.SupervisorId,
                    FullName = s.FullName,
                    Department = s.Department,
                    Position = s.Position,
                    CompanyName = s.CompanyName,
                    Status = s.Status.ToString(),
                    NeedsFollowUp = null,
                    AssignedTraineesCount = assigned
                        .Select(e => e.TraineeId)
                        .Distinct()
                        .Count(),
                    AverageAttendanceRate = attendanceRate,
                    MonthlyEvaluationsCount = monthlyEvaluations,
                    TraineesNeedingFollowUpCount = traineesNeedingFollowUp
                };
            }).ToList();

        }
    }
}
