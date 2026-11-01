using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    // Trainer Portal - Live classroom session reports.
    [ApiController]
    [Authorize(Roles = "Trainer")]
    [Route("api/trainer/live-sessions/{sessionId:int}/report")]
    public class TrainerLiveSessionReportController : ControllerBase
    {
        private readonly Nafadhcontext _context;
        private readonly ILiveKitService _liveKit;

        public TrainerLiveSessionReportController(
            Nafadhcontext context,
            ILiveKitService liveKit)
        {
            _context = context;
            _liveKit = liveKit;
        }

        // GET: api/trainer/live-sessions/418/report
        [HttpGet]
        public async Task<IActionResult> GetReport(int sessionId)
        {
            var claim =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(claim, out var userId))
                return Unauthorized();

            // Verify trainer ownership and batch assignment.
            var session = await _context.NFD_Sessions
                .AsNoTracking()
                .Where(s =>
                    s.SessionId == sessionId &&
                    s.Trainer.UserId == userId &&
                    _context.NFD_BatchTrainers.Any(bt =>
                        bt.BatchId == s.BatchId &&
                        bt.TrainerId == s.TrainerId))
                .Select(s => new
                {
                    s.SessionId,
                    s.BatchId,
                    s.Topic,
                    s.Status
                })
                .FirstOrDefaultAsync(HttpContext.RequestAborted);

            if (session == null)
            {
                return NotFound(new
                {
                    message = "Session not found or access denied."
                });
            }

            // 1. Fetch enrolled trainees along with their FullName, TraineeId, and UserId.
            var trainees = await _context.NFD_Enrollments
                .AsNoTracking()
                .Where(e => e.BatchId == session.BatchId)
                .Select(e => new
                {
                    e.TraineeId,
                    e.Trainee.UserId,
                    FullName = e.Trainee.User.FullName
                })
                .Distinct()
                .ToListAsync(HttpContext.RequestAborted);

            var traineeIds = trainees.Select(t => t.TraineeId).ToList();

            // 2. Get connected trainee identities strictly from LiveKit service (Live Room)
            var identities = await _liveKit.GetConnectedTraineeIdentitiesAsync(
                sessionId,
                HttpContext.RequestAborted);

            const string traineePrefix = "nafadh-trainee-";
            var connectedUserIds = new HashSet<int>();

            foreach (var identity in identities)
            {
                if (!identity.StartsWith(traineePrefix, StringComparison.Ordinal))
                    continue;

                var userIdText = identity.Substring(traineePrefix.Length);
                if (int.TryParse(userIdText, out var parsedUserId))
                {
                    connectedUserIds.Add(parsedUserId);
                }
            }

            // 3. Read session evaluation scores (survey responses) for each trainee.
            var evaluationScores = await _context.NFD_SessionSurveyResponses
                .AsNoTracking()
                .Where(r => r.Survey.SessionId == sessionId)
                .ToDictionaryAsync(
                    r => r.TraineeId,
                    r => (int?)r.Rating,
                    HttpContext.RequestAborted);

            // 4. Build detailed attendance strictly based on LiveKit connection status.
            var attendanceList = trainees.Select(t => new
            {
                TraineeId = t.TraineeId,
                FullName = t.FullName,
                // يعتمد حصرياً على ما إذا كان الـ UserId الخاص بالمتدرب موجوداً في قائمة المتصلين حالياً بالميتنج
                IsPresent = connectedUserIds.Contains(t.UserId),
                EvaluationScore = evaluationScores.TryGetValue(t.TraineeId, out var rating) && rating.HasValue ? rating.Value.ToString() : null
            }).ToList();

            // Calculate aggregate counts strictly from live connection status.
            var presentCount = attendanceList.Count(a => a.IsPresent);
            var absentCount = attendanceList.Count - presentCount;

            var attendanceRate = traineeIds.Count == 0
                ? 0m
                : Math.Round(presentCount * 100m / traineeIds.Count, 2);

            // Poll results for this session.
            var polls = await _context.NFD_LivePolls
                .AsNoTracking()
                .Where(p => p.SessionId == sessionId)
                .OrderBy(p => p.CreatedAtUtc)
                .Select(p => new
                {
                    p.PollId,
                    p.Question,
                    p.IsOpen,
                    p.ClosedAtUtc,

                    TotalVotes = p.Votes.Count(),

                    Options = p.Options
                        .OrderBy(o => o.SortOrder)
                        .Select(o => new
                        {
                            o.OptionId,
                            o.OptionText,
                            VoteCount = o.Votes.Count()
                        })
                        .ToList()
                })
                .ToListAsync(HttpContext.RequestAborted);

            return Ok(new
            {
                session.SessionId,
                session.Topic,
                session.Status,

                Attendance = new
                {
                    TotalEnrolled = traineeIds.Count,
                    RecordedCount = presentCount,
                    PresentCount = presentCount,
                    AbsentCount = absentCount,
                    LateCount = 0,
                    ExcusedCount = 0,
                    NotRecordedCount = absentCount,
                    PresentPercentage = attendanceRate
                },

                AttendanceList = attendanceList,

                TotalPolls = polls.Count,
                Polls = polls
            });
        }
    }
}