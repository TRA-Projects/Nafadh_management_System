
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    // Trainer Portal - Secure LiveKit room management.
    [ApiController]
    [Authorize(Roles = "Trainer")]
    [Route("api/trainer/live-sessions/{sessionId:int}/room")]
    public class TrainerLiveRoomController : ControllerBase
    {
        private readonly Nafadhcontext _context;
        private readonly ILiveKitService _liveKit;

        public TrainerLiveRoomController(
            Nafadhcontext context,
            ILiveKitService liveKit)
        {
            _context = context;
            _liveKit = liveKit;
        }

        // Trainer Portal - Verify that the authenticated trainer
        // owns the session and is assigned to its batch.
        private async Task<(NFD_Session? Session, int UserId)>
            GetAuthorizedSessionAsync(int sessionId)
        {
            var claim =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(claim, out var userId))
                return (null, 0);

            var session = await _context.NFD_Sessions
                .FirstOrDefaultAsync(s =>
                    s.SessionId == sessionId &&
                    s.Trainer.UserId == userId &&
                    _context.NFD_BatchTrainers.Any(bt =>
                        bt.BatchId == s.BatchId &&
                        bt.TrainerId == s.TrainerId));

            return (session, userId);
        }

        // Trainer Portal - Ensure the session can go live.
        private static bool CanGoLive(NFD_Session session)
        {
            return session.Status == NFD_SessionStatus.Scheduled
                || session.Status == NFD_SessionStatus.InProgress;
        }

        // POST: api/trainer/live-sessions/5/room/start
        // Trainer Portal - Start a LiveKit classroom.
        [HttpPost("start")]
        public async Task<IActionResult> Start(int sessionId)
        {
            var (session, _) =
                await GetAuthorizedSessionAsync(sessionId);

            if (session == null)
                return NotFound(new
                {
                    message = "Session not found or access denied."
                });

            if (!CanGoLive(session))
                return Conflict(new
                {
                    message = "This session cannot be started."
                });

            var result = await _liveKit.StartRoomAsync(
                sessionId, HttpContext.RequestAborted);

            return result.Success ? Ok(result) : BadRequest(result);
        }

        // GET: api/trainer/live-sessions/5/room
        // Trainer Portal - Read room state and participant count.
        [HttpGet]
        public async Task<IActionResult> GetRoom(int sessionId)
        {
            var (session, _) =
                await GetAuthorizedSessionAsync(sessionId);

            if (session == null)
                return NotFound();

            var room = await _liveKit.GetRoomDetailsAsync(
                sessionId, HttpContext.RequestAborted);

            // Trainer Portal - Obtain session topic from Nafadh.
            room.Topic = session.Topic ?? string.Empty;

            return Ok(room);
        }

        // POST: api/trainer/live-sessions/5/room/join
        // Trainer Portal - Issue a token to the session trainer.
        [HttpPost("join")]
        public async Task<IActionResult> Join(int sessionId)
        {
            var (session, userId) =
                await GetAuthorizedSessionAsync(sessionId);

            if (session == null)
                return NotFound();

            if (!CanGoLive(session))
                return Conflict(new
                {
                    message = "The session is not available."
                });

            // Trainer Portal - The room must already exist.
            var room = await _liveKit.GetRoomDetailsAsync(
                sessionId, HttpContext.RequestAborted);

            if (!room.IsLive)
                return Conflict(new
                {
                    message = "Start the room before joining."
                });

            var connection = await _liveKit.CreateJoinTokenAsync(
                sessionId,
                userId,
                "Trainer",
                HttpContext.RequestAborted);

            return Ok(connection);
        }

        // POST: api/trainer/live-sessions/5/room/end
        // Trainer Portal - End the room and complete the session.
        [HttpPost("end")]
        public async Task<IActionResult> End(int sessionId)
        {
            var (session, _) =
                await GetAuthorizedSessionAsync(sessionId);

            if (session == null)
                return NotFound();

            if (!CanGoLive(session))
                return Conflict(new
                {
                    message = "The session cannot be ended."
                });

            var result = await _liveKit.EndRoomAsync(
                sessionId, HttpContext.RequestAborted);

            if (!result.Success)
                return BadRequest(result);

            // Trainer Portal - Prevent issuing new join tokens
            // once the session has been completed.
            session.Status = NFD_SessionStatus.Completed;
            await _context.SaveChangesAsync();

            return Ok(result);
        }

        // POST: api/trainer/live-sessions/5/room/mute
        // Trainer Portal - Mute one connected trainee.
        [HttpPost("mute")]
        public async Task<IActionResult> Mute(
            int sessionId,
            [FromBody] MuteParticipantDto dto)
        {
            var (session, _) =
                await GetAuthorizedSessionAsync(sessionId);

            if (session == null)
                return NotFound();

            if (!CanGoLive(session))
                return Conflict(new
                {
                    message = "Session is not active."
                });

            var result = await _liveKit.MuteParticipantAsync(
                sessionId,
                dto.ParticipantIdentity,
                HttpContext.RequestAborted);

            return result.Success ? Ok(result) : BadRequest(result);
        }

        // POST: api/trainer/live-sessions/5/room/mute-all
        // Trainer Portal - Mute all connected trainees.
        [HttpPost("mute-all")]
        public async Task<IActionResult> MuteAll(int sessionId)
        {
            var (session, _) =
                await GetAuthorizedSessionAsync(sessionId);

            if (session == null)
                return NotFound();

            if (!CanGoLive(session))
                return Conflict(new
                {
                    message = "Session is not active."
                });

            var result = await _liveKit.MuteAllTraineesAsync(
                sessionId, HttpContext.RequestAborted);

            return result.Success ? Ok(result) : BadRequest(result);
        }

        // PUT: api/trainer/live-sessions/5/room/participants/audio
        // Trainer Portal - Allow or prevent trainee microphone use.
        [HttpPut("participants/audio")]
        public async Task<IActionResult> UpdateAudio(
            int sessionId,
            [FromBody] UpdateParticipantPermissionDto dto)
        {
            var (session, _) =
                await GetAuthorizedSessionAsync(sessionId);

            if (session == null)
                return NotFound();

            if (!CanGoLive(session))
                return Conflict(new
                {
                    message = "Session is not active."
                });

            var result = await _liveKit.UpdateAudioPermissionAsync(
                sessionId,
                dto.ParticipantIdentity,
                dto.CanPublishAudio,
                HttpContext.RequestAborted);

            return result.Success ? Ok(result) : BadRequest(result);
        }
    }
}
