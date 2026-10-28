
using System.Threading;
using System.Threading.Tasks;
using Nafadh_Backend.DTOs;
using System.Collections.Generic;

namespace Nafadh_Backend.Services
{
    // =====================================================
    // Trainer Portal - LiveKit Service Interface
    // Defines the operations needed for live classrooms.
    // =====================================================
    public interface ILiveKitService
    {
        // Trainer Portal - Create a secure connection token.
        // Authorization must be checked before calling this method.
        Task<LiveRoomConnectionDto> CreateJoinTokenAsync(
            int sessionId,
            int userId,
            string participantRole,
            CancellationToken cancellationToken = default);

        // Trainer Portal - Retrieve room details.
        Task<LiveRoomDetailsDto> GetRoomDetailsAsync(
            int sessionId,
            CancellationToken cancellationToken = default);


        // Trainer Portal - Attendance:
        // Get the identities of trainees currently connected to LiveKit.
        Task<IReadOnlyList<string>> GetConnectedTraineeIdentitiesAsync(
            int sessionId,
            CancellationToken cancellationToken = default);


        // Trainer Portal - Start a live classroom.
        Task<LiveRoomActionResultDto> StartRoomAsync(
            int sessionId,
            CancellationToken cancellationToken = default);

        // Trainer Portal - End a live classroom.
        Task<LiveRoomActionResultDto> EndRoomAsync(
            int sessionId,
            CancellationToken cancellationToken = default);

        // Trainer Portal - Mute one participant.
        Task<LiveRoomActionResultDto> MuteParticipantAsync(
            int sessionId,
            string participantIdentity,
            CancellationToken cancellationToken = default);

        // Trainer Portal - Mute all trainee participants.
        Task<LiveRoomActionResultDto> MuteAllTraineesAsync(
            int sessionId,
            CancellationToken cancellationToken = default);

        // Trainer Portal - Update participant audio permissions.
        Task<LiveRoomActionResultDto> UpdateAudioPermissionAsync(
            int sessionId,
            string participantIdentity,
            bool canPublishAudio,
            CancellationToken cancellationToken = default);

        // Trainer Portal - Start server-side recording.
        Task<LiveRoomRecordingDto> StartRecordingAsync(
            int sessionId,
            CancellationToken cancellationToken = default);

        // Trainer Portal - Stop server-side recording.
        Task<LiveRoomRecordingDto> StopRecordingAsync(
            int sessionId,
            CancellationToken cancellationToken = default);
    }
}
