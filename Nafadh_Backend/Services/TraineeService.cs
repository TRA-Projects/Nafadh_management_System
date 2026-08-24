using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;
using Nafadh_Backend.Enums;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Nafadh_Backend.Services
{
    public class TraineeService : ITraineeService
    {
        private readonly ITraineeRepository _repository;
        private readonly IConfiguration _configuration;

        public TraineeService(
            ITraineeRepository repository,
            IConfiguration configuration
        )
        {
            _repository = repository;
            _configuration = configuration;
        }
        public Task<(List<NFD_Trainee> Items, int TotalCount)> GetAllAsync(
            int? companyId, NFD_TraineeStatus? status, string? university, string? searchTerm,
            int pageNumber, int pageSize)
        {
            return _repository.GetAllAsync(companyId, status, university, searchTerm, pageNumber, pageSize);
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
            IFormFile file
        )
        {
            // ---------------------------------------------
            // Find trainee
            // ---------------------------------------------

            var trainee =
                await _repository.GetByIdAsync(
                    traineeId
                );

            if (trainee == null)
            {
                return null;
            }


            // ---------------------------------------------
            // Validate uploaded file
            // ---------------------------------------------

            if (
                file == null ||
                file.Length == 0
            )
            {
                throw new ArgumentException(
                    "Profile image is required."
                );
            }


            // Maximum allowed size: 5 MB
            const long maxFileSize =
                5 * 1024 * 1024;

            if (file.Length > maxFileSize)
            {
                throw new ArgumentException(
                    "Profile image cannot exceed 5 MB."
                );
            }


            // ---------------------------------------------
            // Validate file extension
            // ---------------------------------------------

            var extension =
                Path.GetExtension(
                    file.FileName
                )
                .ToLowerInvariant();

            var allowedExtensions =
    new HashSet<string>
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    };

            if (
                !allowedExtensions.Contains(
                    extension
                )
            )
            {
                throw new ArgumentException(
                    "Only JPG, JPEG, PNG and WEBP images are allowed."
                );
            }


            // ---------------------------------------------
            // Validate content type
            // ---------------------------------------------

            var allowedContentTypes =
                new HashSet<string>
                {
            "image/jpeg",
            "image/png",
            "image/webp"
                };

            if (
                !allowedContentTypes.Contains(
                    file.ContentType.ToLowerInvariant()
                )
            )
            {
                throw new ArgumentException(
                    "Invalid image type."
                );
            }


            // ---------------------------------------------
            // Get physical storage folder
            // ---------------------------------------------

            var storagePath =
                _configuration[
                    "Storage:TraineeProfileImagesPath"
                ];

            if (
                string.IsNullOrWhiteSpace(
                    storagePath
                )
            )
            {
                throw new InvalidOperationException(
                    "Trainee profile image storage path is not configured."
                );
            }

            Directory.CreateDirectory(
                storagePath
            );


            // ---------------------------------------------
            // Get public request path
            // ---------------------------------------------

            var requestPath =
                _configuration[
                    "Storage:TraineeProfileImagesRequestPath"
                ]
                ?? "/uploads/trainee-profiles";

            requestPath =
                requestPath.TrimEnd('/');


            // ---------------------------------------------
            // Generate unique filename
            // ---------------------------------------------

            var fileName =
                $"trainee-{traineeId}-{Guid.NewGuid():N}{extension}";

            var fullPath =
                Path.Combine(
                    storagePath,
                    fileName
                );

            var oldProfileImageUrl =
                trainee.ProfileImageUrl;


            // ---------------------------------------------
            // Save new physical image
            // ---------------------------------------------

            await using (
                var stream =
                    new FileStream(
                        fullPath,
                        FileMode.CreateNew
                    )
            )
            {
                await file.CopyToAsync(
                    stream
                );
            }


            // ---------------------------------------------
            // Build public URL
            // ---------------------------------------------

            var profileImageUrl =
                $"{requestPath}/{fileName}";

            trainee.ProfileImageUrl =
                profileImageUrl;

            _repository.Update(
                trainee
            );


            // ---------------------------------------------
            // Save database changes safely
            // ---------------------------------------------

            bool saved;

            try
            {
                saved =
                    await _repository.SaveChangesAsync();
            }
            catch
            {
                if (File.Exists(fullPath))
                {
                    File.Delete(fullPath);
                }

                trainee.ProfileImageUrl =
                    oldProfileImageUrl;

                throw;
            }


            if (!saved)
            {
                if (File.Exists(fullPath))
                {
                    File.Delete(fullPath);
                }

                trainee.ProfileImageUrl =
                    oldProfileImageUrl;

                throw new InvalidOperationException(
                    "Could not save trainee profile image."
                );
            }


            // ---------------------------------------------
            // Delete previous profile image
            // ---------------------------------------------

            if (
                !string.IsNullOrWhiteSpace(
                    oldProfileImageUrl
                )
            )
            {
                var oldFileName =
                    Path.GetFileName(
                        oldProfileImageUrl
                    );

                if (
                    !string.IsNullOrWhiteSpace(
                        oldFileName
                    )
                )
                {
                    var oldFullPath =
                        Path.Combine(
                            storagePath,
                            oldFileName
                        );

                    if (File.Exists(oldFullPath))
                    {
                        File.Delete(oldFullPath);
                    }
                }
            }


            return profileImageUrl;
        }

        public Task<bool> SaveChangesAsync()
        {
            return _repository.SaveChangesAsync();
        }

        public async Task<NFD_Trainee?> GetTraineeIdByUserID(int userId)
        {
            return await _repository.GetTraineeIdByUserID(userId);
        }
    }
}