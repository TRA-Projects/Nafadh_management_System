
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

        private string GetStoragePath()
        {
            var path = _configuration[
                "Storage:SessionRecordingsPath"];

            if (string.IsNullOrWhiteSpace(path))
                throw new InvalidOperationException(
                    "Recording storage path is not configured.");

            return path;
        }

        private async Task<NFD_Session> GetOwnedSessionAsync(
            int trainerId,
            int sessionId)
        {
            var session = await _context.NFD_Sessions
                .FirstOrDefaultAsync(s =>
                    s.SessionId == sessionId &&
                    s.TrainerId == trainerId &&
                    _context.NFD_BatchTrainers.Any(bt =>
                        bt.BatchId == s.BatchId &&
                        bt.TrainerId == trainerId));

            return session ?? throw new KeyNotFoundException(
                "Session not found.");
        }

        private static async Task<bool> HasValidVideoHeaderAsync(
            IFormFile file,
            string extension)
        {
            await using var stream = file.OpenReadStream();

            var header = new byte[16];
            var bytesRead = await stream.ReadAsync(header);

            if (extension == ".mp4")
            {
                // MP4 commonly contains "ftyp" at offset 4.
                return bytesRead >= 12 &&
                    header[4] == (byte)'f' &&
                    header[5] == (byte)'t' &&
                    header[6] == (byte)'y' &&
                    header[7] == (byte)'p';
            }

            if (extension == ".webm")
            {
                // EBML header used by WebM.
                return bytesRead >= 4 &&
                    header[0] == 0x1A &&
                    header[1] == 0x45 &&
                    header[2] == 0xDF &&
                    header[3] == 0xA3;
            }

            return false;
        }

        public async Task<string> UploadAsync(
            int trainerId,
            int sessionId,
            IFormFile file)
        {
            var session = await GetOwnedSessionAsync(
                trainerId, sessionId);

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

            if (!await HasValidVideoHeaderAsync(
                    file, extension))
                throw new ArgumentException(
                    "Invalid video file header.");

            var storagePath = GetStoragePath();

            Directory.CreateDirectory(storagePath);

            var oldFileName = session.RecordingUrl;

            var newFileName =
                $"{Guid.NewGuid():N}{extension}";

            var newFilePath = Path.Combine(
                storagePath, newFileName);

            try
            {
                await using (var stream = new FileStream(
                    newFilePath,
                    FileMode.CreateNew,
                    FileAccess.Write))
                {
                    await file.CopyToAsync(stream);
                }

                session.RecordingUrl = newFileName;

                await _context.SaveChangesAsync();
            }
            catch
            {
                if (File.Exists(newFilePath))
                    File.Delete(newFilePath);

                throw;
            }

            // Delete the previous recording only after
            // the new recording is saved successfully.
            if (!string.IsNullOrWhiteSpace(oldFileName) &&
                oldFileName != newFileName &&
                Path.GetFileName(oldFileName) == oldFileName)
            {
                var oldFilePath = Path.Combine(
                    storagePath, oldFileName);

                try
                {
                    if (File.Exists(oldFilePath))
                        File.Delete(oldFilePath);
                }
                catch (IOException)
                {
                    // Cleanup failure must not undo
                    // the successfully saved recording.
                }
                catch (UnauthorizedAccessException)
                {
                    // Cleanup can be retried later.
                }
            }

            return newFileName;
        }
    }
}
