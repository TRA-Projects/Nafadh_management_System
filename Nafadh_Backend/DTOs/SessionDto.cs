using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class SessionDto
    {
        public int SessionId { get; set; }
        public int BatchId { get; set; }
        public int TrainerId { get; set; }
        public DateTime SessionDate { get; set; }
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
        public string? MeetingLink { get; set; }
        public string? Topic { get; set; }
        public string? LearningObjectives { get; set; }
        public string? RecordingUrl { get; set; }
        public string? Summary { get; set; }
        public NFD_SessionStatus Status { get; set; }

    }

    public class CreateSessionDto
    {
        public int BatchId { get; set; }
        public int TrainerId { get; set; }
        public DateTime SessionDate { get; set; }
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
        public string? MeetingLink { get; set; }
        public string? Topic { get; set; }
        public string? LearningObjectives { get; set; }
    }

    public class UpdateSessionDto
    {
        public string? Topic { get; set; }
        public string? MeetingLink { get; set; }
        public string? RecordingUrl { get; set; }
        public string? LearningObjectives { get; set; }
        public string? Summary { get; set; }
    }

    public class UpdateSessionStatusDto
    {
        public NFD_SessionStatus Status { get; set; }
    }

}
