
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


            // Trainer Portal - Store the LiveKit attendance period.
            _context.NFD_SessionAttendancePeriods.Add(period);

            // Trainer Portal - Find existing attendance for this trainee.
            var attendance = await _context.NFD_SessionAttendances
                .FirstOrDefaultAsync(a =>
                    a.SessionId == sessionId &&
                    a.TraineeId == traineeId.Value);

            if (attendance == null)
            {
                // Trainer Portal - Create attendance only once.
                attendance = new NFD_SessionAttendance
                {
                    SessionId = sessionId,
                    TraineeId = traineeId.Value,
                    Status = NFD_AttendanceStatus.Present,
                    Note = "Automatically recorded by LiveKit"
                };

                _context.NFD_SessionAttendances.Add(attendance);
            }


            // Trainer Portal - Save attendance and the LiveKit period.
            try
            {
                await _context.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateException)
            {
                // Trainer Portal - Clear failed pending inserts.
                _context.ChangeTracker.Clear();

                // Trainer Portal - Check whether another request
                // already recorded this LiveKit participant.
                var periodExists = await _context.NFD_SessionAttendancePeriods
                    .AsNoTracking()
                    .AnyAsync(p => p.ParticipantSid == participantSid);

                if (periodExists)
                    return true;

                // Trainer Portal - A concurrent request may have created
                // the attendance record, but not this connection period.
                // Retry that period only.
                var attendanceExists = await _context.NFD_SessionAttendances
                    .AsNoTracking()
                    .AnyAsync(a =>
                        a.SessionId == sessionId &&
                        a.TraineeId == traineeId.Value);

                if (!attendanceExists)
                    throw;

                _context.NFD_SessionAttendancePeriods.Add(
                    new NFD_SessionAttendancePeriod
                    {
                        SessionId = sessionId,
                        TraineeId = traineeId.Value,
                        ParticipantSid = participantSid,
                        JoinedAtUtc = joinedAtUtc,
                        DurationSeconds = 0
                    });

                await _context.SaveChangesAsync();
                return true;
            }

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
        // Close any attendance periods still open when a session ends.
        public async Task<int> CloseOpenPeriodsAsync(
            int sessionId,
            DateTime endedAtUtc)
        {
            endedAtUtc = endedAtUtc.ToUniversalTime();

            var openPeriods = await _context.NFD_SessionAttendancePeriods
                .Where(p =>
                    p.SessionId == sessionId &&
                    p.LeftAtUtc == null)
                .ToListAsync();

            foreach (var period in openPeriods)
            {
                var leftAtUtc = endedAtUtc < period.JoinedAtUtc
                    ? period.JoinedAtUtc
                    : endedAtUtc;

                period.LeftAtUtc = leftAtUtc;

                var seconds = (leftAtUtc - period.JoinedAtUtc)
                    .TotalSeconds;

                period.DurationSeconds = (int)Math.Min(
                    int.MaxValue,
                    Math.Max(0, seconds));
            }

            if (openPeriods.Count > 0)
                await _context.SaveChangesAsync();

            return openPeriods.Count;
        }
    }
}
