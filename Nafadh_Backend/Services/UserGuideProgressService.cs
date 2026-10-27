using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class UserGuideProgressService : IUserGuideProgressService
    {
        private readonly IUserGuideProgressRepository _repository;
        private readonly Nafadhcontext _context;

        public UserGuideProgressService(
            IUserGuideProgressRepository repository,
            Nafadhcontext context)
        {
            _repository = repository;
            _context = context;
        }

        // =========================
        // Trainee - 
        // =========================

        // Find the trainee linked to the authenticated user.
        private async Task<int> GetTraineeIdAsync(int userId)
        {
            var traineeId = await _context.NFD_Trainees
                .Where(t => t.UserId == userId)
                .Select(t => (int?)t.TraineeId)
                .FirstOrDefaultAsync();

            if (traineeId == null)
            {
                throw new KeyNotFoundException(
                    "Trainee profile was not found.");
            }

            return traineeId.Value;
        }

        // Get all guide progress records for the current trainee.
        public async Task<IEnumerable<NFD_UserGuideProgress>> GetAllAsync(
            int userId)
        {
            var traineeId = await GetTraineeIdAsync(userId);

            return await _repository.GetByTraineeIdAsync(traineeId);
        }

        // Get progress for one trainee guide.
        public async Task<NFD_UserGuideProgress?> GetByGuideAsync(
            int userId,
            string guideKey)
        {
            if (string.IsNullOrWhiteSpace(guideKey))
            {
                throw new ArgumentException("Guide key is required.");
            }

            var traineeId = await GetTraineeIdAsync(userId);

            return await _repository.GetByTraineeAndGuideAsync(
                traineeId, guideKey.Trim());
        }

        // Create or update trainee progress.
        public async Task<NFD_UserGuideProgress> SaveAsync(
            int userId,
            string guideKey,
            string status)
        {
            if (string.IsNullOrWhiteSpace(guideKey) ||
                guideKey.Trim().Length > 100)
            {
                throw new ArgumentException(
                    "Guide key must be between 1 and 100 characters.");
            }

            if (status != "Completed" && status != "Skipped")
            {
                throw new ArgumentException(
                    "Status must be Completed or Skipped.");
            }

            var traineeId = await GetTraineeIdAsync(userId);
            guideKey = guideKey.Trim();

            var progress = await _repository.GetByTraineeAndGuideAsync(
                traineeId, guideKey);

            if (progress == null)
            {
                progress = new NFD_UserGuideProgress
                {
                    TraineeId = traineeId,
                    GuideKey = guideKey,
                    Status = status,
                    UpdatedAt = DateTime.UtcNow
                };

                return await _repository.CreateAsync(progress);
            }

            progress.Status = status;
            progress.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(progress);
            return progress;
        }

        // =========================
        // Trainer -
        // =========================

        // Find the trainer linked to the authenticated user.
        private async Task<int> GetTrainerIdAsync(int userId)
        {
            var trainerId = await _context.NFD_Trainers
                .Where(t => t.UserId == userId)
                .Select(t => (int?)t.TrainerId)
                .FirstOrDefaultAsync();

            if (trainerId == null)
            {
                throw new KeyNotFoundException(
                    "Trainer profile was not found.");
            }

            return trainerId.Value;
        }

        // Get all guide progress records for the current trainer.
        public async Task<IEnumerable<NFD_UserGuideProgress>> GetTrainerAllAsync(
            int userId)
        {
            var trainerId = await GetTrainerIdAsync(userId);

            return await _repository.GetByTrainerIdAsync(trainerId);
        }

        // Get progress for one trainer guide.
        public async Task<NFD_UserGuideProgress?> GetTrainerByGuideAsync(
            int userId,
            string guideKey)
        {
            if (string.IsNullOrWhiteSpace(guideKey) ||
                guideKey.Trim().Length > 100)
            {
                throw new ArgumentException(
                    "Guide key must be between 1 and 100 characters.");
            }

            var trainerId = await GetTrainerIdAsync(userId);

            return await _repository.GetByTrainerAndGuideAsync(
                trainerId, guideKey.Trim());
        }

        // Create or update trainer progress.
        public async Task<NFD_UserGuideProgress> SaveTrainerAsync(
            int userId,
            string guideKey,
            string status)
        {
            if (string.IsNullOrWhiteSpace(guideKey) ||
                guideKey.Trim().Length > 100)
            {
                throw new ArgumentException(
                    "Guide key must be between 1 and 100 characters.");
            }

            if (status != "Completed" && status != "Skipped")
            {
                throw new ArgumentException(
                    "Status must be Completed or Skipped.");
            }

            var trainerId = await GetTrainerIdAsync(userId);
            guideKey = guideKey.Trim();

            var progress = await _repository.GetByTrainerAndGuideAsync(
                trainerId, guideKey);

            if (progress == null)
            {
                progress = new NFD_UserGuideProgress
                {
                    TrainerId = trainerId,
                    TraineeId = null,
                    GuideKey = guideKey,
                    Status = status,
                    UpdatedAt = DateTime.UtcNow
                };

                return await _repository.CreateAsync(progress);
            }

            progress.Status = status;
            progress.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(progress);
            return progress;
        }
    }
}