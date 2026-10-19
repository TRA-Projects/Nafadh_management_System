
using System;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/trainee/live-sessions")]
    [Authorize(Roles = "Trainee")]
    public class TraineeSessionRecordingsController : ControllerBase
    {
        private readonly TrainerSessionRecordingService _recordingService;

        public TraineeSessionRecordingsController(
            TrainerSessionRecordingService recordingService)
        {
            _recordingService = recordingService;
        }

        // GET: api/trainee/live-sessions/5/recording
        [HttpGet("{sessionId:int}/recording")]
        public async Task<IActionResult> GetRecording(int sessionId)
        {
            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
                return Unauthorized();

            var recording = await _recordingService
                .GetTraineeRecordingAsync(userId, sessionId);

            if (!recording.HasValue)
                return NotFound(new
                {
                    message = "Recording not found or unavailable."
                });

            var (filePath, contentType) = recording.Value;

            try
            {
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
            catch (IOException)
            {
                return NotFound(new
                {
                    message = "Recording file not found."
                });
            }
        }
    }
}
