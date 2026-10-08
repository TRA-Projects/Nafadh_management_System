using Microsoft.AspNetCore.Http;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    // Error contract used by TrainerAttendanceController:
    //   ArgumentException         -> 400 (invalid input)
    //   InvalidOperationException -> 409 (the day is already confirmed)
    //   IOException               -> 500 (storage problem)
    public class TrainerAttendanceService : ITrainerAttendanceService
    {
        private const long MaxProofSize = 5 * 1024 * 1024;

        private static readonly HashSet<string> AllowedExtensions = new() { ".jpg", ".jpeg", ".png", ".webp", ".pdf" };
        private static readonly HashSet<string> AllowedContentTypes = new() { "image/jpeg", "image/png", "image/webp", "application/pdf" };

        private readonly ITrainerAttendanceRepository _repository;
        private readonly IConfiguration _configuration;

        public TrainerAttendanceService(ITrainerAttendanceRepository repository, IConfiguration configuration)
        {
            _repository = repository;
            _configuration = configuration;
        }

        public async Task<List<CompanyTrainerDto>> GetCompanyTrainersAsync(int companyId)
        {
            var trainers = await _repository.GetCompanyTrainersAsync(companyId);

            return trainers.Select(t => new CompanyTrainerDto
            {
                TrainerId = t.TrainerId,
                FullName = t.User?.FullName,
                Specialty = t.Specialty,
                ProfileImageUrl = t.ProfileImageUrl,
                Status = t.Status
            }).ToList();
        }

        public async Task<List<TrainerAttendanceDto>> GetRangeAsync(int companyId, DateTime from, DateTime to, int? trainerId)
        {
            from = from.Date;
            to = to.Date;

            if (from > to)
                throw new ArgumentException("'from' must be on or before 'to'.");

            if ((to - from).TotalDays > 366)
                throw new ArgumentException("The date range cannot exceed one year.");

            var items = await _repository.GetRangeAsync(companyId, from, to, trainerId);
            return items.Select(ToDto).ToList();
        }

        public async Task<TrainerAttendanceDto> UpsertAsync(TrainerAttendanceUpsertDto dto)
        {
            var date = dto.Date.Date;

            if (date > DateTime.Today)
                throw new ArgumentException("Attendance cannot be recorded for a future date.");

            if (!Enum.IsDefined(typeof(NFD_TrainerAttendanceStatus), dto.Status))
                throw new ArgumentException("Invalid attendance status.");

            if (!await _repository.TrainerBelongsToCompanyAsync(dto.CompanyId, dto.TrainerId))
                throw new ArgumentException("This trainer is not linked to the company.");

            var record = await _repository.GetAsync(dto.CompanyId, dto.TrainerId, date);

            if (record == null)
            {
                record = new NFD_TrainerAttendance
                {
                    CompanyId = dto.CompanyId,
                    TrainerId = dto.TrainerId,
                    Date = date,
                    CreatedAt = DateTime.UtcNow
                };
                await _repository.AddAsync(record);
            }
            else
            {
                if (record.IsConfirmed)
                    throw new InvalidOperationException("This day is already confirmed and cannot be edited.");

                record.UpdatedAt = DateTime.UtcNow;
            }

            record.Status = dto.Status;
            record.Reason = string.IsNullOrWhiteSpace(dto.Reason) ? null : dto.Reason.Trim();

            // An absent trainer has no arrival / departure time.
            var isAbsent = dto.Status == NFD_TrainerAttendanceStatus.Absent;
            record.CheckInTime = isAbsent ? null : dto.CheckInTime;
            record.CheckOutTime = isAbsent ? null : dto.CheckOutTime;

            await _repository.SaveChangesAsync();

            // Reload so the response includes the trainer name.
            var saved = await _repository.GetAsync(dto.CompanyId, dto.TrainerId, date);
            return ToDto(saved!);
        }

        public async Task<string?> UploadProofAsync(int attendanceId, IFormFile file)
        {
            var record = await _repository.GetByIdAsync(attendanceId);
            if (record == null) return null;

            if (record.IsConfirmed)
                throw new InvalidOperationException("This day is already confirmed and cannot be edited.");

            if (file == null || file.Length == 0)
                throw new ArgumentException("Proof file is required.");

            if (file.Length > MaxProofSize)
                throw new ArgumentException("Proof file cannot exceed 5 MB.");

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension))
                throw new ArgumentException("Only JPG, PNG, WEBP and PDF files are allowed.");

            if (!AllowedContentTypes.Contains(file.ContentType.ToLowerInvariant()))
                throw new ArgumentException("Invalid file type.");

            var storagePath = _configuration["Storage:TrainerAttendanceProofsPath"];
            if (string.IsNullOrWhiteSpace(storagePath))
                throw new IOException("Trainer attendance proof storage path is not configured.");

            Directory.CreateDirectory(storagePath);

            var requestPath = (_configuration["Storage:TrainerAttendanceProofsRequestPath"]
                               ?? "/uploads/trainer-attendance-proofs").TrimEnd('/');

            var fileName = $"attendance-{record.TrainerAttendanceId}-{Guid.NewGuid():N}{extension}";
            var fullPath = Path.Combine(storagePath, fileName);
            var oldUrl = record.ExcuseProofUrl;

            await using (var stream = new FileStream(fullPath, FileMode.CreateNew))
            {
                await file.CopyToAsync(stream);
            }

            var url = $"{requestPath}/{fileName}";
            record.ExcuseProofUrl = url;
            record.UpdatedAt = DateTime.UtcNow;

            try
            {
                await _repository.SaveChangesAsync();
            }
            catch
            {
                // Do not leave an orphan file when the database save fails.
                if (File.Exists(fullPath)) File.Delete(fullPath);
                record.ExcuseProofUrl = oldUrl;
                throw;
            }

            DeletePhysicalFile(storagePath, oldUrl);
            return url;
        }

        public async Task<bool> RemoveProofAsync(int attendanceId)
        {
            var record = await _repository.GetByIdAsync(attendanceId);
            if (record == null) return false;

            if (record.IsConfirmed)
                throw new InvalidOperationException("This day is already confirmed and cannot be edited.");

            var oldUrl = record.ExcuseProofUrl;
            record.ExcuseProofUrl = null;
            record.UpdatedAt = DateTime.UtcNow;
            await _repository.SaveChangesAsync();

            var storagePath = _configuration["Storage:TrainerAttendanceProofsPath"];
            if (!string.IsNullOrWhiteSpace(storagePath))
                DeletePhysicalFile(storagePath, oldUrl);

            return true;
        }

        public async Task<int> ConfirmDayAsync(TrainerAttendanceConfirmDto dto)
        {
            var date = dto.Date.Date;

            if (date > DateTime.Today)
                throw new ArgumentException("A future day cannot be confirmed.");

            var trainers = await _repository.GetCompanyTrainersAsync(dto.CompanyId);
            if (trainers.Count == 0)
                throw new ArgumentException("The company has no trainers to confirm.");

            var day = await _repository.GetDayAsync(dto.CompanyId, date);

            var missing = trainers.Count(t => day.All(r => r.TrainerId != t.TrainerId));
            if (missing > 0)
                throw new ArgumentException($"Record attendance for all trainers before confirming ({missing} missing).");

            var now = DateTime.UtcNow;
            foreach (var record in day.Where(r => !r.IsConfirmed))
            {
                record.IsConfirmed = true;
                record.ConfirmedAt = now;
            }

            await _repository.SaveChangesAsync();
            return day.Count;
        }

        private static void DeletePhysicalFile(string storagePath, string? url)
        {
            if (string.IsNullOrWhiteSpace(url)) return;

            var name = Path.GetFileName(url);
            if (string.IsNullOrWhiteSpace(name)) return;

            var fullPath = Path.Combine(storagePath, name);
            if (File.Exists(fullPath)) File.Delete(fullPath);
        }

        private static TrainerAttendanceDto ToDto(NFD_TrainerAttendance a) => new()
        {
            TrainerAttendanceId = a.TrainerAttendanceId,
            CompanyId = a.CompanyId,
            TrainerId = a.TrainerId,
            TrainerName = a.Trainer?.User?.FullName,
            Date = a.Date,
            Status = a.Status,
            CheckInTime = a.CheckInTime,
            CheckOutTime = a.CheckOutTime,
            Reason = a.Reason,
            ExcuseProofUrl = a.ExcuseProofUrl,
            IsConfirmed = a.IsConfirmed
        };
    }
}