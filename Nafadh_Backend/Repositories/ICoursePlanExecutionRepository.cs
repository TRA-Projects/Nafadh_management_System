using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    /// <summary>
    /// Data-access contract for execution actions on company course plans.
    /// Keeps trainer start/authorization queries out of the controller.
    /// </summary>
    public interface ICoursePlanExecutionRepository
    {
        Task<NFD_CoursePlan?> GetApprovedPlanForTrainerStartAsync(int planId, int trainerUserId);
        Task<bool> IsActiveTrainerUserAsync(int userId);
        Task<List<int>> GetCompanySupervisorUserIdsAsync(int companyId);
        void AddNote(NFD_CoursePlanNote note);
        void AddNotification(NFD_Notification notification);
        Task SaveChangesAsync();
    }
}
