using Microsoft.AspNetCore.Http;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;
using Microsoft.EntityFrameworkCore;

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

        // Excuses for a Sunday-Saturday calendar week close at Sunday 00:00 Oman time.
        private static readonly TimeZoneInfo OmanTimeZone = ResolveOmanTimeZone();

        private static TimeZoneInfo ResolveOmanTimeZone()
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Muscat"); }
            catch (TimeZoneNotFoundException) { return TimeZoneInfo.FindSystemTimeZoneById("Arabian Standard Time"); }
        }

        private static DateTime OmanToday() => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, OmanTimeZone).Date;

        private static bool IsWithinExcuseWindow(DateTime attendanceDate)
        {
            var today = OmanToday();
            var date = attendanceDate.Date;
            if (date > today) return false;
            // The deadline belongs to the attendance date's week, NOT today's workweek.
            // For a Thursday absence, Friday and Saturday remain available.
            // At Sunday 00:00 (Oman local time), the previous week's window closes.
            var weekStart = date.AddDays(-(int)date.DayOfWeek); // Sunday 00:00
            var nextSunday = weekStart.AddDays(7);
            return today >= weekStart && today < nextSunday;
        }

        private static void RequireExcuseWindow(NFD_TrainerAttendance record)
        {
            if (record.Status == NFD_TrainerAttendanceStatus.Present)
                throw new InvalidOperationException("Reasons and proofs are only allowed for Late, Absent, or EarlyLeave.");
            if (!IsWithinExcuseWindow(record.Date))
                throw new InvalidOperationException("The excuse submission period for this week has ended.");
            if (record.ExcuseReviewStatus == "Approved" || record.ExcuseReviewStatus == "Rejected")
                throw new InvalidOperationException("The supervisor has already reviewed this excuse; it is read-only.");
        }

        private readonly ITrainerAttendanceRepository _repository;
        private readonly IConfiguration _configuration;
        private readonly Nafadhcontext _context;

        public TrainerAttendanceService(
       ITrainerAttendanceRepository repository,
       IConfiguration configuration,
       Nafadhcontext context)
        {
            _repository = repository;
            _configuration = configuration;
            _context = context;
        }
        public async Task<int?> GetTrainerIdByUserIdAsync(int userId)
        {
            return await _context.NFD_Trainers
                .AsNoTracking()
                .Where(t => t.UserId == userId)
                .Select(t => (int?)t.TrainerId)
                .FirstOrDefaultAsync();
        }
        public async Task<List<TrainerAttendanceDto>> GetMyAttendanceAsync(int trainerId)
        {
            var records = await _repository.GetByTrainerIdAsync(trainerId);

            return records.Select(record => new TrainerAttendanceDto
            {
                TrainerAttendanceId = record.TrainerAttendanceId,
                CompanyId = record.CompanyId,
                TrainerId = record.TrainerId,
                TrainerName = null,
                Date = record.Date,
                Status = record.Status,
                CheckInTime = record.CheckInTime,
                CheckOutTime = record.CheckOutTime,
                Reason = record.Reason,
                ExcuseProofUrl = record.ExcuseProofUrl,
                IsConfirmed = record.IsConfirmed,
                ExcuseReviewStatus = record.ExcuseReviewStatus,
                ExcuseReviewedByUserId = record.ExcuseReviewedByUserId,
                ExcuseReviewedAtUtc = record.ExcuseReviewedAtUtc
            }).ToList();
        }

        public async Task<List<CompanyTrainerDto>> GetCompanyTrainersAsync(int companyId, DateTime date)
        {
            var trainers = await _repository.GetCompanyTrainersAsync(companyId, date);

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


        public async Task<List<AdminTrainerAttendanceDto>> GetAdminRangeAsync(
            DateTime from,
            DateTime to,
            int? trainerId,
            int? companyId)
        {
            from = from.Date;
            to = to.Date;

            if (from > to)
                throw new ArgumentException(
                    "'from' must be on or before 'to'.");

            if ((to - from).TotalDays > 366)
                throw new ArgumentException(
                    "The date range cannot exceed one year.");

            var records = await _repository.GetAdminRangeAsync(
                from,
                to,
                trainerId,
                companyId);

            return records.Select(a => new AdminTrainerAttendanceDto
            {
                TrainerAttendanceId = a.TrainerAttendanceId,
                TrainerId = a.TrainerId,
                TrainerName = a.Trainer?.User?.FullName,

                CompanyId = a.CompanyId,
                CompanyName = a.Company?.CompanyName,

                Date = a.Date,
                Status = a.Status,

                CheckInTime = a.CheckInTime,
                CheckOutTime = a.CheckOutTime,

                Reason = a.Reason,
                ExcuseProofUrl = a.ExcuseProofUrl,
                IsConfirmed = a.IsConfirmed,
                ExcuseReviewStatus = a.ExcuseReviewStatus,
                ExcuseReviewedByUserId = a.ExcuseReviewedByUserId,
                ExcuseReviewedAtUtc = a.ExcuseReviewedAtUtc
            }).ToList();
        }


        public async Task<TrainerAttendanceDto> UpsertAsync(TrainerAttendanceUpsertDto dto)
        {
            var date = dto.Date.Date;

            if (date > OmanToday())
                throw new ArgumentException("Attendance cannot be recorded for a future date.");

            if (!Enum.IsDefined(typeof(NFD_TrainerAttendanceStatus), dto.Status))
                throw new ArgumentException("Invalid attendance status.");

            if (!await _repository.TrainerBelongsToCompanyAsync(dto.CompanyId, dto.TrainerId, date))
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
                {
                    throw new InvalidOperationException("Confirmed attendance cannot be edited by the supervisor.");
                }

                record.UpdatedAt = DateTime.UtcNow;
            }

            if (record.Reason != null || record.ExcuseProofUrl != null)
            {
                if (record.Status != dto.Status)
                    throw new InvalidOperationException("Attendance status cannot change after a trainer submitted an excuse.");
            }
            record.Status = dto.Status;
            // Supervisor changes attendance status and times only; trainer-owned excuse stays untouched.
            // Never overwrite Reason, ExcuseProofUrl, or the review decision here.
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

            RequireExcuseWindow(record);

            if (file == null || file.Length == 0)
                throw new ArgumentException("Proof file is required.");

            var maxSizeSetting = await _context.SystemVariables
    .AsNoTracking()
    .Where(x => x.VariableKey == "ATTACHMENT_MAX_SIZE_MB")
    .Select(x => x.Value)
    .FirstOrDefaultAsync();

            if (!int.TryParse(maxSizeSetting, out int maxSizeMB) || maxSizeMB <= 0)
                throw new InvalidOperationException(
                    "ATTACHMENT_MAX_SIZE_MB is not configured correctly.");

            if (file.Length > (long)maxSizeMB * 1024 * 1024)
                throw new ArgumentException(
                    $"Proof file cannot exceed {maxSizeMB} MB.");

            var allowedExtensionsSetting = await _context.SystemVariables
     .AsNoTracking()
     .Where(x => x.VariableKey == "ATTACHMENT_ALLOWED_EXTENSIONS")
     .Select(x => x.Value)
     .FirstOrDefaultAsync();

            if (string.IsNullOrWhiteSpace(allowedExtensionsSetting))
                throw new InvalidOperationException(
                    "ATTACHMENT_ALLOWED_EXTENSIONS is not configured correctly.");

            var allowedExtensions = allowedExtensionsSetting
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(x => "." + x.Trim().TrimStart('.').ToLowerInvariant())
                .ToHashSet();

            // إثباتات الأعذار تقبل الصور وPDF فقط
            var proofExtensions = new HashSet<string>
{
    ".jpg", ".jpeg", ".png", ".webp", ".pdf"
};

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(extension) ||
                !proofExtensions.Contains(extension))
            {
                throw new ArgumentException(
                    "Only JPG, PNG, WEBP and PDF files are allowed.");
            }

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
            // The notification is only for the FIRST non-empty excuse submission.
            // Later edits / re-uploads must not create another notification.
            var hadExcuseBeforeUpload = !string.IsNullOrWhiteSpace(record.Reason) ||
                !string.IsNullOrWhiteSpace(record.ExcuseProofUrl);
            var oldUrl = record.ExcuseProofUrl;

            await using (var stream = new FileStream(fullPath, FileMode.CreateNew))
            {
                await file.CopyToAsync(stream);
            }

            var url = $"{requestPath}/{fileName}";
            record.ExcuseProofUrl = url;
            record.ExcuseReviewStatus = "Pending";
            record.UpdatedAt = DateTime.UtcNow;

            try
            {
                if (!hadExcuseBeforeUpload)
                    await TrainerExcuseNotificationWriter.QueueFirstSubmissionAsync(_context, record);
                // Persist proof and notification in the same DbContext save.
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

            RequireExcuseWindow(record);

            var oldUrl = record.ExcuseProofUrl;
            record.ExcuseProofUrl = null;
            record.ExcuseReviewStatus = string.IsNullOrWhiteSpace(record.Reason) ? null : "Pending";
            record.UpdatedAt = DateTime.UtcNow;
            await _repository.SaveChangesAsync();

            var storagePath = _configuration["Storage:TrainerAttendanceProofsPath"];
            if (!string.IsNullOrWhiteSpace(storagePath))
                DeletePhysicalFile(storagePath, oldUrl);

            return true;
        }

        /// <summary>Check trainer's identity; never trust an attendance ID alone.</summary>
        public async Task<bool> TrainerOwnsAttendanceAsync(int attendanceId, int trainerId)
        {
            var record = await _repository.GetByIdAsync(attendanceId);
            return record != null && record.TrainerId == trainerId;
        }
        public async Task<bool> IsExcuseWindowOpenAsync(int attendanceId, int trainerId)
        {
            var record = await _repository.GetByIdAsync(attendanceId);

            if (record == null || record.TrainerId != trainerId)
                return false;

            try
            {
                RequireExcuseWindow(record);
                return true;
            }
            catch (InvalidOperationException)
            {
                return false;
            }
        }
        public async Task<TrainerAttendanceDto?> SubmitExcuseAsync(int attendanceId, int trainerId, string? reason)
        {
            var record = await _repository.GetByIdAsync(attendanceId);
            if (record == null || record.TrainerId != trainerId) return null;
            RequireExcuseWindow(record);
            if (reason?.Length > 500)
                throw new ArgumentException("Reason cannot exceed 500 characters.");
            var hadExcuseBeforeSubmission = !string.IsNullOrWhiteSpace(record.Reason) ||
                !string.IsNullOrWhiteSpace(record.ExcuseProofUrl);
            record.Reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
            record.ExcuseReviewStatus = string.IsNullOrWhiteSpace(record.Reason) &&
                string.IsNullOrWhiteSpace(record.ExcuseProofUrl) ? null : "Pending";
            record.UpdatedAt = DateTime.UtcNow;
            if (!hadExcuseBeforeSubmission && !string.IsNullOrWhiteSpace(record.Reason))
                await TrainerExcuseNotificationWriter.QueueFirstSubmissionAsync(_context, record);
            // Persist reason and notification together.
            await _repository.SaveChangesAsync();
            return ToDto(record);
        }

        public async Task<TrainerAttendanceDto?> ReviewExcuseAsync(int attendanceId, int companyId, string decision, int reviewerUserId)
        {
            if (decision != "Approved" && decision != "Rejected")
                throw new ArgumentException("Invalid review decision.");
            var record = await _repository.GetByIdAsync(attendanceId);
            if (record == null || record.CompanyId != companyId) return null;
            if (record.Status == NFD_TrainerAttendanceStatus.Present ||
                (string.IsNullOrWhiteSpace(record.Reason) && string.IsNullOrWhiteSpace(record.ExcuseProofUrl)))
                throw new InvalidOperationException("No trainer excuse exists for review.");
            if (record.ExcuseReviewStatus == "Approved" || record.ExcuseReviewStatus == "Rejected")
                throw new InvalidOperationException("This excuse has already been reviewed.");
            if (reviewerUserId <= 0) throw new ArgumentException("Reviewer identity is required.");
            record.ExcuseReviewStatus = decision;
            record.ExcuseReviewedByUserId = reviewerUserId;
            record.ExcuseReviewedAtUtc = DateTime.UtcNow;
            record.UpdatedAt = DateTime.UtcNow;
            await _repository.SaveChangesAsync();
            return ToDto(record);
        }

        public async Task<int> ConfirmDayAsync(TrainerAttendanceConfirmDto dto)
        {
            var date = dto.Date.Date;

            if (date > OmanToday())
                throw new ArgumentException("A future day cannot be confirmed.");

            var trainers = await _repository.GetCompanyTrainersAsync(dto.CompanyId, date);
            if (trainers.Count == 0)
                throw new ArgumentException("The company has no trainers to confirm.");

            var day = await _repository.GetDayAsync(dto.CompanyId, date);

            var missing = trainers.Count(t => day.All(r => r.TrainerId != t.TrainerId));
            if (missing > 0)
                throw new ArgumentException($"Record attendance for all trainers before confirming ({missing} missing).");

            // UAT: time is mandatory before confirmation for Late and EarlyLeave.
            // Validate on the server as well as in the Company Portal to prevent API bypass.
            if (day.Any(r => r.Status == NFD_TrainerAttendanceStatus.Late && !r.CheckInTime.HasValue))
                throw new ArgumentException("Arrival time is required for late attendance before confirmation.");

            if (day.Any(r => r.Status == NFD_TrainerAttendanceStatus.EarlyLeave && !r.CheckOutTime.HasValue))
                throw new ArgumentException("Departure time is required for early leave before confirmation.");

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
            IsConfirmed = a.IsConfirmed,
            ExcuseReviewStatus = a.ExcuseReviewStatus,
                ExcuseReviewedByUserId = a.ExcuseReviewedByUserId,
                ExcuseReviewedAtUtc = a.ExcuseReviewedAtUtc
        };
    }
}