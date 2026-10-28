using Nafadh_Backend.Models;

namespace Nafadh_Backend.Services
{
    public interface IUserGuideProgressService
    {
        // =========================
        // Trainee
        // =========================

        Task<IEnumerable<NFD_UserGuideProgress>> GetAllAsync(
            int userId);

        Task<NFD_UserGuideProgress?> GetByGuideAsync(
            int userId,
            string guideKey);

        Task<NFD_UserGuideProgress> SaveAsync(
            int userId,
            string guideKey,
            string status);

        // =========================
        // Trainer 
        // =========================

        Task<IEnumerable<NFD_UserGuideProgress>> GetTrainerAllAsync(
            int userId);

        Task<NFD_UserGuideProgress?> GetTrainerByGuideAsync(
            int userId,
            string guideKey);

        Task<NFD_UserGuideProgress> SaveTrainerAsync(
            int userId,
            string guideKey,
            string status);
    }
}