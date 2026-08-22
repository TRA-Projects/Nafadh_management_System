using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class EnrollmentService : IEnrollmentService
    {
        private readonly IEnrollmentRepository _repository;

        public EnrollmentService(IEnrollmentRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<EnrollmentDTO>> GetAllEnrollmentsAsync(EnrollmentFilterDto filter)
        {
            var enrollments = await _repository.GetAllAsync(filter.BatchId, filter.TraineeId, filter.CompanyId, filter.Status);
            return enrollments.Select(MapToDto);
        }

        public async Task<EnrollmentDTO?> GetEnrollmentByIdAsync(int id)
        {
            var enrollment = await _repository.GetByIdAsync(id);
            return enrollment is null ? null : MapToDto(enrollment);
        }

        public async Task<(EnrollmentDTO? result, string? error)> CreateEnrollmentAsync(CreateEnrollmentDto dto)
        {
            if (!await _repository.BatchExistsAsync(dto.BatchId))
                return (null, $"Batch with ID {dto.BatchId} was not found.");

            if (!await _repository.TraineeExistsAsync(dto.TraineeId))
                return (null, $"Trainee with ID {dto.TraineeId} was not found.");

            if (!await _repository.CompanyExistsAsync(dto.CompanyId))
                return (null, $"Company with ID {dto.CompanyId} was not found.");

            if (dto.DepartmentId.HasValue && !await _repository.DepartmentExistsAsync(dto.DepartmentId.Value))
                return (null, $"Department with ID {dto.DepartmentId} was not found.");

            if (dto.SupervisorId.HasValue && !await _repository.SupervisorExistsAsync(dto.SupervisorId.Value))
                return (null, $"Supervisor with ID {dto.SupervisorId} was not found.");

            var enrollment = new NFD_Enrollment
            {
                BatchId = dto.BatchId,
                TraineeId = dto.TraineeId,
                CompanyId = dto.CompanyId,
                DepartmentId = dto.DepartmentId,
                SupervisorId = dto.SupervisorId,
                EnrollmentDate = DateTime.UtcNow,
                CompletionStatus = NFD_EnrollmentCompletionStatus.InProgress
            };

            var created = await _repository.AddAsync(enrollment);
            var full = await _repository.GetByIdAsync(created.EnrollmentId);
            return (MapToDto(full!), null);
        }

        public async Task<(EnrollmentDTO? result, string? error)> UpdateAssignmentAsync(int id, UpdateEnrollmentAssignmentDto dto)
        {
            var enrollment = await _repository.GetByIdForTrackingAsync(id);
            if (enrollment is null)
                return (null, "not_found");

            if (dto.DepartmentId.HasValue && !await _repository.DepartmentExistsAsync(dto.DepartmentId.Value))
                return (null, $"Department with ID {dto.DepartmentId} was not found.");

            if (dto.SupervisorId.HasValue && !await _repository.SupervisorExistsAsync(dto.SupervisorId.Value))
                return (null, $"Supervisor with ID {dto.SupervisorId} was not found.");

            enrollment.DepartmentId = dto.DepartmentId;
            enrollment.SupervisorId = dto.SupervisorId;

            await _repository.UpdateAsync(enrollment);

            var full = await _repository.GetByIdAsync(id);
            return (MapToDto(full!), null);
        }

        public async Task<(EnrollmentDTO? result, string? error)> UpdateStatusAsync(int id, UpdateEnrollmentStatusDto dto)
        {
            var enrollment = await _repository.GetByIdAsync(id);
            if (enrollment is null)
                return (null, "not_found");

            enrollment.CompletionStatus = dto.CompletionStatus;
            await _repository.UpdateAsync(enrollment);

            var full = await _repository.GetByIdAsync(id);
            return (MapToDto(full!), null);
        }

        public async Task<bool> WithdrawEnrollmentAsync(int id)
        {
            var enrollment = await _repository.GetByIdAsync(id);
            if (enrollment is null) return false;

            enrollment.CompletionStatus = NFD_EnrollmentCompletionStatus.Dropped;
            await _repository.UpdateAsync(enrollment);
            return true;
        }

        public async Task<IEnumerable<EnrollmentDTO>> GetByTraineeIdAsync(int traineeId)
        {
            var enrollments = await _repository.GetByTraineeIdAsync(traineeId);
            return enrollments.Select(MapToDto);
        }

        public async Task<IEnumerable<EnrollmentDTO>> GetByCompanyIdAsync(int companyId)
        {
            var enrollments = await _repository.GetByCompanyIdAsync(companyId);
            return enrollments.Select(MapToDto);
        }

        public async Task<ProgressSummaryDto?> GetProgressSummaryAsync(int enrollmentId)
        {
            var data = await _repository.GetProgressDataAsync(enrollmentId);
            if (data is null) return null;

            var (totalModules, completedModules) = data.Value;
            var percentage = totalModules == 0 ? 0 : Math.Round((double)completedModules / totalModules * 100, 1);

            return new ProgressSummaryDto
            {
                EnrollmentId = enrollmentId,
                TotalModules = totalModules,
                CompletedModules = completedModules,
                ProgressPercentage = percentage
            };
        }

        private static EnrollmentDTO MapToDto(NFD_Enrollment e)
        {
            return new EnrollmentDTO
            {
                EnrollmentId = e.EnrollmentId,
                EnrollmentDate = e.EnrollmentDate,
                CompletionStatus = e.CompletionStatus.ToString(),
                BatchId = e.BatchId,
                BatchName = e.Batch.BatchName,
                TraineeId = e.TraineeId,
                TraineeName = e.Trainee.User.FullName,
                CompanyId = e.CompanyId,
                CompanyName = e.Company.CompanyName,
                DepartmentId = e.DepartmentId,
                DepartmentName = e.Department?.Name,
                SupervisorId = e.SupervisorId,
                SupervisorName = e.CompanySupervisor?.User.FullName,
                TraineeGitHubUrl = e.Trainee.GitHubUrl,
                TraineeLinkedInUrl = e.Trainee.LinkedInUrl, // ربط اللينكد إن هنا
                ProgramTitle = e.Batch.Program?.Title,
                ProgramDescription = e.Batch.Program?.Description,
                TrackName = e.Batch.Program?.Track?.Name
            };
        }
    }
}