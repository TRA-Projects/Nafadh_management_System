
using System;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    // =====================================================
    // Trainer Portal - LiveKit Room DTOs
    // Data contracts for live classroom management.
    // =====================================================

    // Request to join a live session.
    // User identity must come from the authenticated JWT.
    public class JoinLiveRoomRequestDto
    {
        [Range(1, int.MaxValue)]
        public int SessionId { get; set; }
    }

    // Connection details returned after authorization.
    public class LiveRoomConnectionDto
    {
        public int SessionId { get; set; }

        public string RoomName { get; set; } = string.Empty;

        public string ServerUrl { get; set; } = string.Empty;

        public string ParticipantToken { get; set; } = string.Empty;

        public DateTime TokenExpiresAtUtc { get; set; }
    }

    // Information about the live room.
    public class LiveRoomDetailsDto
    {
        public int SessionId { get; set; }

        public string RoomName { get; set; } = string.Empty;

        public string Topic { get; set; } = string.Empty;

        public bool IsLive { get; set; }

        public int ParticipantCount { get; set; }

        public bool IsRecording { get; set; }
    }

    // Request to mute a participant.
    public class MuteParticipantDto
    {
        [Required]
        public string ParticipantIdentity { get; set; }
            = string.Empty;
    }

    // Request to update publishing permissions.
    public class UpdateParticipantPermissionDto
    {
        [Required]
        public string ParticipantIdentity { get; set; }
            = string.Empty;

        public bool CanPublishAudio { get; set; }
    }

    // Response from room management operations.
    public class LiveRoomActionResultDto
    {
        public bool Success { get; set; }

        public string Message { get; set; } = string.Empty;
    }

    // Recording details.
    public class LiveRoomRecordingDto
    {
        public int SessionId { get; set; }

        public string? RecordingId { get; set; }

        public string Status { get; set; } = "NotStarted";

        public string? StorageKey { get; set; }

        public DateTime? StartedAtUtc { get; set; }

        public DateTime? CompletedAtUtc { get; set; }
    }
}
