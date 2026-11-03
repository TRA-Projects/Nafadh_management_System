
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace Nafadh_Backend.Services
{
    public class TraineeService : ITraineeService
    {
        private readonly ITraineeRepository _repository;
        private readonly IConfiguration _configuration;
        private readonly Nafadhcontext _context;

        public TraineeService(
            ITraineeRepository repository,
            IConfiguration configuration,
            Nafadhcontext context)
        {
            _repository = repository;
            _configuration = configuration;
            _context = context;
        }

        public Task<(List<NFD_Trainee> Items, int TotalCount)> GetAllAsync(
            int? companyId,
            NFD_TraineeStatus? status,
            string? university,
            string? searchTerm,
            int pageNumber,
            int pageSize)
        {
            return _repository.GetAllAsync(
                companyId,
                status,
                university,
                searchTerm,
                pageNumber,
                pageSize);
        }

        public Task<NFD_Trainee?> GetByIdAsync(int id)
        {
            return _repository.GetByIdAsync(id);
        }

        public Task<NFD_Trainee?> GetByIdWithDashboardDataAsync(int id)
        {
            return _repository.GetByIdWithDashboardDataAsync(id);
        }

        public Task<bool> UserHasTraineeProfileAsync(int userId)
        {
            return _repository.UserHasTraineeProfileAsync(userId);
        }

        public Task<bool> CompanyExistsAsync(int companyId)
        {
            return _repository.CompanyExistsAsync(companyId);
        }

        public Task<List<NFD_Trainee>> GetPendingVerificationAsync()
        {
            return _repository.GetPendingVerificationAsync();
        }

        public Task AddAsync(NFD_Trainee trainee)
        {
            return _repository.AddAsync(trainee);
        }

        public Task AddRangeAsync(IEnumerable<NFD_Trainee> trainees)
        {
            return _repository.AddRangeAsync(trainees);
        }

        public void Update(NFD_Trainee trainee)
        {
            _repository.Update(trainee);
        }

        // =====================================================
        // UPLOAD TRAINEE PROFILE IMAGE
        // =====================================================

        public async Task<string?> UploadProfileImageAsync(
            int traineeId,
            IFormFile file)
        {
            // Find trainee
            var trainee = await _repository.GetByIdAsync(traineeId);

            if (trainee == null)
            {
                return null;
            }

            // Validate file
            if (file == null || file.Length == 0)
            {
                throw new ArgumentException(
                    "Profile image is required.");
            }

            // Profile image limit remains 5 MB
            const long maxFileSize = 5 * 1024 * 1024;

            if (file.Length > maxFileSize)
            {
                throw new ArgumentException(
                    "Profile image cannot exceed 5 MB.");
            }

            // Validate extension
            var extension = Path.GetExtension(file.FileName)
                .ToLowerInvariant();

            var allowedExtensions = new HashSet<string>
            {
                ".jpg",
                ".jpeg",
                ".png",
                ".webp"
            };

            if (!allowedExtensions.Contains(extension))
            {
                throw new ArgumentException(
                    "Only JPG, JPEG, PNG and WEBP images are allowed.");
            }

            // Validate content type
            var allowedContentTypes = new HashSet<string>
            {
                "image/jpeg",
                "image/png",
                "image/webp"
            };

            if (!allowedContentTypes.Contains(
                file.ContentType.ToLowerInvariant()))
            {
                throw new ArgumentException(
                    "Invalid image type.");
            }

            // Storage folder
            var storagePath = _configuration[
                "Storage:TraineeProfileImagesPath"];

            if (string.IsNullOrWhiteSpace(storagePath))
            {
                throw new InvalidOperationException(
                    "Trainee profile image storage path is not configured.");
            }

            Directory.CreateDirectory(storagePath);

            // Public request path
            var requestPath = _configuration[
                "Storage:TraineeProfileImagesRequestPath"]
                ?? "/uploads/trainee-profiles";

            requestPath = requestPath.TrimEnd('/');

            // Unique filename
            var fileName =
                $"trainee-{traineeId}-{Guid.NewGuid():N}{extension}";

            var fullPath = Path.Combine(storagePath, fileName);

            var oldProfileImageUrl = trainee.ProfileImageUrl;

            // Save new file
            await using (var stream = new FileStream(
                fullPath,
                FileMode.CreateNew))
            {
                await file.CopyToAsync(stream);
            }

            // Build URL
            var profileImageUrl = $"{requestPath}/{fileName}";

            trainee.ProfileImageUrl = profileImageUrl;

            _repository.Update(trainee);

            // Save database
            bool saved;

            try
            {
                saved = await _repository.SaveChangesAsync();
            }
            catch
            {
                if (File.Exists(fullPath))
                {
                    File.Delete(fullPath);
                }

                trainee.ProfileImageUrl = oldProfileImageUrl;

                throw;
            }

            if (!saved)
            {
                if (File.Exists(fullPath))
                {
                    File.Delete(fullPath);
                }

                trainee.ProfileImageUrl = oldProfileImageUrl;

                throw new InvalidOperationException(
                    "Could not save trainee profile image.");
            }

            // Delete previous image
            if (!string.IsNullOrWhiteSpace(oldProfileImageUrl))
            {
                var oldFileName =
                    Path.GetFileName(oldProfileImageUrl);

                if (!string.IsNullOrWhiteSpace(oldFileName))
                {
                    var oldFullPath =
                        Path.Combine(storagePath, oldFileName);

                    if (File.Exists(oldFullPath))
                    {
                        File.Delete(oldFullPath);
                    }
                }
            }

            return profileImageUrl;
        }

        // =====================================================
        // UPLOAD TRAINEE CV
        // =====================================================

        public async Task<string?> UploadResumeAsync(
            int traineeId,
            IFormFile file)
        {
            // Validate file first
            if (file == null || file.Length == 0)
            {
                throw new ArgumentException(
                    "CV file is required.");
            }

            // Read attachment size from database
            var setting = await _context.SystemVariables
                .AsNoTracking()
                .FirstOrDefaultAsync(v =>
                    v.VariableKey == "ATTACHMENT_MAX_SIZE_MB");

            if (setting == null ||
                !int.TryParse(setting.Value, out int maxSizeMB) ||
                maxSizeMB <= 0)
            {
                throw new InvalidOperationException(
                    "Attachment size setting is missing or invalid.");
            }

            long maxFileSize = (long)maxSizeMB * 1024 * 1024;

            if (file.Length > maxFileSize)
            {
                throw new ArgumentException(
                    $"CV file cannot exceed {maxSizeMB} MB.");
            }

            // Validate CV extension
            var extension = Path.GetExtension(file.FileName)
                .ToLowerInvariant();

            var allowedCvExtensions = new HashSet<string>
            {
                ".pdf",
                ".doc",
                ".docx"
            };

            if (!allowedCvExtensions.Contains(extension))
            {
                throw new ArgumentException(
                    "Only PDF, DOC and DOCX files are allowed for CV.");
            }

            // Find trainee after validation
            var trainee = await _repository.GetByIdAsync(traineeId);

            if (trainee == null)
            {
                return null;
            }

            // CV storage folder
            var uploadsFolder = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                "uploads",
                "cv");

            Directory.CreateDirectory(uploadsFolder);

            // Generate unique filename
            var fileName =
                $"trainee-{traineeId}-{Guid.NewGuid():N}{extension}";

            var filePath = Path.Combine(
                uploadsFolder,
                fileName);

            // Save new CV
            await using (var stream = new FileStream(
                filePath,
                FileMode.CreateNew))
            {
                await file.CopyToAsync(stream);
            }

            // Build public URL
            var resumeUrl = "/uploads/cv/" + fileName;

            // Keep old CV URL
            var oldResumeUrl = trainee.ResumeUrl;

            // Update database
            trainee.ResumeUrl = resumeUrl;

            _repository.Update(trainee);

            try
            {
                var saved =
                    await _repository.SaveChangesAsync();

                if (!saved)
                {
                    throw new InvalidOperationException(
                        "Could not save trainee CV.");
                }
            }
            catch
            {
                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                }

                trainee.ResumeUrl = oldResumeUrl;

                throw;
            }

            // Delete previous CV
            if (!string.IsNullOrWhiteSpace(oldResumeUrl))
            {
                var oldFileName =
                    Path.GetFileName(oldResumeUrl);

                if (!string.IsNullOrWhiteSpace(oldFileName))
                {
                    var oldFilePath =
                        Path.Combine(uploadsFolder, oldFileName);

                    if (File.Exists(oldFilePath))
                    {
                        File.Delete(oldFilePath);
                    }
                }
            }

            return resumeUrl;
        }

        // =====================================================
        // SAVE CHANGES
        // =====================================================

        public Task<bool> SaveChangesAsync()
        {
            return _repository.SaveChangesAsync();
        }

        // =====================================================
        // GET TRAINEE BY USER ID
        // =====================================================

        public async Task<NFD_Trainee?> GetTraineeIdByUserID(
            int userId)
        {
            return await _repository.GetTraineeIdByUserID(userId);
        }
    }
}
