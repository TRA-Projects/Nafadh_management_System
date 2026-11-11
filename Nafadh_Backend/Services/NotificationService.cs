using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _repository;
        private readonly IBatchService _batchService;

        public NotificationService(
      INotificationRepository repository,
      IBatchService batchService)
        {
            _repository = repository;
            _batchService = batchService;
        }

        public async Task<List<NotificationDTO>> GetByUserIdAsync(int userId)
        {
            var notifications = await _repository.GetByUserIdAsync(userId);
            return notifications.Select(n => new NotificationDTO
            {
                NotificationId = n.NotificationId,
                UserId = n.UserId,
                Title = n.Title,
                Message = n.Message,
                RelatedEntity = n.RelatedEntity,
                IsRead = n.IsRead,
                CreatedAt = DateTime.SpecifyKind(n.CreatedAt, DateTimeKind.Utc)
            }).ToList();
        }

        public async Task CreateAsync(CreateNotificationDTO dto)
        {
            var notification = new NFD_Notification
            {
                UserId = dto.UserId,
                Title = dto.Title,
                Message = dto.Message,
                RelatedEntity = dto.RelatedEntity,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            await _repository.AddAsync(notification);
        }

        // Kept for existing internal callers. New HTTP callers should use the owner-checked overload.
        public async Task MarkAsReadAsync(int id)
        {
            var notification = await _repository.GetByIdAsync(id);
            if (notification == null) throw new KeyNotFoundException("Notification not found");
            notification.IsRead = true;
            await _repository.UpdateAsync(notification);
        }

        public async Task MarkAsReadAsync(int id, int userId)
        {
            var notification = await _repository.GetByIdAsync(id);
            if (notification == null) throw new KeyNotFoundException("Notification not found");
            if (notification.UserId != userId) throw new UnauthorizedAccessException("You cannot modify another user's notification.");
            if (!notification.IsRead)
            {
                notification.IsRead = true;
                await _repository.UpdateAsync(notification);
            }
        }

        public async Task MarkAllAsReadAsync(int userId) => await _repository.MarkAllAsReadAsync(userId);

        public async Task<UnreadCountDTO> GetUnreadCountAsync(int userId)
        {
            return new UnreadCountDTO { Count = await _repository.GetUnreadCountAsync(userId) };
        }
  
    public async Task<int> SendToBatchAsync(
    int batchId,
    int? traineeId,
    string title,
    string message)
        {
            if (string.IsNullOrWhiteSpace(title) ||
                string.IsNullOrWhiteSpace(message))
            {
                throw new ArgumentException("عنوان الإشعار ومحتواه مطلوبان.");
            }

            var trainees = await _batchService.GetTraineesAsync(batchId);

            if (traineeId.HasValue)
            {
                trainees = trainees
                    .Where(t => t.TraineeId == traineeId.Value)
                    .ToList();
            }

            var userIds = trainees
                .Where(t => t.UserId > 0)
                .Select(t => t.UserId)
                .Distinct()
                .ToList();

            foreach (var userId in userIds)
            {
                await CreateAsync(new CreateNotificationDTO
                {
                    UserId = userId,
                    Title = title.Trim(),
                    Message = message.Trim(),
                    RelatedEntity = $"TrainerAnnouncement:{batchId}"
                });
            }

            return userIds.Count;
        }
        public async Task<bool> DeleteAsync(int id, int userId)
        {
            return await _repository.DeleteAsync(id, userId);
        }
    }
}