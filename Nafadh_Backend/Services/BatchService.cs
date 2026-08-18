using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class BatchService : IBatchService
    {
        private readonly IBatchRepository _repository;
        private readonly IEnrollmentRepository _enrollmentRepository;

        public BatchService(IBatchRepository repository, IEnrollmentRepository enrollmentRepository)
        {
            _repository = repository;
            _enrollmentRepository = enrollmentRepository;
        }

        public async Task<List<BatchDto>> GetAllAsync(int? programId, string? status, DateTime? from, DateTime? to)
        {
            var batches = await _repository.GetAllAsync(programId, status, from, to);
            return batches.Select(MapToDto).ToList();
        }

        public async Task<BatchDto?> GetByIdAsync(int id)
        {
            var batch = await _repository.GetByIdAsync(id);
            return batch == null ? null : MapToDto(batch);
        }

        public async Task<BatchDto> CreateAsync(CreateBatchDto dto)
        {
            var entity = new NFD_Batch
            {
                ProgramId = dto.ProgramId,
                BatchName = dto.BatchName,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Capacity = dto.Capacity,
                Status = NFD_BatchStatus.Upcoming
            };

            var created = await _repository.AddAsync(entity);
            return MapToDto(created);
        }

        public async Task<bool> UpdateAsync(int id, UpdateBatchDto dto)
        {
            var batch = await _repository.GetByIdAsync(id);
            if (batch == null) return false;

            batch.StartDate = dto.StartDate;
            batch.EndDate = dto.EndDate;
            batch.Capacity = dto.Capacity;
            batch.Status = dto.Status;

            await _repository.UpdateAsync(batch);
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var batch = await _repository.GetByIdAsync(id);
            if (batch == null) return false;

            // Soft-cancel instead of hard delete (keeps FK-linked sessions/tasks intact)
            batch.Status = NFD_BatchStatus.Cancelled;
            await _repository.UpdateAsync(batch);
            return true;
        }

        public async Task<List<BatchTraineeDto>> GetTraineesAsync(int batchId)
        {
            var enrollments = await _enrollmentRepository.GetAllAsync(batchId, null, null, null);
            return enrollments.Select(e => new BatchTraineeDto
            {
                TraineeId = e.TraineeId,
                FullName = e.Trainee?.User?.FullName ?? string.Empty,
                CompletionStatus = e.CompletionStatus
            }).ToList();
        }

        public async Task<BatchCapacityDto?> GetCapacityAsync(int batchId)
        {
            var batch = await _repository.GetByIdAsync(batchId);
            if (batch == null) return null;

            var activeEnrollments = await _enrollmentRepository.GetAllAsync(
                batchId, null, null, NFD_EnrollmentCompletionStatus.InProgress);

            int enrolledCount = activeEnrollments.Count();

            return new BatchCapacityDto
            {
                BatchId = batch.BatchId,
                Capacity = batch.Capacity,
                EnrolledCount = enrolledCount
            };
        }

        private static BatchDto MapToDto(NFD_Batch b) => new BatchDto
        {
            BatchId = b.BatchId,
            ProgramId = b.ProgramId,
            BatchName = b.BatchName,
            CompanyName = "عامة",
            TrackName = b.Program?.Title ?? "عام",
            StartDate = b.StartDate,
            EndDate = b.EndDate,
            Capacity = b.Capacity,
            TotalTraineesCount = b.Enrollments?.Count ?? 0,
            IssuedCertificatesCount = b.Enrollments?.Count(e => e.CompletionStatus == NFD_EnrollmentCompletionStatus.Completed) ?? 0,
            Status = b.Status
        };
    }
}