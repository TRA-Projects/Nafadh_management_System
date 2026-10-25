
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    // Trainer Portal - Secure trainee access to LiveKit rooms.
    // Only enrolled trainees can receive a room token.
    [ApiController]
    [Authorize(Roles = "Trainee")]
    [Route("api/trainee/live-sessions/{sessionId:int}/room")]
    public class TraineeLiveRoomController : ControllerBase
    {
        private readonly Nafadhcontext _context;
        private readonly ILiveKitService _liveKit;

        public TraineeLiveRoomController(
            Nafadhcontext context,
            ILiveKitService liveKit)
        {
            _context = context;
            _liveKit = liveKit;
        }

        // Trainer Portal - Issue a LiveKit token only after
        // verifying the trainee's batch enrollment.
        [HttpPost("join")]
        public async Task<IActionResult> Join(int sessionId)
        {
            // Trainer Portal - Read identity from JWT.
            // Never accept UserId or role from the request body.
            var claim =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(claim, out var userId))
                return Unauthorized();

            // Trainer Portal - Find the requested session.
            var session = await _context.NFD_Sessions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session == null)
                return NotFound(new
                {
                    message = "Session not found."
                });

            // Trainer Portal - Verify that this user is a
            // trainee enrolled in the session's batch.
            var isEnrolled = await _context.NFD_Enrollments
                .AsNoTracking()
                .AnyAsync(e =>
                    e.BatchId == session.BatchId &&
                    e.Trainee.UserId == userId);

            if (!isEnrolled)
                return StatusCode(403, new
                {
                    message = "You are not enrolled in this batch."
                });

            // Trainer Portal - Prevent joining cancelled,
            // postponed or completed sessions.
            if (session.Status != NFD_SessionStatus.Scheduled)
                return Conflict(new
                {
                    message = "This session is not available for joining."
                });

            // Trainer Portal - The trainer must start
            // the room before trainees can join.
            var room = await _liveKit.GetRoomDetailsAsync(
                sessionId,
                HttpContext.RequestAborted);

            if (!room.IsLive)
                return Conflict(new
                {
                    message = "The trainer has not started the room."
                });

            // Trainer Portal - Create a room-scoped token.
            // The service grants trainee permissions only.
            var connection = await _liveKit.CreateJoinTokenAsync(
                sessionId,
                userId,
                "Trainee",
                HttpContext.RequestAborted);

            return Ok(connection);
        }
    }
}
