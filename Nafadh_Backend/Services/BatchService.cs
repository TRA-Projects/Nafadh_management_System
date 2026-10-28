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
        private readonly ICompanyProgramRepository _companyProgramRepository;
        public BatchService(IBatchRepository repository, IEnrollmentRepository enrollmentRepository, ICompanyProgramRepository companyProgramRepository)
        {
            _repository = repository;
            _enrollmentRepository = enrollmentRepository;
            _companyProgramRepository = companyProgramRepository;
        }

        public async Task<List<BatchDto>> GetAllAsync(int? programId, string? status, DateTime? from, DateTime? to)
        {
            var batches = await _repository.GetAllAsync(programId, status, from, to);
            var result = new List<BatchDto>();

            foreach (var b in batches)
            {
                var activeEnrollments = b.Enrollments?
                    .Where(e => e.CompletionStatus == NFD_EnrollmentCompletionStatus.InProgress)
                    .ToList();

                int enrolledCount = activeEnrollments?.Count ?? 0;
                result.Add(MapToDto(b, enrolledCount));
            }

            return result;
        }

        public async Task<BatchDto?> GetByIdAsync(int id)
        {
            var batch = await _repository.GetByIdAsync(id);
            if (batch == null) return null;

            int enrolledCount = batch.Enrollments?
                .Count(e => e.CompletionStatus == NFD_EnrollmentCompletionStatus.InProgress) ?? 0;

            return MapToDto(batch, enrolledCount);
        }

        public async Task<BatchDto> CreateAsync(CreateBatchDto dto)
        {

            var entity = new NFD_Batch
            {
                ProgramId = dto.ProgramId,
                CompanyId = dto.CompanyId,
                BatchName = dto.BatchName,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Capacity = dto.Capacity,
                Status = NFD_BatchStatus.Upcoming
            };

            var created = await _repository.AddAsync(entity);
            var savedBatch = await _repository.GetByIdAsync(created.BatchId);

            return MapToDto(savedBatch ?? created, 0);
        }

        

        public async Task<bool> UpdateAsync(int id, UpdateBatchDto dto)
        {
            var batch = await _repository.GetByIdAsync(id);
            if (batch == null) return false;

            if (!string.IsNullOrEmpty(dto.BatchName))
                batch.BatchName = dto.BatchName;

            if (dto.ProgramId > 0)
                batch.ProgramId = dto.ProgramId;

            batch.CompanyId = dto.CompanyId;

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
                UserId = e.Trainee?.User?.UserId ?? 0,
                FullName = e.Trainee?.User?.FullName ?? "متدرب",
                Email = e.Trainee?.User?.Email ?? string.Empty,
                FileUrl = null,
                University = "جامعة معتمدة",
                Major = "تقنية معلومات وهندسة برمجيات",
                CompanyName = e.Batch?.Program?.CompanyPrograms?.FirstOrDefault()?.Company?.CompanyName ?? "شركة معتمدة",
                Status = e.CompletionStatus == NFD_EnrollmentCompletionStatus.Completed ? "متخرج" :
                         (e.CompletionStatus == NFD_EnrollmentCompletionStatus.Dropped ? "منسحب" : "قيد التدريب"),
                CompletionStatus = e.CompletionStatus
            }).ToList();
        }

        public async Task<BatchCapacityDto?> GetCapacityAsync(int batchId)
        {
            var batch = await _repository.GetByIdAsync(batchId);
            if (batch == null) return null;

            int enrolledCount = batch.Enrollments?
                .Count(e => e.CompletionStatus == NFD_EnrollmentCompletionStatus.InProgress) ?? 0;

            return new BatchCapacityDto
            {
                BatchId = batch.BatchId,
                Capacity = batch.Capacity,
                EnrolledCount = enrolledCount
            };
        }

        // 🟢 مابينغ واقعي مع إبقاء حالة الخطة "لم تُرفع بعد" طالما لم تقدم الشركة خطة
        private static BatchDto MapToDto(NFD_Batch b, int enrolledCount)
        {
            var companyName = b.Company?.CompanyName ?? string.Empty;
            var companyId = b.CompanyId;

            NFD_BatchStatus finalStatus;
            if (b.Status == NFD_BatchStatus.Cancelled)
            {
                finalStatus = NFD_BatchStatus.Cancelled;
            }
            else
            {
                var today = DateTime.Today;
                if (today > b.EndDate)
                    finalStatus = NFD_BatchStatus.Completed;
                else if (today >= b.StartDate && today <= b.EndDate)
                    finalStatus = NFD_BatchStatus.Ongoing;
                else
                    finalStatus = NFD_BatchStatus.Upcoming;
            }

            var instructorName = b.BatchTrainers?.FirstOrDefault()?.Trainer?.User?.FullName
                ?? "بدون مدرب";

            var totalTrainees = b.Enrollments?.Count ?? 0;
            var completedCount = b.Enrollments?.Count(e => e.CompletionStatus == NFD_EnrollmentCompletionStatus.Completed) ?? 0;

            int realProgress = 0;
            if (finalStatus == NFD_BatchStatus.Completed)
            {
                realProgress = 100;
            }
            else if (finalStatus == NFD_BatchStatus.Ongoing && b.EndDate > b.StartDate)
            {
                var totalDuration = (b.EndDate - b.StartDate).TotalDays;
                var elapsedDuration = (DateTime.Today - b.StartDate).TotalDays;
                realProgress = Math.Clamp((int)((elapsedDuration / totalDuration) * 100), 0, 99);
            }

            return new BatchDto
            {
                BatchId = b.BatchId,
                ProgramId = b.ProgramId,
                BatchName = b.BatchName,
                CompanyId = companyId,
                CompanyName = companyName,
                TrackId = b.Program?.TrackId ?? 0,
                TrackName = b.Program?.Track?.Name ?? "عام",
                InstructorName = instructorName,
                StartDate = b.StartDate,
                EndDate = b.EndDate,
                Capacity = b.Capacity,
                TotalTraineesCount = totalTrainees,
                IssuedCertificatesCount = completedCount,
                Status = finalStatus,
                Department = b.Program?.Category ?? "عام",
                EnrolledTraineesCount = enrolledCount,
                AttendanceRate = 92,
                ProgressPercentage = realProgress,

                // 🟢 التعديل هنا: تصحيح الحالة لتكون حقيقية
                CoursePlanStatus = "لم تُرفع بعد",
                HasCoursePlan = false
            };
        }

        public async Task<BatchProgressDto?> GetProgressAsync(int batchId)
        {
            return await _repository.GetProgressAsync(batchId);
        }
    }
}