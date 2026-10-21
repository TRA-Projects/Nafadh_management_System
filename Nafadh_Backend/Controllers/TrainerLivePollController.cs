
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
    // Trainer Portal - Live polls during classroom sessions.
    [ApiController]
    [Authorize(Roles = "Trainer")]
    [Route("api/trainer/live-sessions/{sessionId:int}/polls")]
    public class TrainerLivePollController : ControllerBase
    {
        private readonly Nafadhcontext _context;

        public TrainerLivePollController(Nafadhcontext context)
        {
            _context = context;
        }

        // POST: api/trainer/live-sessions/418/polls
        // Create a draft poll for an authorized trainer's session.
        [HttpPost]
        public async Task<IActionResult> Create(
            int sessionId,
            [FromBody] TrainerCreateLivePollDto dto)
        {
            // Get authenticated trainer UserId.
            var claim =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(claim, out var userId))
                return Unauthorized();

            // Verify trainer owns the session and is
            // assigned to its batch.
            var session = await _context.NFD_Sessions
                .AsNoTracking()
                .FirstOrDefaultAsync(s =>
                    s.SessionId == sessionId &&
                    s.Trainer.UserId == userId &&
                    _context.NFD_BatchTrainers.Any(bt =>
                        bt.BatchId == s.BatchId &&
                        bt.TrainerId == s.TrainerId),
                    HttpContext.RequestAborted);

            if (session == null)
            {
                return NotFound(new
                {
                    message = "Session not found or access denied."
                });
            }

            // Follow the current LiveKit session status rule.
            if (session.Status != NFD_SessionStatus.Scheduled &&
                session.Status != NFD_SessionStatus.InProgress)
            {
                return Conflict(new
                {
                    message = "Polls can only be created for scheduled sessions."
                });
            }

            // Validate the question.
            var question = dto.Question?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(question) ||
                question.Length > 300)
            {
                return BadRequest(new
                {
                    message = "Question must contain 1 to 300 characters."
                });
            }

            // Require 2 to 10 non-empty options.
            if (dto.Options == null ||
                dto.Options.Count < 2 ||
                dto.Options.Count > 10 ||
                dto.Options.Any(o =>
                    string.IsNullOrWhiteSpace(o) ||
                    o.Length > 200))
            {
                return BadRequest(new
                {
                    message = "Provide 2 to 10 valid options, each up to 200 characters."
                });
            }

            var options = dto.Options
                .Select(o => o.Trim())
                .ToList();

            // Prevent duplicate options.
            if (options.Distinct(StringComparer.OrdinalIgnoreCase).Count()
                != options.Count)
            {
                return BadRequest(new
                {
                    message = "Poll options must be different."
                });
            }

            // Create a closed draft poll.
            var poll = new NFD_LivePoll
            {
                SessionId = sessionId,
                Question = question,
                IsOpen = false,
                Options = options
                    .Select((text, index) => new NFD_LivePollOption
                    {
                        OptionText = text,
                        SortOrder = index
                    })
                    .ToList()
            };

            _context.NFD_LivePolls.Add(poll);

            await _context.SaveChangesAsync(
                HttpContext.RequestAborted);

            return StatusCode(201, new
            {
                poll.PollId,
                poll.SessionId,
                poll.Question,
                poll.IsOpen,
                poll.CreatedAtUtc,
                Options = poll.Options
                    .OrderBy(o => o.SortOrder)
                    .Select(o => new
                    {
                        o.OptionId,
                        o.OptionText,
                        o.SortOrder
                    })
            });
        }


        // Verify the trainer owns the session and is assigned
        // to its batch before managing a poll.
        private async Task<NFD_LivePoll?> GetAuthorizedPollAsync(
            int sessionId,
            int pollId)
        {
            var claim =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(claim, out var userId))
                return null;

            return await _context.NFD_LivePolls
                .Include(p => p.Session)
                .FirstOrDefaultAsync(p =>
                    p.PollId == pollId &&
                    p.SessionId == sessionId &&
                    p.Session.Trainer.UserId == userId &&
                    _context.NFD_BatchTrainers.Any(bt =>
                        bt.BatchId == p.Session.BatchId &&
                        bt.TrainerId == p.Session.TrainerId),
                    HttpContext.RequestAborted);
        }

        // POST: api/trainer/live-sessions/418/polls/1/open
        // Open voting for a draft poll.
        [HttpPost("{pollId:int}/open")]
        public async Task<IActionResult> Open(
            int sessionId,
            int pollId)
        {
            var poll = await GetAuthorizedPollAsync(
                sessionId, pollId);

            if (poll == null)
                return NotFound(new
                {
                    message = "Poll not found or access denied."
                });

            if (poll.Session.Status != NFD_SessionStatus.Scheduled &&
                poll.Session.Status != NFD_SessionStatus.InProgress) return Conflict(new
                {
                    message = "The session is not available for live polls."
                });

            if (poll.IsOpen)
                return Conflict(new
                {
                    message = "The poll is already open."
                });

            if (poll.ClosedAtUtc != null)
                return Conflict(new
                {
                    message = "A closed poll cannot be reopened."
                });

            poll.IsOpen = true;

            await _context.SaveChangesAsync(
                HttpContext.RequestAborted);

            return Ok(new
            {
                poll.PollId,
                poll.SessionId,
                poll.IsOpen,
                message = "Poll opened successfully."
            });
        }

        // POST: api/trainer/live-sessions/418/polls/1/close
        // Stop voting and record the closing time.
        [HttpPost("{pollId:int}/close")]
        public async Task<IActionResult> Close(
            int sessionId,
            int pollId)
        {
            var poll = await GetAuthorizedPollAsync(
                sessionId, pollId);

            if (poll == null)
                return NotFound(new
                {
                    message = "Poll not found or access denied."
                });

            if (!poll.IsOpen)
                return Conflict(new
                {
                    message = "The poll is not open."
                });

            poll.IsOpen = false;
            poll.ClosedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync(
                HttpContext.RequestAborted);

            return Ok(new
            {
                poll.PollId,
                poll.SessionId,
                poll.IsOpen,
                poll.ClosedAtUtc,
                message = "Poll closed successfully."
            });
        }

        // GET: api/trainer/live-sessions/418/polls/1/results
        // Show voting results to the authorized trainer.
        [HttpGet("{pollId:int}/results")]
        public async Task<IActionResult> GetResults(
            int sessionId,
            int pollId)
        {
            // Verify that this trainer owns the session
            // and is assigned to its batch.
            var poll = await GetAuthorizedPollAsync(
                sessionId, pollId);

            if (poll == null)
            {
                return NotFound(new
                {
                    message = "Poll not found or access denied."
                });
            }

            // Get options with their vote counts.
            var options = await _context.NFD_LivePollOptions
                .AsNoTracking()
                .Where(o => o.PollId == pollId)
                .OrderBy(o => o.SortOrder)
                .Select(o => new
                {
                    o.OptionId,
                    o.OptionText,
                    o.SortOrder,

                    VoteCount = _context.NFD_LivePollVotes
                        .Count(v =>
                            v.PollId == pollId &&
                            v.OptionId == o.OptionId)
                })
                .ToListAsync(HttpContext.RequestAborted);

            // Calculate total votes.
            var totalVotes = options.Sum(o => o.VoteCount);

            // Calculate vote percentage per option.
            var results = options.Select(o => new
            {
                o.OptionId,
                o.OptionText,
                o.SortOrder,
                o.VoteCount,

                VotePercentage = totalVotes == 0
                    ? 0m
                    : Math.Round(
                        o.VoteCount * 100m / totalVotes, 2)
            }).ToList();

            return Ok(new
            {
                poll.PollId,
                poll.SessionId,
                poll.Question,
                poll.IsOpen,
                poll.ClosedAtUtc,
                TotalVotes = totalVotes,
                Results = results
            });
        }

        // GET: api/trainer/live-sessions/418/polls
        // List all polls belonging to the trainer's session.
        [HttpGet]
        public async Task<IActionResult> GetPolls(int sessionId)
        {
            var claim =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(claim, out var userId))
                return Unauthorized();

            // Verify trainer owns the session and
            // is assigned to its batch.
            var hasAccess = await _context.NFD_Sessions
                .AsNoTracking()
                .AnyAsync(s =>
                    s.SessionId == sessionId &&
                    s.Trainer.UserId == userId &&
                    _context.NFD_BatchTrainers.Any(bt =>
                        bt.BatchId == s.BatchId &&
                        bt.TrainerId == s.TrainerId),
                    HttpContext.RequestAborted);

            if (!hasAccess)
            {
                return NotFound(new
                {
                    message = "Session not found or access denied."
                });
            }

            // Include open, closed, and draft polls.
            var polls = await _context.NFD_LivePolls
                .AsNoTracking()
                .Where(p => p.SessionId == sessionId)
                .OrderByDescending(p => p.CreatedAtUtc)
                .ThenByDescending(p => p.PollId)
                .Select(p => new
                {
                    p.PollId,
                    p.SessionId,
                    p.Question,
                    p.IsOpen,
                    p.CreatedAtUtc,
                    p.ClosedAtUtc,

                    TotalVotes = p.Votes.Count(),

                    Options = p.Options
                        .OrderBy(o => o.SortOrder)
                        .Select(o => new
                        {
                            o.OptionId,
                            o.OptionText,
                            o.SortOrder
                        })
                        .ToList()
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
