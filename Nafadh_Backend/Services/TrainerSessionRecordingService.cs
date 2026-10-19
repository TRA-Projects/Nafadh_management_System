
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Services
{
    public class TrainerSessionRecordingService
    {
        private readonly Nafadhcontext _context;
        private readonly IConfiguration _configuration;

        private const long MaxFileSize = 500L * 1024 * 1024;

        private static readonly string[] AllowedExtensions =
        {
            ".mp4",
            ".webm"
        };

        public TrainerSessionRecordingService(
            Nafadhcontext context,
            IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<string> UploadAsync(
            int trainerId,
            int sessionId,
            IFormFile file)
        {
            var session = await _context.NFD_Sessions
                .FirstOrDefaultAsync(s =>
                    s.SessionId == sessionId &&
                    s.TrainerId == trainerId &&
                    _context.NFD_BatchTrainers.Any(bt =>
                        bt.BatchId == s.BatchId &&
                        bt.TrainerId == trainerId));

            if (session == null)
                throw new KeyNotFoundException(
                    "Session not found or access denied.");

            if (file == null || file.Length == 0)
                throw new ArgumentException(
                    "Recording file is required.");

            if (file.Length > MaxFileSize)
                throw new ArgumentException(
                    "Recording exceeds the 500 MB limit.");

            var extension = Path.GetExtension(
                file.FileName).ToLowerInvariant();

            if (!AllowedExtensions.Contains(extension))
                throw new ArgumentException(
                    "Only MP4 and WebM recordings are allowed.");

            // This is a preliminary extension check.
            // File content validation will be added
            // before enabling the upload endpoint.
            var storagePath = _configuration[
                "Storage:SessionRecordingsPath"];

            if (string.IsNullOrWhiteSpace(storagePath))
                throw new InvalidOperationException(
                    "Recording storage path is not configured.");

            Directory.CreateDirectory(storagePath);

            var fileName = $"{Guid.NewGuid():N}{extension}";
            var fullPath = Path.Combine(storagePath, fileName);

            try
            {
                await using (var stream = new FileStream(
                    fullPath,
                    FileMode.CreateNew,
                    FileAccess.Write))
                {
                    await file.CopyToAsync(stream);
                }

                session.RecordingUrl = fileName;
                await _context.SaveChangesAsync();

                return fileName;
            }
            catch
            {
                if (File.Exists(fullPath))
                    File.Delete(fullPath);

                throw;
            }
        }
    }
}
