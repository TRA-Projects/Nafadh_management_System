
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

namespace Nafadh_Backend.Controllers
{
    // Trainee Portal - Vote in live classroom polls.
    [ApiController]
    [Authorize(Roles = "Trainee")]
    [Route("api/trainee/live-sessions/{sessionId:int}/polls")]
    public class TraineeLivePollController : ControllerBase
    {
        private readonly Nafadhcontext _context;

        public TraineeLivePollController(Nafadhcontext context)
        {
            _context = context;
        }

        // POST: api/trainee/live-sessions/418/polls/1/vote
        [HttpPost("{pollId:int}/vote")]
        public async Task<IActionResult> Vote(
            int sessionId,
            int pollId,
            [FromBody] TraineeLivePollVoteDto dto)
        {
            // Get the authenticated trainee UserId.
            var claim =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(claim, out var userId))
                return Unauthorized();

            // Find the actual TraineeId.
            var traineeId = await _context.NFD_Trainees
                .AsNoTracking()
                .Where(t => t.UserId == userId)
                .Select(t => (int?)t.TraineeId)
                .FirstOrDefaultAsync(HttpContext.RequestAborted);

            if (!traineeId.HasValue)
                return NotFound(new
                {
                    message = "Trainee account not found."
                });

            // Find the poll and ensure the trainee is
            // enrolled in the session's batch.
            var poll = await _context.NFD_LivePolls
                .AsNoTracking()
                .Where(p =>
                    p.PollId == pollId &&
                    p.SessionId == sessionId &&
                    _context.NFD_Enrollments.Any(e =>
                        e.BatchId == p.Session.BatchId &&
                        e.TraineeId == traineeId.Value))
                .Select(p => new
                {
                    p.PollId,
                    p.IsOpen,
                    p.ClosedAtUtc,
                    SessionStatus = p.Session.Status
                })
                .FirstOrDefaultAsync(HttpContext.RequestAborted);

            if (poll == null)
                return NotFound(new
                {
                    message = "Poll not found or access denied."
                });

            // Match the current LiveKit session status rule.
            if (poll.SessionStatus != NFD_SessionStatus.Scheduled &&
                poll.SessionStatus != NFD_SessionStatus.InProgress) return Conflict(new
                {
                    message = "The session is not available for voting."
                });

            // Voting is allowed only while the poll is open.
            if (!poll.IsOpen || poll.ClosedAtUtc != null)
                return Conflict(new
                {
                    message = "This poll is not open for voting."
                });

            // Ensure the selected option belongs to this poll.
            var validOption = await _context.NFD_LivePollOptions
                .AsNoTracking()
                .AnyAsync(o =>
                    o.OptionId == dto.OptionId &&
                    o.PollId == pollId,
                    HttpContext.RequestAborted);

            if (!validOption)
                return BadRequest(new
                {
                    message = "Invalid option for this poll."
                });

            // Prevent multiple votes from the same trainee.
            var alreadyVoted = await _context.NFD_LivePollVotes
                .AsNoTracking()
                .AnyAsync(v =>
                    v.PollId == pollId &&
                    v.TraineeId == traineeId.Value,
                    HttpContext.RequestAborted);

            if (alreadyVoted)
                return Conflict(new
                {
                    message = "You have already voted in this poll."
                });

            // Save the vote.
            var vote = new NFD_LivePollVote
            {
                PollId = pollId,
                OptionId = dto.OptionId,
                TraineeId = traineeId.Value
            };

            _context.NFD_LivePollVotes.Add(vote);

            try
            {
                await _context.SaveChangesAsync(
                    HttpContext.RequestAborted);
            }
            catch (DbUpdateException)
            {
                // Handle a simultaneous duplicate submission.
                // The unique database index provides final protection.
                var duplicateExists =
                    await _context.NFD_LivePollVotes
                        .AsNoTracking()
                        .AnyAsync(v =>
                            v.PollId == pollId &&
                            v.TraineeId == traineeId.Value,
                            HttpContext.RequestAborted);

                if (duplicateExists)
                    return Conflict(new
                    {
                        message = "You have already voted in this poll."
                    });

                throw;
            }

            return StatusCode(201, new
            {
                vote.VoteId,
                vote.PollId,
                vote.OptionId,
                vote.SubmittedAtUtc,
                message = "Vote submitted successfully."
            });
        }


        // GET: api/trainee/live-sessions/418/polls
        // Show open polls to trainees enrolled in the session batch.
        [HttpGet]
        public async Task<IActionResult> GetOpenPolls(int sessionId)
        {
            var claim =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(claim, out var userId))
                return Unauthorized();

            // Identify the logged-in trainee.
            var traineeId = await _context.NFD_Trainees
                .AsNoTracking()
                .Where(t => t.UserId == userId)
                .Select(t => (int?)t.TraineeId)
                .FirstOrDefaultAsync(HttpContext.RequestAborted);

            if (!traineeId.HasValue)
                return NotFound(new
                {
                    message = "Trainee account not found."
                });

            // Verify enrollment in the session batch.
            var hasAccess = await _context.NFD_Sessions
                .AsNoTracking()
                .AnyAsync(s =>
                    s.SessionId == sessionId &&
(s.Status == NFD_SessionStatus.Scheduled ||
 s.Status == NFD_SessionStatus.InProgress) && _context.NFD_Enrollments.Any(e =>
                        e.BatchId == s.BatchId &&
                        e.TraineeId == traineeId.Value),
                    HttpContext.RequestAborted);

            if (!hasAccess)
                return NotFound(new
                {
                    message = "Session not found or access denied."
                });

            // Return only polls currently open for voting.
            var polls = await _context.NFD_LivePolls
                .AsNoTracking()
                .Where(p =>
                    p.SessionId == sessionId &&
                    p.IsOpen &&
                    p.ClosedAtUtc == null)
                .OrderByDescending(p => p.CreatedAtUtc)
                .Select(p => new
                {
                    p.PollId,
                    p.Question,
                    p.IsOpen,

                    Options = p.Options
                        .OrderBy(o => o.SortOrder)
                        .Select(o => new
                        {
                            o.OptionId,
                            o.OptionText,
                            o.SortOrder
                        })
                        .ToList(),

                    HasVoted = p.Votes.Any(v =>
                        v.TraineeId == traineeId.Value)
                })
                .ToListAsync(HttpContext.RequestAborted);

            return Ok(new
            {
                SessionId = sessionId,
                Polls = polls
            });
        }

    }
}
