
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Services
{
    public class TrainerLiveSessionService
    {
        private readonly Nafadhcontext _context;
        private readonly INotificationService _notificationService;

        public TrainerLiveSessionService(
            Nafadhcontext context,
            INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }


        private async Task NotifyBatchTraineesAsync(
            int batchId,
            string title,
            string message,
            int sessionId)
        {
            try
            {
                var userIds = await _context.NFD_Enrollments
                    .AsNoTracking()
                    .Where(e => e.BatchId == batchId)
                    .Select(e => e.Trainee.UserId)
                    .Distinct()
                    .ToListAsync();

                foreach (var userId in userIds)
                {
                    try
                    {
                        await _notificationService.CreateAsync(
                            new CreateNotificationDTO
                            {
                                UserId = userId,
                                Title = title,
                                Message = message,
                                RelatedEntity = $"Session:{sessionId}"
                            });
                    }
                    catch (Exception ex)
                    {
                        Console.Error.WriteLine(
                            $"Failed to notify user {userId} for session {sessionId}: {ex}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(
                    $"Failed to retrieve notification recipients for session {sessionId}: {ex}");
            }
        }

        // Identify the trainer from the authenticated user.
        public async Task<int?> GetTrainerIdAsync(int userId)
        {
            return await _context.NFD_Trainers
                .AsNoTracking()
                .Where(t => t.UserId == userId)
                .Select(t => (int?)t.TrainerId)
                .FirstOrDefaultAsync();
        }

        // Check whether a trainer is assigned to a batch.
        public async Task<bool> HasBatchAccessAsync(
            int trainerId, int batchId)
        {
            return await _context.NFD_BatchTrainers
                .AsNoTracking()
                .AnyAsync(bt =>
                    bt.TrainerId == trainerId &&
                    bt.BatchId == batchId);
        }

        // Get a session only if it belongs to this trainer
        // and the trainer is still assigned to its batch.
        private async Task<NFD_Session?> FindOwnedSessionAsync(
            int trainerId, int sessionId)
        {
            return await _context.NFD_Sessions
                .FirstOrDefaultAsync(s =>
                    s.SessionId == sessionId &&
                    s.TrainerId == trainerId &&
                    _context.NFD_BatchTrainers.Any(bt =>
                        bt.BatchId == s.BatchId &&
                        bt.TrainerId == trainerId));
        }

        private static TrainerLiveSessionDto MapSession(
            NFD_Session session)
        {
            return new TrainerLiveSessionDto
            {
                SessionId = session.SessionId,
                BatchId = session.BatchId,
                TrainerId = session.TrainerId,
                Topic = session.Topic,
                SessionDate = session.SessionDate,
                StartTime = session.StartTime,
                EndTime = session.EndTime,
                MeetingLink = session.MeetingLink,
                LearningObjectives = session.LearningObjectives,
                Summary = session.Summary,
                RecordingUrl = session.RecordingUrl,
                Status = session.Status,

                // Not persisted in the current database schema.
                IsLive = null,
                IsRecordingVisibleToTrainees = session.IsRecordingVisibleToTrainees
            };
        }

        private static bool IsValidWebexLink(string? link)
        {
            if (!Uri.TryCreate(
                    link,
                    UriKind.Absolute,
                    out var uri))
                return false;

            return uri.Scheme == Uri.UriSchemeHttps &&
                (uri.Host.Equals(
                    "webex.com",
                    StringComparison.OrdinalIgnoreCase)
                 || uri.Host.EndsWith(
                    ".webex.com",
                    StringComparison.OrdinalIgnoreCase));
        }

        private static bool IsValidTimeRange(
            string? startTime,
            string? endTime)
        {
            return TimeOnly.TryParse(startTime, out var start)
                && TimeOnly.TryParse(endTime, out var end)
                && end > start;
        }

        private async Task<bool> HasSessionConflictAsync(
            int trainerId,
            int batchId,
            DateTime sessionDate,
            string startTime,
            string endTime,
            int? excludeSessionId = null)
        {
            var sessions = await _context.NFD_Sessions
                .AsNoTracking()
                .Where(s =>
                    (s.TrainerId == trainerId || s.BatchId == batchId) &&
                    s.SessionDate.Date == sessionDate.Date &&
                    (s.Status == NFD_SessionStatus.Scheduled ||
                     s.Status == NFD_SessionStatus.Postponed) &&
                    (!excludeSessionId.HasValue ||
                     s.SessionId != excludeSessionId.Value))
                .Select(s => new
                {
                    s.StartTime,
                    s.EndTime
                })
                .ToListAsync();

            var newStart = TimeOnly.Parse(startTime);
            var newEnd = TimeOnly.Parse(endTime);

            return sessions.Any(s =>
                TimeOnly.TryParse(s.StartTime, out var existingStart) &&
                TimeOnly.TryParse(s.EndTime, out var existingEnd) &&
                newStart < existingEnd &&
                newEnd > existingStart);
        }

        // Retrieve sessions with filters and pagination.
        public async Task<TrainerLiveSessionPagedResultDto>
            GetSessionsAsync(
                int trainerId,
                TrainerLiveSessionFilterDto filter)
        {
            var query = _context.NFD_Sessions
                .AsNoTracking()
                .Where(s =>
                    s.TrainerId == trainerId &&
                    _context.NFD_BatchTrainers.Any(bt =>
                        bt.TrainerId == trainerId &&
                        bt.BatchId == s.BatchId));

            if (filter.BatchId.HasValue)
                query = query.Where(s =>
                    s.BatchId == filter.BatchId.Value);

            if (filter.Status.HasValue)
                query = query.Where(s =>
                    s.Status == filter.Status.Value);

            if (filter.FromDate.HasValue)
                query = query.Where(s =>
                    s.SessionDate >= filter.FromDate.Value);

            if (filter.ToDate.HasValue)
                query = query.Where(s =>
                    s.SessionDate <= filter.ToDate.Value);

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var search = filter.Search.Trim();

                query = query.Where(s =>
                    s.Topic != null &&
                    s.Topic.Contains(search));
            }

            var page = Math.Max(1, filter.Page);
            var pageSize = Math.Clamp(filter.PageSize, 1, 100);

            var totalCount = await query.CountAsync();

            var sessions = await query
                .OrderByDescending(s => s.SessionDate)
                .ThenByDescending(s => s.SessionId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new TrainerLiveSessionPagedResultDto
            {
                Items = sessions.Select(MapSession).ToList(),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        // Retrieve one authorized session.
        public async Task<TrainerLiveSessionDto?> GetByIdAsync(
            int trainerId,
            int sessionId)
        {
            var session = await FindOwnedSessionAsync(
                trainerId, sessionId);

            return session == null
                ? null
                : MapSession(session);
        }

        // Create a new scheduled session.
        public async Task<TrainerLiveSessionDto> CreateAsync(
            int trainerId,
            CreateTrainerLiveSessionDto dto)
        {
            if (!await HasBatchAccessAsync(
                    trainerId, dto.BatchId))
                throw new UnauthorizedAccessException(
                    "Trainer is not assigned to this batch.");

            if (string.IsNullOrWhiteSpace(dto.Topic))
                throw new ArgumentException(
                    "Session topic is required.");

            if (dto.SessionDate == default)
                throw new ArgumentException(
                    "Session date is required.");

            if (!IsValidTimeRange(
                    dto.StartTime, dto.EndTime))
                throw new ArgumentException(
                    "Invalid session time range.");

            // Trainer Portal - LiveKit sessions do not require a meeting link.
            // Validate legacy Webex links only when a link is supplied.
            if (!string.IsNullOrWhiteSpace(dto.MeetingLink) &&
                !IsValidWebexLink(dto.MeetingLink))
            {
                throw new ArgumentException(
                    "MeetingLink must be a valid HTTPS Webex link when provided.");
            }



            if (await HasSessionConflictAsync(
                trainerId,
                dto.BatchId,
                dto.SessionDate,
                dto.StartTime!,
                dto.EndTime!))
            {
                throw new InvalidOperationException(
                    "The trainer or batch already has a session at this time.");
            }

            var session = new NFD_Session
            {
                TrainerId = trainerId,
                BatchId = dto.BatchId,
                Topic = dto.Topic.Trim(),
                SessionDate = dto.SessionDate,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                MeetingLink = string.IsNullOrWhiteSpace(dto.MeetingLink)
    ? null
    : dto.MeetingLink.Trim(),
                LearningObjectives = dto.LearningObjectives,
                Status = NFD_SessionStatus.Scheduled
            };

            _context.NFD_Sessions.Add(session);
            await _context.SaveChangesAsync();

            await NotifyBatchTraineesAsync(
                session.BatchId,
                "New Live Session",
                $"A new live session has been scheduled: {session.Topic}.",
                session.SessionId);

            return MapSession(session);
        }

        // Update a scheduled or postponed session.
        public async Task<TrainerLiveSessionDto?> UpdateAsync(
            int trainerId,
            int sessionId,
            UpdateTrainerLiveSessionDto dto)
        {
            var session = await FindOwnedSessionAsync(
                trainerId, sessionId);

            if (session == null)
                return null;

            if (session.Status == NFD_SessionStatus.Completed ||
                session.Status == NFD_SessionStatus.Cancelled)
                throw new InvalidOperationException(
                    "Completed or cancelled sessions cannot be edited.");
            var oldDate = session.SessionDate;
            var oldStartTime = session.StartTime;
            var oldEndTime = session.EndTime;
            if (dto.Topic != null)
            {
                if (string.IsNullOrWhiteSpace(dto.Topic))
                    throw new ArgumentException(
                        "Session topic cannot be empty.");

                session.Topic = dto.Topic.Trim();
            }

            if (dto.SessionDate.HasValue)
            {
                if (dto.SessionDate.Value == default)
                    throw new ArgumentException(
                        "Invalid session date.");

                session.SessionDate = dto.SessionDate.Value;
            }

            var startTime = dto.StartTime ?? session.StartTime;
            var endTime = dto.EndTime ?? session.EndTime;

            if (!IsValidTimeRange(startTime, endTime))
                throw new ArgumentException(
                    "Invalid session time range.");

            session.StartTime = startTime;
            session.EndTime = endTime;


            // Trainer Portal - External meeting links are optional.
            // Empty string clears a legacy link; null leaves it unchanged.
            if (dto.MeetingLink != null)
            {
                if (!string.IsNullOrWhiteSpace(dto.MeetingLink) &&
                    !IsValidWebexLink(dto.MeetingLink))
                {
                    throw new ArgumentException(
                        "MeetingLink must be a valid HTTPS Webex link when provided.");
                }

                session.MeetingLink =
                    string.IsNullOrWhiteSpace(dto.MeetingLink)
                        ? null
                        : dto.MeetingLink.Trim();
            }


            if (dto.LearningObjectives != null)
                session.LearningObjectives =
                    dto.LearningObjectives;

            if (dto.Summary != null)
                session.Summary = dto.Summary;

            if (await HasSessionConflictAsync(
                trainerId,
                session.BatchId,
                session.SessionDate,
                session.StartTime!,
                session.EndTime!,
                session.SessionId))
            {
                throw new InvalidOperationException(
                    "The updated session conflicts with another session.");
            }


            var scheduleChanged =
                oldDate != session.SessionDate ||
                oldStartTime != session.StartTime ||
                oldEndTime != session.EndTime;

            await _context.SaveChangesAsync();

            if (scheduleChanged)
            {
                await NotifyBatchTraineesAsync(
                    session.BatchId,
                    "Live Session Schedule Updated",
                    $"The schedule for '{session.Topic}' has been updated.",
                    session.SessionId);
            }

            return MapSession(session);

        }

        // Postpone a session and set its new schedule.
        public async Task<TrainerLiveSessionDto?> PostponeAsync(
            int trainerId,
            int sessionId,
            PostponeTrainerLiveSessionDto dto)
        {
            var session = await FindOwnedSessionAsync(
                trainerId, sessionId);

            if (session == null)
                return null;

            if (session.Status != NFD_SessionStatus.Scheduled &&
                session.Status != NFD_SessionStatus.Postponed)
                throw new InvalidOperationException(
                    "This session cannot be postponed.");

            if (!dto.NewSessionDate.HasValue ||
                dto.NewSessionDate.Value == default ||
                !IsValidTimeRange(
                    dto.NewStartTime, dto.NewEndTime))
                throw new ArgumentException(
                    "A valid new date and time are required.");


            if (await HasSessionConflictAsync(
                trainerId,
                session.BatchId,
                dto.NewSessionDate.Value,
                dto.NewStartTime!,
                dto.NewEndTime!,
                session.SessionId))
            {
                throw new InvalidOperationException(
                    "The new session schedule conflicts with another session.");
            }


            session.SessionDate = dto.NewSessionDate.Value;
            session.StartTime = dto.NewStartTime;
            session.EndTime = dto.NewEndTime;
            session.Status = NFD_SessionStatus.Postponed;

            // Reason is not stored because the current
            // session model has no postponement reason field.

            await _context.SaveChangesAsync();

            await NotifyBatchTraineesAsync(
                session.BatchId,
                "Live Session Postponed",
                $"The live session '{session.Topic}' has been rescheduled.",
                session.SessionId);

            return MapSession(session);
        }

        // Change session status using allowed transitions.
        public async Task<TrainerLiveSessionDto?> ChangeStatusAsync(
            int trainerId,
            int sessionId,
            ChangeTrainerLiveSessionStatusDto dto)
        {
            var session = await FindOwnedSessionAsync(
                trainerId, sessionId);

            if (session == null)
                return null;

            if (!dto.Status.HasValue ||
                !Enum.IsDefined(typeof(NFD_SessionStatus),
                    dto.Status.Value))
                throw new ArgumentException(
                    "Invalid session status.");

            var nextStatus = dto.Status.Value;

            if (session.Status == NFD_SessionStatus.Completed ||
                session.Status == NFD_SessionStatus.Cancelled)
                throw new InvalidOperationException(
                    "This session has a final status.");


            if (nextStatus != NFD_SessionStatus.InProgress &&
                nextStatus != NFD_SessionStatus.Completed &&
                nextStatus != NFD_SessionStatus.Cancelled)
            {
                throw new InvalidOperationException(
                    "Invalid session status transition.");
            }

            bool validTransition =
                ((session.Status == NFD_SessionStatus.Scheduled ||
                  session.Status == NFD_SessionStatus.Postponed) &&
                 (nextStatus == NFD_SessionStatus.InProgress ||
                  nextStatus == NFD_SessionStatus.Cancelled))
                ||
                (session.Status == NFD_SessionStatus.InProgress &&
                 (nextStatus == NFD_SessionStatus.Completed ||
                  nextStatus == NFD_SessionStatus.Cancelled));

            if (!validTransition)
            {
                throw new InvalidOperationException(
                    "This status transition is not allowed.");
            }

            session.Status = nextStatus;

            // Reason is not stored in the current schema.
            await _context.SaveChangesAsync();

            if (nextStatus == NFD_SessionStatus.Cancelled)
            {
                await NotifyBatchTraineesAsync(
                    session.BatchId,
                    "Live Session Cancelled",
                    $"The live session '{session.Topic}' has been cancelled.",
                    session.SessionId);
            }

            return MapSession(session);
        }

        // Save or update the session summary.
        public async Task<TrainerLiveSessionDto?> UpdateSummaryAsync(
            int trainerId,
            int sessionId,
            UpdateTrainerLiveSessionSummaryDto dto)
        {
            var session = await FindOwnedSessionAsync(
                trainerId, sessionId);

            if (session == null)
                return null;

            if (session.Status == NFD_SessionStatus.Cancelled)
                throw new InvalidOperationException(
                    "Cancelled sessions cannot have summaries.");

            session.Summary = dto.Summary;

            await _context.SaveChangesAsync();

            return MapSession(session);
        }

        // List attendance records for an authorized session.

        public async Task<List<TrainerSessionAttendanceDto>?>
            GetAttendanceAsync(int trainerId, int sessionId)
        {
            var session = await FindOwnedSessionAsync(
                trainerId, sessionId);

            if (session == null)
                return null;

            var traineeIds = await _context.NFD_Enrollments
                .AsNoTracking()
                .Where(e => e.BatchId == session.BatchId)
                .Select(e => e.TraineeId)
                .Distinct()
                .OrderBy(id => id)
                .ToListAsync();

            var attendanceRecords = await _context.NFD_SessionAttendances
                .AsNoTracking()
                .Where(a => a.SessionId == sessionId)
                .ToListAsync();

            return traineeIds.Select(traineeId =>
            {
                var attendance = attendanceRecords
                    .FirstOrDefault(a => a.TraineeId == traineeId);

                return new TrainerSessionAttendanceDto
                {
                    AttendanceId = attendance?.AttendanceId ?? 0,
                    SessionId = sessionId,
                    TraineeId = traineeId,
                    Status = attendance?.Status,
                    Note = attendance?.Note
                };
            }).ToList();
        }

        // Create or update attendance for an enrolled trainee.

        public async Task<TrainerSessionAttendanceDto?>
            UpdateAttendanceAsync(
                int trainerId,
                int sessionId,
                int traineeId,
                UpdateTrainerSessionAttendanceDto dto)
        {
            var session = await FindOwnedSessionAsync(
                trainerId, sessionId);

            if (session == null)
                return null;

            if (session.Status == NFD_SessionStatus.Cancelled)
                throw new InvalidOperationException(
                    "Cannot record attendance for a cancelled session.");

            if (!dto.Status.HasValue ||
                !Enum.IsDefined(typeof(NFD_AttendanceStatus), dto.Status.Value))
                throw new ArgumentException(
                    "Invalid attendance status.");

            var isEnrolled = await _context.NFD_Enrollments
                .AsNoTracking()
                .AnyAsync(e =>
                    e.BatchId == session.BatchId &&
                    e.TraineeId == traineeId);

            if (!isEnrolled)
                throw new InvalidOperationException(
                    "Trainee is not enrolled in this session batch.");

            var attendance = await _context.NFD_SessionAttendances
                .FirstOrDefaultAsync(a =>
                    a.SessionId == sessionId &&
                    a.TraineeId == traineeId);

            if (attendance == null)
            {
                attendance = new NFD_SessionAttendance
                {
                    SessionId = sessionId,
                    TraineeId = traineeId,
                    Status = dto.Status.Value,
                    Note = dto.Note
                };

                _context.NFD_SessionAttendances.Add(attendance);
            }
            else
            {
                attendance.Status = dto.Status.Value;
                attendance.Note = dto.Note;
            }

            await _context.SaveChangesAsync();

            return new TrainerSessionAttendanceDto
            {
                AttendanceId = attendance.AttendanceId,
                SessionId = attendance.SessionId,
                TraineeId = attendance.TraineeId,
                Status = attendance.Status,
                Note = attendance.Note
            };
        }

        // Control whether trainees can view the session recording.
        public async Task<TrainerSessionRecordingDto?>
            UpdateRecordingVisibilityAsync(
                int trainerId,
                int sessionId,
                UpdateTrainerRecordingVisibilityDto dto)
        {
            var session = await FindOwnedSessionAsync(
                trainerId, sessionId);

            if (session == null)
                return null;

            if (session.Status == NFD_SessionStatus.Cancelled)
                throw new InvalidOperationException(
                    "Cannot change recording visibility for a cancelled session.");

            if (string.IsNullOrWhiteSpace(session.RecordingUrl))
                throw new InvalidOperationException(
                    "Upload a recording before changing its visibility.");

            bool wasVisible = session.IsRecordingVisibleToTrainees;

            session.IsRecordingVisibleToTrainees =
                dto.IsVisibleToTrainees;

            await _context.SaveChangesAsync();

            if (!wasVisible && dto.IsVisibleToTrainees)
            {
                await NotifyBatchTraineesAsync(
                    session.BatchId,
                    "Session Recording Available",
                    $"The recording for '{session.Topic}' is now available.",
                    session.SessionId);
            }

            return new TrainerSessionRecordingDto
            {
                SessionId = session.SessionId,
                RecordingUrl = session.RecordingUrl,
                IsVisibleToTrainees =
                    session.IsRecordingVisibleToTrainees
            };
        }
    }
}
