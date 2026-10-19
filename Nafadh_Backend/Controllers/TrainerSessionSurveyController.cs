
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Controllers
{
    // Trainer Portal - Manage post-session surveys.
    // Only the trainer who owns the session can access these APIs.
    [ApiController]
    [Authorize(Roles = "Trainer")]
    [Route("api/trainer/live-sessions/{sessionId:int}/survey")]
    public class TrainerSessionSurveyController : ControllerBase
    {
        private readonly Nafadhcontext _context;

        public TrainerSessionSurveyController(Nafadhcontext context)
        {
            _context = context;
        }

        // Trainer Portal - Get trainer ID from the authenticated user.
        private async Task<int?> GetTrainerIdAsync()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? User.FindFirstValue("sub");

            if (!int.TryParse(claim, out var userId))
                return null;

            return await _context.NFD_Trainers
                .Where(t => t.UserId == userId)
                .Select(t => (int?)t.TrainerId)
                .FirstOrDefaultAsync();
        }

        // Trainer Portal - Verify session ownership.
        private async Task<NFD_Session?> GetOwnedSessionAsync(
            int sessionId, int trainerId)
        {
            return await _context.NFD_Sessions
                .FirstOrDefaultAsync(s =>
                    s.SessionId == sessionId &&
                    s.TrainerId == trainerId);
        }

        // POST: api/trainer/live-sessions/5/survey
        // Trainer Portal - Create one survey per session.
        [HttpPost]
        public async Task<IActionResult> Create(
            int sessionId,
            [FromBody] CreateTrainerSessionSurveyDto dto)
        {
            var trainerId = await GetTrainerIdAsync();

            if (!trainerId.HasValue)
                return Unauthorized();

            var session = await GetOwnedSessionAsync(
                sessionId, trainerId.Value);

            if (session == null)
                return NotFound(new { message = "Session not found." });

            var exists = await _context.NFD_SessionSurveys
                .AnyAsync(s => s.SessionId == sessionId);

            if (exists)
                return Conflict(new
                {
                    message = "A survey already exists for this session."
                });

            var survey = new NFD_SessionSurvey
            {
                SessionId = sessionId,
                Question = dto.Question.Trim(),
                IsPublished = dto.IsPublished,
                CreatedAtUtc = DateTime.UtcNow
            };

            _context.NFD_SessionSurveys.Add(survey);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // Trainer Portal - Handle concurrent survey creation.
                return Conflict(new
                {
                    message = "Could not create survey. Check whether it already exists."
                });
            }

            return CreatedAtAction(
                nameof(GetSurvey),
                new { sessionId },
                new
                {
                    survey.SurveyId,
                    survey.SessionId,
                    survey.Question,
                    survey.IsPublished
                });
        }

        // GET: api/trainer/live-sessions/5/survey
        // Trainer Portal - View the survey and its settings.
        [HttpGet]
        public async Task<IActionResult> GetSurvey(int sessionId)
        {
            var trainerId = await GetTrainerIdAsync();

            if (!trainerId.HasValue)
                return Unauthorized();

            var session = await GetOwnedSessionAsync(
                sessionId, trainerId.Value);

            if (session == null)
                return NotFound(new { message = "Session not found." });

            var survey = await _context.NFD_SessionSurveys
                .AsNoTracking()
                .Where(s => s.SessionId == sessionId)
                .Select(s => new
                {
                    s.SurveyId,
                    s.SessionId,
                    s.Question,
                    s.IsPublished,
                    s.CreatedAtUtc
                })
                .FirstOrDefaultAsync();

            if (survey == null)
                return NotFound(new { message = "Survey not found." });

            return Ok(survey);
        }

        // PUT: api/trainer/live-sessions/5/survey
        // Trainer Portal - Edit survey before any trainee responds.
        [HttpPut]
        public async Task<IActionResult> Update(
            int sessionId,
            [FromBody] CreateTrainerSessionSurveyDto dto)
        {
            var trainerId = await GetTrainerIdAsync();

            if (!trainerId.HasValue)
                return Unauthorized();

            var session = await GetOwnedSessionAsync(
                sessionId, trainerId.Value);

            if (session == null)
                return NotFound(new { message = "Session not found." });

            var survey = await _context.NFD_SessionSurveys
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (survey == null)
                return NotFound(new { message = "Survey not found." });

            var hasResponses =
                await _context.NFD_SessionSurveyResponses
                    .AnyAsync(r => r.SurveyId == survey.SurveyId);

            if (hasResponses && survey.Question != dto.Question.Trim())
                return Conflict(new
                {
                    message = "Question cannot change after responses."
                });

            survey.Question = dto.Question.Trim();
            survey.IsPublished = dto.IsPublished;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                survey.SurveyId,
                survey.SessionId,
                survey.Question,
                survey.IsPublished
            });
        }

        // GET: api/trainer/live-sessions/5/survey/results
        // Trainer Portal - Calculate rating and response statistics.
        [HttpGet("results")]
        public async Task<IActionResult> GetResults(int sessionId)
        {
            var trainerId = await GetTrainerIdAsync();

            if (!trainerId.HasValue)
                return Unauthorized();

            var session = await GetOwnedSessionAsync(
                sessionId, trainerId.Value);

            if (session == null)
                return NotFound(new { message = "Session not found." });

            var survey = await _context.NFD_SessionSurveys
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (survey == null)
                return NotFound(new { message = "Survey not found." });

            // Trainer Portal - Count distinct enrolled trainees.
            var enrolledCount = await _context.NFD_Enrollments
                .Where(e => e.BatchId == session.BatchId)
                .Select(e => e.TraineeId)
                .Distinct()
                .CountAsync();

            // Trainer Portal - Load trainee ratings and comments.
            var responses = await _context.NFD_SessionSurveyResponses
                .AsNoTracking()
                .Where(r => r.SurveyId == survey.SurveyId)
                .OrderByDescending(r => r.SubmittedAtUtc)
                .Select(r => new TrainerSurveyResponseDto(
                    r.TraineeId,
                    r.Rating,
                    r.Comment,
                    r.SubmittedAtUtc))
                .ToListAsync();

            var responseCount = responses.Count;

            var responseRate = enrolledCount == 0
                ? 0m
                : Math.Round(
                    (decimal)responseCount * 100 / enrolledCount, 2);

            decimal? averageRating = responseCount == 0
                ? null
                : Math.Round(
                    (decimal)responses.Average(r => r.Rating), 2);

            var report = new TrainerSurveyReportDto(
                survey.SurveyId,
                sessionId,
                survey.Question,
                survey.IsPublished,
                enrolledCount,
                responseCount,
                responseRate,
                averageRating,
                responses);

            return Ok(report);
        }
    }
}
