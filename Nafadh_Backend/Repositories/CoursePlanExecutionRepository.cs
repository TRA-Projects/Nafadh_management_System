using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    /// <summary>
    /// Repository for trainer-driven course-plan execution actions.
    /// </summary>
    public sealed class CoursePlanExecutionRepository : ICoursePlanExecutionRepository
    {
        private readonly Nafadhcontext _context;

        public CoursePlanExecutionRepository(Nafadhcontext context)
        {
            _context = context;
        }

        public Task<NFD_CoursePlan?> GetApprovedPlanForTrainerStartAsync(int planId, int trainerUserId)
        {
            return _context.NFD_CoursePlans
                .Include(p => p.Company)
                .Include(p => p.CreatedByUser)
                .Include(p => p.Trainers)
                    .ThenInclude(pt => pt.Trainer)
                .Include(p => p.Stages)
                    .ThenInclude(s => s.Trainers)
                        .ThenInclude(st => st.Trainer)
                .Include(p => p.Stages)
                    .ThenInclude(s => s.Trainer)
                .Include(p => p.Stages)
                    .ThenInclude(s => s.Items)
                        .ThenInclude(i => i.Trainer)
                .Include(p => p.Notes)
                    .ThenInclude(n => n.User)
                .AsSplitQuery()
                .FirstOrDefaultAsync(p =>
                    p.PlanId == planId &&
                    p.ApprovalStatus == Enums.NFD_CoursePlanApprovalStatus.Approved &&
                    p.Trainers.Any(pt => pt.Trainer.UserId == trainerUserId) ||
                    p.Stages.Any(s =>
                        (s.Trainer != null && s.Trainer.UserId == trainerUserId) ||
                        s.Trainers.Any(st => st.Trainer.UserId == trainerUserId) ||
                        s.Items.Any(i => i.Trainer != null && i.Trainer.UserId == trainerUserId)));
        }

        public Task<bool> IsActiveTrainerUserAsync(int userId)
        {
            return _context.NFD_Trainers
                .AsNoTracking()
                .AnyAsync(t => t.UserId == userId && t.Status == Enums.NFD_TrainerStatus.Active);
        }

        public Task<List<int>> GetCompanySupervisorUserIdsAsync(int companyId)
        {
            return _context.NFD_CompanySupervisors
                .AsNoTracking()
                .Where(s => s.CompanyId == companyId)
                .Select(s => s.UserId)
                .ToListAsync();
        }

        public void AddNote(NFD_CoursePlanNote note) => _context.NFD_CoursePlanNotes.Add(note);

        public void AddNotification(NFD_Notification notification) => _context.NFD_Notifications.Add(notification);

        public async Task SaveChangesAsync() => await _context.SaveChangesAsync();
    }
}
