
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/trainer/live-sessions")]
    [Authorize(Roles = "Trainer")]
    public class TrainerSessionRecordingsController : ControllerBase
    {
        private readonly TrainerSessionRecordingService _recordingService;
        private readonly TrainerLiveSessionService _sessionService;

        public TrainerSessionRecordingsController(
            TrainerSessionRecordingService recordingService,
            TrainerLiveSessionService sessionService)
        {
            _recordingService = recordingService;
            _sessionService = sessionService;
        }

        private async Task<int?> GetCurrentTrainerIdAsync()
        {
            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
                return null;

            return await _sessionService.GetTrainerIdAsync(userId);
        }

        // POST: api/trainer/live-sessions/5/recording
        // Allow up to 500 MB for the video itself.
        // Multipart requests include additional form overhead.
        [HttpPost("{sessionId:int}/recording")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(525336576)]
        [RequestFormLimits(MultipartBodyLengthLimit = 524288000)]
        public async Task<IActionResult> UploadRecording(
            int sessionId,
            [FromForm] IFormFile file)
        {
            var trainerId = await GetCurrentTrainerIdAsync();

            if (!trainerId.HasValue)
                return Unauthorized();

            try
            {
                var fileName = await _recordingService.UploadAsync(
                    trainerId.Value,
                    sessionId,
                    file);

                return Ok(new
                {
                    message = "Recording uploaded successfully.",
                    sessionId,
                    fileName
                });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new
                {
                    message = "Session not found."
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(500, new
                {
                    message = ex.Message
                });
            }
        }

        // GET: api/trainer/live-sessions/5/recording
        // Stream a private recording to its trainer.
        [HttpGet("{sessionId:int}/recording")]
        public async Task<IActionResult> GetRecording(int sessionId)
        {
            var trainerId = await GetCurrentTrainerIdAsync();

            if (!trainerId.HasValue)
                return Unauthorized();

            try
            {
                var recording = await _recordingService
                    .GetRecordingAsync(trainerId.Value, sessionId);

                if (!recording.HasValue)
                    return NotFound(new
                    {
                        message = "Recording not found."
                    });

                var (filePath, contentType) = recording.Value;

                var stream = new FileStream(
                    filePath,
                    FileMode.Open,
                    FileAccess.Read,
                    FileShare.Read);

                return File(
                    stream,
                    contentType,
                    enableRangeProcessing: true);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new
                {
                    message = "Session not found."
                });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new
                {
                    message = "Recording is unavailable."
                });
            }
            catch (IOException)
            {
                return NotFound(new
                {
                    message = "Recording file is unavailable."
                });
            }
        }

    }
}
