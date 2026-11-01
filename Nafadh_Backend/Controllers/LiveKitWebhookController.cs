
using System;
using System.IO;
using System.Threading.Tasks;
using Livekit.Server.Sdk.Dotnet;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    // Trainer Portal - Receive verified LiveKit attendance events.
    [ApiController]
    [Route("api/livekit/webhook")]
    [AllowAnonymous]
    public class LiveKitWebhookController : ControllerBase
    {
        private readonly WebhookReceiver _receiver;
        private readonly SessionAttendanceTrackingService _tracking;
        private readonly ILogger<LiveKitWebhookController> _logger;

        public LiveKitWebhookController(
            IConfiguration configuration,
            SessionAttendanceTrackingService tracking,
            ILogger<LiveKitWebhookController> logger)
        {
            var apiKey = configuration["LiveKit:ApiKey"]
                ?? throw new InvalidOperationException(
                    "LiveKit:ApiKey is missing.");

            var apiSecret = configuration["LiveKit:ApiSecret"]
                ?? throw new InvalidOperationException(
                    "LiveKit:ApiSecret is missing.");

            _receiver = new WebhookReceiver(apiKey, apiSecret);
            _tracking = tracking;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> Receive()
        {
            // Trainer Portal - LiveKit needs the original request body.
            string body;
            using (var reader = new StreamReader(Request.Body))
            {
                body = await reader.ReadToEndAsync();
            }

            var authorization = Request.Headers.Authorization.ToString();

            if (string.IsNullOrWhiteSpace(authorization))
                return Unauthorized();

            WebhookEvent webhookEvent;

            try
            {
                // Trainer Portal - Verify signature and payload checksum.
                // Never skip authentication.
                webhookEvent = _receiver.Receive(
                    body, authorization);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    "Rejected invalid LiveKit webhook: {Type}",
                    ex.GetType().Name);

                return Unauthorized();
            }

            var roomName = webhookEvent.Room?.Name;
            var identity = webhookEvent.Participant?.Identity;
            var participantSid = webhookEvent.Participant?.Sid;

            const string roomPrefix = "nafadh-session-";
            const string traineePrefix = "nafadh-trainee-";

            // Trainer Portal - Ignore events outside Nafadh rooms.
            if (roomName == null ||
                !roomName.StartsWith(roomPrefix, StringComparison.Ordinal) ||
                !int.TryParse(roomName.Substring(roomPrefix.Length),
                    out var sessionId) ||
                sessionId <= 0)
            {
                return Ok();
            }

            // Trainer Portal - Only trainee events affect attendance.
            if (identity == null ||
                !identity.StartsWith(traineePrefix,
                    StringComparison.Ordinal) ||
                !int.TryParse(identity.Substring(traineePrefix.Length),
                    out var userId) ||
                userId <= 0 ||
                string.IsNullOrWhiteSpace(participantSid))
            {
                return Ok();
            }

            // Trainer Portal - Save attendance changes.
            // Current UTC time is provisional until event-time
            // handling is implemented.
            if (webhookEvent.Event == "participant_joined")
            {
                var saved = await _tracking.RecordJoinAsync(
                    sessionId,
                    userId,
                    participantSid,
                    DateTime.UtcNow);

                if (!saved)
                    _logger.LogWarning(
                        "LiveKit join not recorded for session {SessionId}",
                        sessionId);
            }
            else if (webhookEvent.Event == "participant_left")
            {
                // Trainer Portal - Record the trainee leaving the room.
                var saved = await _tracking.RecordLeaveAsync(
                    sessionId,
                    participantSid,
                    DateTime.UtcNow);

                if (!saved)
                {
                    // Trainer Portal - Ask LiveKit to retry if the join
                    // event has not been recorded yet.
                    _logger.LogWarning(
                        "LiveKit leave not recorded for session {SessionId}, ParticipantSid {ParticipantSid}",
                        sessionId,
                        participantSid);

                    return StatusCode(503, "Attendance event not ready for processing.");
                }
            }

            return Ok();
        }
    }
}
