
using Azure.Core;
using Livekit.Server.Sdk.Dotnet;
using Microsoft.Extensions.Configuration;
using Nafadh_Backend.DTOs;
using System;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;


namespace Nafadh_Backend.Services
{
    // =====================================================
    // Trainer Portal - LiveKit Cloud Service
    // Responsible for secure live classroom operations.
    // =====================================================
    public class LiveKitService : ILiveKitService
    {
        private readonly string _serverUrl;
        private readonly string _apiKey;
        private readonly string _apiSecret;


        // Trainer Portal - LiveKit room management API client.
        private readonly RoomServiceClient _roomClient;


        // Trainer Portal - Read LiveKit credentials from
        // configuration / User Secrets, not hardcoded values.
        public LiveKitService(IConfiguration configuration)
        {
            _serverUrl = configuration["LiveKit:Url"]
                ?? throw new InvalidOperationException(
                    "LiveKit:Url is not configured.");

            _apiKey = configuration["LiveKit:ApiKey"]
                ?? throw new InvalidOperationException(
                    "LiveKit:ApiKey is not configured.");

            _apiSecret = configuration["LiveKit:ApiSecret"]
                ?? throw new InvalidOperationException(
                    "LiveKit:ApiSecret is not configured.");

            if (!_serverUrl.StartsWith(
                    "wss://", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "LiveKit:Url must start with wss://.");
            }

            // Trainer Portal - Use HTTPS for LiveKit server-side APIs.
            // The Angular client will continue using the WSS URL.
            var apiUrl = _serverUrl.Replace(
                "wss://", "https://", StringComparison.OrdinalIgnoreCase);

            _roomClient = new RoomServiceClient(
                apiUrl,
                _apiKey,
                _apiSecret);

        }

        // Trainer Portal - Generate a room name for each session.
        // A room is shared by the trainer and eligible trainees.
        private static string GetRoomName(int sessionId)
        {
            if (sessionId <= 0)
                throw new ArgumentOutOfRangeException(
                    nameof(sessionId));

            return $"nafadh-session-{sessionId}";
        }

        // Trainer Portal - Issue a short-lived participant token.
        // IMPORTANT: The Controller must verify identity, role,
        // session ownership or batch enrollment first.
        public Task<LiveRoomConnectionDto> CreateJoinTokenAsync(
            int sessionId,
            int userId,
            string participantRole,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (userId <= 0)
                throw new ArgumentOutOfRangeException(
                    nameof(userId));

            if (participantRole != "Trainer" &&
                participantRole != "Trainee")
            {
                throw new ArgumentException(
                    "Invalid participant role.",
                    nameof(participantRole));
            }

            var roomName = GetRoomName(sessionId);

            // Trainer Portal - Stable participant identity
            // to prevent duplicate connections for one user.

            // Trainer Portal - Distinguish trainer and trainee identities.
            // This lets moderation target trainees without muting trainers.
            var identity =
                $"nafadh-{participantRole.ToLowerInvariant()}-{userId}";

            var isTrainer = participantRole == "Trainer";

            // Trainer Portal - Room-scoped permissions.
            // Trainees start in listen-only mode.
            var grants = new VideoGrants
            {
                RoomJoin = true,
                Room = roomName,
                CanSubscribe = true,
                CanPublish = isTrainer,
                CanPublishData = isTrainer
            };

            // Trainer Portal - Keep join tokens valid for only five minutes.
            var expiresAtUtc = DateTime.UtcNow.AddMinutes(5);

            // Trainer Portal - Sign a JWT using the API Secret.
            // Never send the API Secret to Angular.
            // Trainer Portal - Explicitly use the LiveKit access token.
            var token = new Livekit.Server.Sdk.Dotnet.AccessToken(_apiKey, _apiSecret).WithIdentity(identity)
                .WithName(participantRole)
                .WithGrants(grants)
// Trainer Portal - Restrict the time available to initiate a connection.
.WithTtl(TimeSpan.FromMinutes(5));
            var jwt = token.ToJwt();


            var result = new LiveRoomConnectionDto
            {
                SessionId = sessionId,
                RoomName = roomName,
                ServerUrl = _serverUrl,
                ParticipantToken = jwt,
                TokenExpiresAtUtc = expiresAtUtc
            };

            return Task.FromResult(result);
        }

        // Trainer Portal - Room details implementation
        // will be added in the room-management step.

        // Trainer Portal - Get LiveKit room status and participant count.
        public async Task<LiveRoomDetailsDto> GetRoomDetailsAsync(
            int sessionId,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var roomName = GetRoomName(sessionId);

            // Trainer Portal - Query the actual LiveKit room.
            var request = new ListRoomsRequest();
            request.Names.Add(roomName);

            var response = await _roomClient.ListRooms(request);

            var room = response.Rooms.FirstOrDefault(
                r => r.Name == roomName);

            return new LiveRoomDetailsDto
            {
                SessionId = sessionId,
                RoomName = roomName,

                // Trainer Portal - Session topic will be loaded
                // from NFD_Sessions in the authorized Controller.
                Topic = string.Empty,

                // This describes room existence, not the
                // persisted session lifecycle in Nafadh.
                IsLive = room != null,

                ParticipantCount = room == null
                    ? 0
                    : (int)room.NumParticipants,

                // Trainer Portal - Actual recording status
                // will be connected to LiveKit Egress later.
                IsRecording = false
            };
        }


        // Trainer Portal - Attendance:
        // Retrieve trainees who are currently connected to this room.
        // This does not modify the database or existing LiveKit logic.
        public async Task<IReadOnlyList<string>> GetConnectedTraineeIdentitiesAsync(
            int sessionId,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();

            // Check whether the LiveKit room exists.
            var roomDetails = await GetRoomDetailsAsync(
                sessionId, cancellationToken);

            if (!roomDetails.IsLive)
            {
                return Array.Empty<string>();
            }

            // Retrieve participants from LiveKit Cloud.
            var request = new ListParticipantsRequest
            {
                Room = GetRoomName(sessionId)
            };

            var response = await _roomClient.ListParticipants(request);

            // Include only trainees, not the trainer.
            return response.Participants
                .Where(p =>
                    p.Identity.StartsWith(
                        "nafadh-trainee-",
                        StringComparison.Ordinal))
                .Select(p => p.Identity)
                .ToList();
        }



        // Trainer Portal - Room lifecycle implementation pending.

        // Trainer Portal - Create a LiveKit room for a session.
        // The Controller must verify trainer ownership before calling.
        public async Task<LiveRoomActionResultDto> StartRoomAsync(
            int sessionId,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var roomName = GetRoomName(sessionId);

            // Trainer Portal - Avoid creating a duplicate room.
            var existing = new ListRoomsRequest();
            existing.Names.Add(roomName);

            var rooms = await _roomClient.ListRooms(existing);

            if (rooms.Rooms.Any(r => r.Name == roomName))
            {
                return new LiveRoomActionResultDto
                {
                    Success = true,
                    Message = "Room already exists."
                };
            }

            // Trainer Portal - Create the session room.
            var request = new CreateRoomRequest
            {
                Name = roomName,
                EmptyTimeout = 600
            };

            await _roomClient.CreateRoom(request);

            return new LiveRoomActionResultDto
            {
                Success = true,
                Message = "LiveKit room created successfully."
            };
        }



        // Trainer Portal - Close the LiveKit room and disconnect
        // all participants currently connected to it.
        public async Task<LiveRoomActionResultDto> EndRoomAsync(
            int sessionId,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var roomName = GetRoomName(sessionId);

            // Trainer Portal - Check whether the room exists.
            var checkRequest = new ListRoomsRequest();
            checkRequest.Names.Add(roomName);

            var rooms = await _roomClient.ListRooms(checkRequest);

            if (!rooms.Rooms.Any(r => r.Name == roomName))
            {
                return new LiveRoomActionResultDto
                {
                    Success = true,
                    Message = "Room is already closed."
                };
            }

            // Trainer Portal - Delete the room from LiveKit.
            var deleteRequest = new DeleteRoomRequest
            {
                Room = roomName
            };

            await _roomClient.DeleteRoom(deleteRequest);

            return new LiveRoomActionResultDto
            {
                Success = true,
                Message = "LiveKit room closed successfully."
            };
        }


        // Trainer Portal - Moderation implementation pending.

        // Trainer Portal - Mute a trainee and prevent
        // microphone publishing until the trainer allows it.
        public async Task<LiveRoomActionResultDto> MuteParticipantAsync(
            int sessionId,
            string participantIdentity,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();

            // Trainer Portal - Revoke microphone publishing.
            return await UpdateAudioPermissionAsync(
                sessionId,
                participantIdentity,
                false,
                cancellationToken);
        }



        // Trainer Portal - Disable microphones for every
        // trainee currently connected to the live classroom.
        public async Task<LiveRoomActionResultDto> MuteAllTraineesAsync(
            int sessionId,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var roomName = GetRoomName(sessionId);

            // Trainer Portal - Load connected participants.
            var response = await _roomClient.ListParticipants(
                new ListParticipantsRequest
                {
                    Room = roomName
                });

            // Trainer Portal - Exclude the trainer and
            // non-trainee participants from moderation.
            var traineeIdentities = response.Participants
                .Where(p => p.Identity.StartsWith(
                    "nafadh-trainee-", StringComparison.Ordinal))
                .Select(p => p.Identity)
                .ToList();

            var mutedCount = 0;

            // Trainer Portal - Apply permissions for each trainee.
            foreach (var identity in traineeIdentities)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var result = await UpdateAudioPermissionAsync(
                    sessionId,
                    identity,
                    false,
                    cancellationToken);

                if (result.Success)
                {
                    mutedCount++;
                }
            }

            return new LiveRoomActionResultDto
            {
                Success = mutedCount == traineeIdentities.Count,
                Message = $"Microphone permissions disabled for " +
                          $"{mutedCount} of {traineeIdentities.Count} trainees."
            };
        }



        // Trainer Portal - Allow or prevent a trainee from
        // publishing microphone audio inside a LiveKit room.
        public async Task<LiveRoomActionResultDto> UpdateAudioPermissionAsync(
            int sessionId,
            string participantIdentity,
            bool canPublishAudio,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();

            // Trainer Portal - Never change trainer permissions
            // through the trainee microphone moderation function.
            if (string.IsNullOrWhiteSpace(participantIdentity) ||
                !participantIdentity.StartsWith(
                    "nafadh-trainee-", StringComparison.Ordinal))
            {
                return new LiveRoomActionResultDto
                {
                    Success = false,
                    Message = "Only trainee audio permissions can be changed."
                };
            }

            var roomName = GetRoomName(sessionId);

            // Trainer Portal - Verify the trainee is in this room.
            var participants = await _roomClient.ListParticipants(
                new ListParticipantsRequest
                {
                    Room = roomName
                });

            var trainee = participants.Participants.FirstOrDefault(
                p => p.Identity == participantIdentity);

            if (trainee == null)
            {
                return new LiveRoomActionResultDto
                {
                    Success = false,
                    Message = "Trainee is not connected to this room."
                };
            }

            // Trainer Portal - Preserve subscription access.
            // Allow only microphone publishing when enabled.
            var permission = new ParticipantPermission
            {
                CanSubscribe = true,
                CanPublish = canPublishAudio,
                CanPublishData = false
            };

            if (canPublishAudio)
            {
                permission.CanPublishSources.Add(
                    TrackSource.Microphone);
            }

            // Trainer Portal - Apply permissions on LiveKit server.
            // Revoking publishing permission also removes
            // the participant's currently published tracks.
            await _roomClient.UpdateParticipant(
                new UpdateParticipantRequest
                {
                    Room = roomName,
                    Identity = participantIdentity,
                    Permission = permission
                });

            return new LiveRoomActionResultDto
            {
                Success = true,
                Message = canPublishAudio
                    ? "Trainee microphone permission enabled."
                    : "Trainee microphone permission disabled."
            };
        }


        // Trainer Portal - Server-side recording will use
        // LiveKit Egress and secure external storage.
        public Task<LiveRoomRecordingDto> StartRecordingAsync(
            int sessionId,
            CancellationToken cancellationToken = default)
        {
            throw new NotImplementedException(
                "Recording start is not implemented yet.");
        }

        public Task<LiveRoomRecordingDto> StopRecordingAsync(
            int sessionId,
            CancellationToken cancellationToken = default)
        {
            throw new NotImplementedException(
                "Recording stop is not implemented yet.");
        }
    }
}
