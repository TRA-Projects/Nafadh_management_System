using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Services
{
    public interface IQuizProctoringService
    {
        Task<ProctoringEventDto> AddEventAsync(int attemptId, CreateProctoringEventDto dto);
        Task<AttemptProctoringReportDto> GetAttemptReportAsync(int attemptId);
        Task<List<QuizProctoringSummaryItemDto>> GetQuizSummaryAsync(int quizId);
        Task<(string Path, string ContentType)> GetSnapshotAsync(int eventId);
        Task<int> PurgeOldSnapshotsAsync(int retentionDays);
        Task<int?> GetQuizIdOfEventAsync(int eventId);
    }

    public class QuizProctoringService : IQuizProctoringService
    {
        private const int MaxEventsPerAttempt = 500;
        private const int MaxSnapshotsPerAttempt = 60;
        private const long MaxSnapshotBytes = 300 * 1024;

        private static readonly HashSet<string> AllowedTypes = new(StringComparer.Ordinal)
        {
            "CameraStarted", "CameraLost", "CameraRestored",
            "NoFaceDetected", "MultipleFaces",
            "IdentityVerified", "IdentityMismatch", "Snapshot"
        };

        private readonly Nafadhcontext _context;
        private readonly string _root;

        public QuizProctoringService(Nafadhcontext context, IConfiguration config)
        {
            _context = context;
            _root = config["Storage:ProctoringSnapshotsPath"]
                    ?? @"C:\NafadhStorage\Proctoring";
        }

        public async Task<ProctoringEventDto> AddEventAsync(int attemptId, CreateProctoringEventDto dto)
        {
            var attempt = await _context.NFD_QuizAttempts
                .Include(a => a.Quiz)
                .FirstOrDefaultAsync(a => a.AttemptId == attemptId)
                ?? throw new KeyNotFoundException("المحاولة غير موجودة.");

            if (!attempt.Quiz.CameraRequired)
                throw new InvalidOperationException("المراقبة بالكاميرا غير مفعّلة لهذا الاختبار.");

            if (attempt.Status != "InProgress")
                throw new InvalidOperationException("لا يمكن تسجيل أحداث لمحاولة منتهية.");

            if (!AllowedTypes.Contains(dto.EventType))
                throw new ArgumentException("نوع الحدث غير مدعوم.");

            var eventsCount = await _context.NFD_QuizProctoringEvents
                .CountAsync(e => e.AttemptId == attemptId);
            if (eventsCount >= MaxEventsPerAttempt)
                throw new InvalidOperationException("تم بلوغ الحد الأقصى لأحداث المراقبة.");

            string? fileName = null;

            if (dto.Snapshot != null && dto.Snapshot.Length > 0)
            {
                if (dto.Snapshot.Length > MaxSnapshotBytes)
                    throw new ArgumentException("حجم اللقطة أكبر من المسموح (300KB).");

                if (dto.Snapshot.ContentType != "image/jpeg")
                    throw new ArgumentException("اللقطة يجب أن تكون بصيغة JPEG.");

                var snapsCount = await _context.NFD_QuizProctoringEvents
                    .CountAsync(e => e.AttemptId == attemptId && e.SnapshotFileName != null);
                if (snapsCount >= MaxSnapshotsPerAttempt)
                    throw new InvalidOperationException("تم بلوغ الحد الأقصى للقطات.");

                // التحقق من ترويسة JPEG الفعلية (FF D8 FF)
                var header = new byte[3];
                await using (var s = dto.Snapshot.OpenReadStream())
                {
                    var read = await s.ReadAsync(header, 0, 3);
                    if (read < 3 || header[0] != 0xFF || header[1] != 0xD8 || header[2] != 0xFF)
                        throw new ArgumentException("الملف ليس صورة JPEG صالحة.");
                }

                var dir = Path.Combine(_root, attemptId.ToString());
                Directory.CreateDirectory(dir);
                fileName = $"{Guid.NewGuid():N}.jpg";

                await using var fs = new FileStream(Path.Combine(dir, fileName), FileMode.Create);
                await dto.Snapshot.CopyToAsync(fs);
            }

            var ev = new NFD_QuizProctoringEvent
            {
                AttemptId = attemptId,
                EventType = dto.EventType,
                Details = dto.Details?.Trim(),
                SnapshotFileName = fileName,
                CreatedAt = DateTime.UtcNow
            };

            _context.NFD_QuizProctoringEvents.Add(ev);
            await _context.SaveChangesAsync();

            return new ProctoringEventDto
            {
                EventId = ev.EventId,
                EventType = ev.EventType,
                Details = ev.Details,
                HasSnapshot = fileName != null,
                CreatedAt = ev.CreatedAt
            };
        }

        public async Task<AttemptProctoringReportDto> GetAttemptReportAsync(int attemptId)
        {
            var a = await _context.NFD_QuizAttempts
                .AsNoTracking()
                .Include(x => x.Trainee).ThenInclude(t => t.User)
                .FirstOrDefaultAsync(x => x.AttemptId == attemptId)
                ?? throw new KeyNotFoundException("المحاولة غير موجودة.");

            var events = await _context.NFD_QuizProctoringEvents
                .AsNoTracking()
                .Where(e => e.AttemptId == attemptId)
                .OrderBy(e => e.CreatedAt)
                .Select(e => new ProctoringEventDto
                {
                    EventId = e.EventId,
                    EventType = e.EventType,
                    Details = e.Details,
                    HasSnapshot = e.SnapshotFileName != null,
                    CreatedAt = e.CreatedAt
                })
                .ToListAsync();

            return new AttemptProctoringReportDto
            {
                AttemptId = a.AttemptId,
                TraineeId = a.TraineeId,
                TraineeName = a.Trainee.User.FullName,
                Status = a.Status,
                IdentityCheckStatus = a.IdentityCheckStatus,
                NeedsManualReview = a.NeedsManualReview,
                ViolationCount = a.ViolationCount,
                IsTerminatedByViolation = a.IsTerminatedByViolation,
                Events = events
            };
        }

        public async Task<List<QuizProctoringSummaryItemDto>> GetQuizSummaryAsync(int quizId)
        {
            return await _context.NFD_QuizAttempts
                .AsNoTracking()
                .Where(a => a.QuizId == quizId)
                .OrderBy(a => a.Trainee.User.FullName).ThenBy(a => a.AttemptNumber)
                .Select(a => new QuizProctoringSummaryItemDto
                {
                    AttemptId = a.AttemptId,
                    TraineeId = a.TraineeId,
                    TraineeName = a.Trainee.User.FullName,
                    AttemptNumber = a.AttemptNumber,
                    Status = a.Status,
                    IdentityCheckStatus = a.IdentityCheckStatus,
                    NeedsManualReview = a.NeedsManualReview,
                    ViolationCount = a.ViolationCount,
                    ProctoringEventsCount = _context.NFD_QuizProctoringEvents
                        .Count(e => e.AttemptId == a.AttemptId)
                })
                .ToListAsync();
        }

        public async Task<int?> GetQuizIdOfEventAsync(int eventId)
        {
            return await _context.NFD_QuizProctoringEvents
                .Where(e => e.EventId == eventId)
                .Select(e => (int?)e.Attempt.QuizId)
                .FirstOrDefaultAsync();
        }

        public async Task<(string Path, string ContentType)> GetSnapshotAsync(int eventId)
        {
            var ev = await _context.NFD_QuizProctoringEvents
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.EventId == eventId && e.SnapshotFileName != null)
                ?? throw new KeyNotFoundException("اللقطة غير موجودة.");

            var path = Path.Combine(_root, ev.AttemptId.ToString(), ev.SnapshotFileName!);
            if (!File.Exists(path))
                throw new KeyNotFoundException("ملف اللقطة غير موجود (ربما حُذف بعد انتهاء مدة الاحتفاظ).");

            return (path, "image/jpeg");
        }

        // حذف اللقطات الأقدم من مدة الاحتفاظ (الخصوصية)
        public async Task<int> PurgeOldSnapshotsAsync(int retentionDays)
        {
            var cutoff = DateTime.UtcNow.AddDays(-retentionDays);

            var old = await _context.NFD_QuizProctoringEvents
                .Where(e => e.SnapshotFileName != null && e.CreatedAt < cutoff)
                .ToListAsync();

            foreach (var e in old)
            {
                var path = Path.Combine(_root, e.AttemptId.ToString(), e.SnapshotFileName!);
                try { if (File.Exists(path)) File.Delete(path); } catch { /* تجاهل */ }
                e.SnapshotFileName = null;
            }

            await _context.SaveChangesAsync();
            return old.Count;
        }
    }

    // مهمة خلفية: تنظيف يومي للقطات المنتهية
    public class ProctoringCleanupService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopes;
        private readonly IConfiguration _config;

        public ProctoringCleanupService(IServiceScopeFactory scopes, IConfiguration config)
        {
            _scopes = scopes;
            _config = config;
        }

        protected override async Task ExecuteAsync(CancellationToken ct)
        {
            while (!ct.IsCancellationRequested)
            {
                try
                {
                    var days = _config.GetValue("Proctoring:RetentionDays", 30);
                    using var scope = _scopes.CreateScope();
                    var svc = scope.ServiceProvider.GetRequiredService<IQuizProctoringService>();
                    await svc.PurgeOldSnapshotsAsync(days);
                }
                catch { /* لا نوقف التطبيق بسبب فشل التنظيف */ }

                await Task.Delay(TimeSpan.FromHours(24), ct);
            }
        }
    }
}