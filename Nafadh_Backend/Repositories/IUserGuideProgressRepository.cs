using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IUserGuideProgressRepository
    {
        Task<IEnumerable<NFD_UserGuideProgress>> GetByTraineeIdAsync(int traineeId);

        Task<NFD_UserGuideProgress?> GetByTraineeAndGuideAsync(
            int traineeId,
            string guideKey);

        Task<NFD_UserGuideProgress> CreateAsync(
            NFD_UserGuideProgress progress);

        Task UpdateAsync(NFD_UserGuideProgress progress);
    }
}
