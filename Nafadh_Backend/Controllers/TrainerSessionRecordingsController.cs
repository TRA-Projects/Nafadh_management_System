
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
        [HttpPost("{sessionId:int}/recording")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(524288000)]
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
    }
}
