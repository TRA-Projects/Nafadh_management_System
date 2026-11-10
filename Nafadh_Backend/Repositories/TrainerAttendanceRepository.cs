using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.Repositories
{
    public class TrainerAttendanceRepository : ITrainerAttendanceRepository
    {
        private readonly Nafadhcontext _context;

        public TrainerAttendanceRepository(Nafadhcontext context)
        {
            _context = context;
        }

        // Only trainers teaching an ongoing company batch, plan or stage are eligible
        // for attendance on the requested day. CompanyId is authoritative when set;
        // a NULL legacy CompanyId may be resolved from a company-specific assignment.
        // Historical attendance records are queried independently by GetRangeAsync.
        private IQueryable<NFD_Trainer> EligibleForAttendance(int companyId, DateTime date)
        {
            var day = date.Date;
            var nextDay = day.AddDays(1);

            var ongoingBatchIds = _context.NFD_Batches
                .Where(b => b.Status == NFD_BatchStatus.Ongoing &&
                            b.StartDate < nextDay && b.EndDate >= day &&
                            (b.CompanyId == companyId ||
                             (b.CompanyId == null && _context.NFD_Enrollments
                                  .Any(e => e.BatchId == b.BatchId && e.CompanyId == companyId))))
                .Select(b => b.BatchId);

            var ongoingPlans = _context.NFD_CoursePlans
                .Where(p => p.CompanyId == companyId &&
                            p.ApprovalStatus == NFD_CoursePlanApprovalStatus.Approved &&
                            p.ExecutionStatus == NFD_CoursePlanExecutionStatus.InProgress &&
                            p.StartDate < nextDay && p.EndDate >= day);

            var assignedToOngoingPlan = _context.NFD_CoursePlanTrainers
                .Where(a => ongoingPlans.Any(p => p.PlanId == a.PlanId))
                .Select(a => a.TrainerId);

            var assignedToOngoingStage = _context.NFD_CoursePlanStageTrainers
                .Where(a => a.Stage.Status == NFD_CoursePlanProgressStatus.InProgress &&
                            a.Stage.StartDate < nextDay && a.Stage.EndDate >= day &&
                            ongoingPlans.Any(p => p.PlanId == a.Stage.PlanId))
                .Select(a => a.TrainerId);

            var assignedLegacyStage = _context.NFD_CoursePlanStages
                .Where(st => st.TrainerId.HasValue &&
                             st.Status == NFD_CoursePlanProgressStatus.InProgress &&
                             st.StartDate < nextDay && st.EndDate >= day &&
                             ongoingPlans.Any(p => p.PlanId == st.PlanId))
                .Select(st => st.TrainerId!.Value);

            // Require an actual assignment, not mere company membership.
            return _context.NFD_Trainers.Where(t =>
                t.Status == NFD_TrainerStatus.Active &&
                (t.CompanyId == companyId || t.CompanyId == null) &&
                (t.BatchTrainers.Any(bt => ongoingBatchIds.Contains(bt.BatchId)) ||
                 assignedToOngoingPlan.Contains(t.TrainerId) ||
                 assignedToOngoingStage.Contains(t.TrainerId) ||
                 assignedLegacyStage.Contains(t.TrainerId)));
        }

        public async Task<List<NFD_Trainer>> GetCompanyTrainersAsync(int companyId, DateTime date)
        {
            return await EligibleForAttendance(companyId, date)
                .Include(t => t.User)
                .OrderBy(t => t.TrainerId)
                .ToListAsync();
        }

        public async Task<bool> TrainerBelongsToCompanyAsync(int companyId, int trainerId, DateTime date)
        {
            return await EligibleForAttendance(companyId, date).AnyAsync(t => t.TrainerId == trainerId);
        }

        public async Task<List<NFD_TrainerAttendance>> GetRangeAsync(int companyId, DateTime from, DateTime to, int? trainerId)
        {
            var query = _context.Set<NFD_TrainerAttendance>()
                .Include(a => a.Trainer).ThenInclude(t => t.User)
                .Where(a => a.CompanyId == companyId && a.Date >= from && a.Date <= to);

            if (trainerId.HasValue)
                query = query.Where(a => a.TrainerId == trainerId.Value);

            return await query
                .OrderBy(a => a.Date)
                .ThenBy(a => a.TrainerId)
                .ToListAsync();
        }


        public async Task<List<NFD_TrainerAttendance>> GetAdminRangeAsync(
            DateTime from,
            DateTime to,
            int? trainerId,
            int? companyId)
        {
            var query = _context.Set<NFD_TrainerAttendance>()
                .AsNoTracking()
                .Include(a => a.Trainer)
                    .ThenInclude(t => t.User)
                .Include(a => a.Company)
                .Where(a => a.Date >= from && a.Date <= to);

            if (trainerId.HasValue)
                query = query.Where(a => a.TrainerId == trainerId.Value);

            if (companyId.HasValue)
                query = query.Where(a => a.CompanyId == companyId.Value);

            return await query
                .OrderByDescending(a => a.Date)
                .ThenBy(a => a.TrainerId)
                .ToListAsync();
        }


        public async Task<List<NFD_TrainerAttendance>> GetDayAsync(int companyId, DateTime date)
        {
            return await _context.Set<NFD_TrainerAttendance>()
                .Where(a => a.CompanyId == companyId && a.Date == date)
                .ToListAsync();
        }

        public async Task<NFD_TrainerAttendance?> GetAsync(int companyId, int trainerId, DateTime date)
        {
            return await _context.Set<NFD_TrainerAttendance>()
                .Include(a => a.Trainer).ThenInclude(t => t.User)
                .FirstOrDefaultAsync(a => a.CompanyId == companyId && a.TrainerId == trainerId && a.Date == date);
        }

        public async Task<NFD_TrainerAttendance?> GetByIdAsync(int id)
        {
            return await _context.Set<NFD_TrainerAttendance>()
                .Include(a => a.Trainer).ThenInclude(t => t.User)
                .FirstOrDefaultAsync(a => a.TrainerAttendanceId == id);
        }
        public async Task<List<NFD_TrainerAttendance>> GetByTrainerIdAsync(int trainerId)
        {
            return await _context.Set<NFD_TrainerAttendance>()
                .AsNoTracking()
                .Include(a => a.Trainer)
                    .ThenInclude(t => t.User)
                .Where(a => a.TrainerId == trainerId)
                .OrderByDescending(a => a.Date)
                .ThenByDescending(a => a.TrainerAttendanceId)
                .ToListAsync();
        }
        public async Task AddAsync(NFD_TrainerAttendance attendance)
        {
            await _context.Set<NFD_TrainerAttendance>().AddAsync(attendance);
        }

        public async Task<bool> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync() > 0;
        }
    }
}