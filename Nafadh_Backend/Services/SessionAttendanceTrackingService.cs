
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.Services
{
    // Trainer Portal - Track LiveKit attendance periods.
    public class SessionAttendanceTrackingService
    {
        private readonly Nafadhcontext _context;

        public SessionAttendanceTrackingService(
            Nafadhcontext context)
        {
            _context = context;
        }

        // Trainer Portal - Record a trainee joining a LiveKit room.
        public async Task<bool> RecordJoinAsync(
            int sessionId,
            int userId,
            string participantSid,
            DateTime joinedAtUtc)
        {
            if (string.IsNullOrWhiteSpace(participantSid))
                return false;

            joinedAtUtc = joinedAtUtc.ToUniversalTime();

            // Trainer Portal - Find the session and its batch.
            var session = await _context.NFD_Sessions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session == null)
                return false;

            // Trainer Portal - Map LiveKit UserId to TraineeId.
            var traineeId = await _context.NFD_Trainees
                .Where(t => t.UserId == userId)
                .Select(t => (int?)t.TraineeId)
                .FirstOrDefaultAsync();

            if (!traineeId.HasValue)
                return false;

            // Trainer Portal - Verify enrollment in this session's batch.
            var enrolled = await _context.NFD_Enrollments
                .AnyAsync(e =>
                    e.BatchId == session.BatchId &&
                    e.TraineeId == traineeId.Value);

            if (!enrolled)
                return false;

            // Trainer Portal - Avoid duplicate join events.
            var exists = await _context.NFD_SessionAttendancePeriods
                .AnyAsync(p => p.ParticipantSid == participantSid);

            if (exists)
                return true;

            var period = new NFD_SessionAttendancePeriod
            {
                SessionId = sessionId,
                TraineeId = traineeId.Value,
                ParticipantSid = participantSid,
                JoinedAtUtc = joinedAtUtc,
                DurationSeconds = 0
            };

            _context.NFD_SessionAttendancePeriods.Add(period);
            await _context.SaveChangesAsync();

            return true;
        }

        // Trainer Portal - Record leaving and calculate duration.
        public async Task<bool> RecordLeaveAsync(
            int sessionId,
            string participantSid,
            DateTime leftAtUtc)
        {
            if (string.IsNullOrWhiteSpace(participantSid))
                return false;

            leftAtUtc = leftAtUtc.ToUniversalTime();

            var period = await _context.NFD_SessionAttendancePeriods
                .FirstOrDefaultAsync(p =>
                    p.SessionId == sessionId &&
                    p.ParticipantSid == participantSid);

            if (period == null)
                return false;

            // Trainer Portal - Duplicate leave events do not change duration.
            if (period.LeftAtUtc.HasValue)
                return true;

            if (leftAtUtc < period.JoinedAtUtc)
                leftAtUtc = period.JoinedAtUtc;

            period.LeftAtUtc = leftAtUtc;

            var seconds = (leftAtUtc - period.JoinedAtUtc)
                .TotalSeconds;

            period.DurationSeconds = (int)Math.Min(
                int.MaxValue,
                Math.Max(0, seconds));

            await _context.SaveChangesAsync();

            return true;
        }

        // Trainer Portal - Total completed attendance time.
        public async Task<int> GetTotalSecondsAsync(
            int sessionId,
            int traineeId)
        {
            return await _context.NFD_SessionAttendancePeriods
                .Where(p =>
                    p.SessionId == sessionId &&
                    p.TraineeId == traineeId &&
                    p.LeftAtUtc != null)
                .SumAsync(p => (int?)p.DurationSeconds) ?? 0;
        }
    }
}
