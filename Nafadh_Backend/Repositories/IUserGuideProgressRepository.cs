using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IUserGuideProgressRepository
    {
        // =========================
        // Trainee 
        // =========================

        Task<IEnumerable<NFD_UserGuideProgress>> GetByTraineeIdAsync(
            int traineeId);

        Task<NFD_UserGuideProgress?> GetByTraineeAndGuideAsync(
            int traineeId,
            string guideKey);

        // =========================
        // Trainer 
        // =========================

        Task<IEnumerable<NFD_UserGuideProgress>> GetByTrainerIdAsync(
            int trainerId);

        Task<NFD_UserGuideProgress?> GetByTrainerAndGuideAsync(
            int trainerId,
            string guideKey);

        // =========================
        // Shared 
        // =========================

        Task<NFD_UserGuideProgress> CreateAsync(
            NFD_UserGuideProgress progress);

        Task UpdateAsync(NFD_UserGuideProgress progress);
    }
}