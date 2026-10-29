using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Nafadh_Backend.Services
{
    public class BatchService : IBatchService
    {
        private readonly IBatchRepository _repository;
        private readonly IEnrollmentRepository _enrollmentRepository;
        private readonly ICompanyProgramRepository _companyProgramRepository;
        private readonly Nafadhcontext _context;
        public BatchService(IBatchRepository repository, IEnrollmentRepository enrollmentRepository, ICompanyProgramRepository companyProgramRepository, Nafadhcontext context)
        {
            _repository = repository;
            _enrollmentRepository = enrollmentRepository;
            _companyProgramRepository = companyProgramRepository;
            _context = context;
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

            await PopulatePlanStatusesAsync(result);
            return result;
        }

        public async Task<BatchDto?> GetByIdAsync(int id)
        {
            var batch = await _repository.GetByIdAsync(id);
            if (batch == null) return null;

            int enrolledCount = batch.Enrollments?
                .Count(e => e.CompletionStatus == NFD_EnrollmentCompletionStatus.InProgress) ?? 0;

            var result = MapToDto(batch, enrolledCount);
            await PopulatePlanStatusesAsync(new List<BatchDto> { result });
            return result;
        }

        public async Task<BatchDto> CreateAsync(CreateBatchDto dto)
        {

            if (dto.ProgramId <= 0 || dto.EndDate.Date < dto.StartDate.Date)
                throw new InvalidOperationException("يجب تحديد برنامج صحيح ومدة تدريب صالحة.");

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

            // Persist the assignment and its in-app notifications in one transaction.
            await using var transaction = await _context.Database.BeginTransactionAsync();
            var created = await _repository.AddAsync(entity);
            if (created.CompanyId.HasValue)
                await NotifyCompanyAssignmentAsync(created, created.CompanyId.Value, cancelled: false);
            await transaction.CommitAsync();
            var savedBatch = await _repository.GetByIdAsync(created.BatchId);

            return MapToDto(savedBatch ?? created, 0);
        }

        

        public async Task<bool> UpdateAsync(int id, UpdateBatchDto dto)
        {
            var batch = await _repository.GetByIdAsync(id);
            if (batch == null) return false;

            if (dto.EndDate.Date < dto.StartDate.Date)
                throw new InvalidOperationException("مدة الدفعة غير صالحة.");

            var previousCompanyId = batch.CompanyId;
            var previousProgramId = batch.ProgramId;
            var assignmentChanged = previousCompanyId != dto.CompanyId ||
                                    (dto.ProgramId > 0 && dto.ProgramId != previousProgramId);
            var scheduleChanged = batch.StartDate.Date != dto.StartDate.Date ||
                                  batch.EndDate.Date != dto.EndDate.Date;

            // Updating one batch must not modify other batches sharing its program.
            // A pending/approved plan has already been submitted against its dates;
            // changing that schedule requires returning it for revision first.
            var batchPlan = await _context.NFD_CoursePlans
                .Include(p => p.Stages)
                .SingleOrDefaultAsync(p => p.BatchId == id);
            if (scheduleChanged && batchPlan is not null)
            {
                if (batchPlan.ApprovalStatus != NFD_CoursePlanApprovalStatus.Draft &&
                    batchPlan.ApprovalStatus != NFD_CoursePlanApprovalStatus.Rejected)
                    throw new InvalidOperationException(
                        "لا يمكن تغيير مدة دفعة لها خطة مقدمة أو معتمدة. أعد الخطة للمراجعة أولاً.");
                if (batchPlan.Stages.Any(s => s.StartDate.Date < dto.StartDate.Date ||
                                             s.EndDate.Date > dto.EndDate.Date))
                    throw new InvalidOperationException(
                        "مدة الدفعة الجديدة لا تشمل مراحل الخطة الحالية. صحح المراحل قبل تغيير المدة.");
                batchPlan.StartDate = dto.StartDate.Date;
                batchPlan.EndDate = dto.EndDate.Date;
                batchPlan.UpdatedAt = DateTime.Now;
            }

            // Do not orphan a company's existing plan or silently move it to another batch.
            if (assignmentChanged && previousCompanyId.HasValue &&
                await _context.NFD_CoursePlans.AsNoTracking().AnyAsync(p =>
                    p.BatchId == id || (p.BatchId == null &&
                    p.CompanyId == previousCompanyId.Value && p.ProgramId == previousProgramId)))
                throw new InvalidOperationException("لا يمكن نقل تكليف الدفعة أو برنامجها بعد إنشاء خطة. راجع الخطة أولاً.");

            if (!string.IsNullOrEmpty(dto.BatchName))
                batch.BatchName = dto.BatchName;

            if (dto.ProgramId > 0)
                batch.ProgramId = dto.ProgramId;

            batch.CompanyId = dto.CompanyId;

            batch.StartDate = dto.StartDate;
            batch.EndDate = dto.EndDate;
            batch.Capacity = dto.Capacity;
            batch.Status = dto.Status;

            await using var transaction = await _context.Database.BeginTransactionAsync();
            await _repository.UpdateAsync(batch);
            if (previousCompanyId.HasValue && previousCompanyId != batch.CompanyId)
                await NotifyCompanyAssignmentAsync(batch, previousCompanyId.Value, cancelled: true);
            if (batch.CompanyId.HasValue && (assignmentChanged || scheduleChanged))
                await NotifyCompanyAssignmentAsync(batch, batch.CompanyId.Value, cancelled: false,
                    updated: !assignmentChanged);
            await transaction.CommitAsync();
            return true;
        }

        // RelatedEntity = BatchAssignment:{batchId} allows Company to open the
        // specific Admin assignment directly from its own notifications.
        private async Task NotifyCompanyAssignmentAsync(NFD_Batch batch, int companyId,
            bool cancelled, bool updated = false)
        {
            var recipients = await _context.NFD_Companies.AsNoTracking()
                .Where(c => c.CompanyId == companyId && c.UserId.HasValue)
                .Select(c => c.UserId!.Value)
                .Concat(_context.NFD_CompanySupervisors.AsNoTracking()
                    .Where(s => s.CompanyId == companyId && s.Status == NFD_SupervisorStatus.Active)
                    .Select(s => s.UserId))
                .Distinct()
                .ToListAsync();
            if (recipients.Count == 0) return;

            var programTitle = await _context.NFD_Programs.AsNoTracking()
                .Where(p => p.ProgramId == batch.ProgramId)
                .Select(p => p.Title)
                .FirstOrDefaultAsync() ?? "برنامج تدريبي";
            var title = cancelled ? "إلغاء تكليف تدريب دفعة" :
                updated ? "تعديل موعد تكليف تدريبي" : "تكليف جديد بإعداد خطة تدريبية";
            var message = cancelled
                ? $"ألغت الإدارة إسناد الدفعة «{batch.BatchName}» إلى شركتكم."
                : $"أسندت الإدارة إلى شركتكم الدفعة «{batch.BatchName}» للبرنامج «{programTitle}» " +
                  $"من {batch.StartDate:yyyy/MM/dd} إلى {batch.EndDate:yyyy/MM/dd}. " +
                  "يرجى فتح التكليف وإعداد الخطة ومراحلها لإرسالها للاعتماد.";
            var now = DateTime.Now;
            foreach (var recipient in recipients)
                _context.NFD_Notifications.Add(new NFD_Notification
                {
                    UserId = recipient, Title = title, Message = message,
                    RelatedEntity = cancelled ? $"BatchCancelled:{batch.BatchId}" : $"BatchAssignment:{batch.BatchId}",
                    IsRead = false, CreatedAt = now
                });
            await _context.SaveChangesAsync();
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var batch = await _repository.GetByIdAsync(id);
            if (batch == null) return false;

            if (batch.Status == NFD_BatchStatus.Cancelled) return true;
            await using var transaction = await _context.Database.BeginTransactionAsync();
            batch.Status = NFD_BatchStatus.Cancelled;
            await _repository.UpdateAsync(batch);
            if (batch.CompanyId.HasValue)
                await NotifyCompanyAssignmentAsync(batch, batch.CompanyId.Value, cancelled: true);
            await transaction.CommitAsync();
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

                CoursePlanStatus = "لم تُرفع بعد",
                HasCoursePlan = false
            };
        }

        private async Task PopulatePlanStatusesAsync(List<BatchDto> batches)
        {
            var batchIds = batches.Where(b => b.CompanyId.HasValue)
                .Select(b => b.BatchId).ToList();
            if (batchIds.Count == 0) return;
            var plans = await _context.NFD_CoursePlans.AsNoTracking()
                .Where(p => p.BatchId.HasValue && batchIds.Contains(p.BatchId.Value))
                .Select(p => new { p.PlanId, p.BatchId, p.ProgramId, p.CompanyId, p.ApprovalStatus })
                .ToListAsync();
            foreach (var batch in batches.Where(b => b.CompanyId.HasValue))
            {
                var matches = plans.Where(p => p.BatchId == batch.BatchId &&
                    p.ProgramId == batch.ProgramId && p.CompanyId == batch.CompanyId).ToList();
                if (matches.Count == 0) continue;
                if (matches.Count > 1)
                {
                    batch.CoursePlanStatus = "الربط يحتاج مراجعة";
                    continue;
                }
                batch.HasCoursePlan = true;
                batch.CoursePlanId = matches[0].PlanId;
                batch.CoursePlanStatus = matches[0].ApprovalStatus switch
                {
                    NFD_CoursePlanApprovalStatus.Draft => "مسودة لدى الشركة",
                    NFD_CoursePlanApprovalStatus.PendingApproval => "بانتظار اعتماد الهيئة",
                    NFD_CoursePlanApprovalStatus.Approved => "معتمدة",
                    NFD_CoursePlanApprovalStatus.Rejected => "مرفوضة - تحتاج تعديل",
                    _ => "غير محددة"
                };
            }
        }

        public async Task<BatchProgressDto?> GetProgressAsync(int batchId)
        {
            return await _repository.GetProgressAsync(batchId);
        }
    }
}