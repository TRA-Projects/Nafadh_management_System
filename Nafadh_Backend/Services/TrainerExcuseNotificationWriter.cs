using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.Services
{
    /// <summary>
    /// Adds one stored notification per supervisor and trainer attendance record.
    /// Call BEFORE the existing SaveChangesAsync, using the same DbContext.
    /// Does not change attendance, excuse review, or notification bell UI.
    /// </summary>
    internal static class TrainerExcuseNotificationWriter
    {
        public static async Task QueueFirstSubmissionAsync(
            Nafadhcontext context,
            NFD_TrainerAttendance attendance)
        {
            var key = $"TrainerExcuse:{attendance.TrainerAttendanceId}";
            var recipientIds = await context.Set<NFD_CompanySupervisor>()
                .AsNoTracking()
                .Where(s => s.CompanyId == attendance.CompanyId)
                .Select(s => s.UserId)
                .Distinct()
                .ToListAsync();

            if (recipientIds.Count == 0) return;

            var existingRecipientIds = await context.Set<NFD_Notification>()
                .AsNoTracking()
                .Where(n => n.RelatedEntity == key && recipientIds.Contains(n.UserId))
                .Select(n => n.UserId)
                .ToListAsync();
            var notified = existingRecipientIds.ToHashSet();

            // Check local tracked additions too, in case both reason and proof
            // are submitted before the DbContext is saved.
            foreach (var local in context.Set<NFD_Notification>().Local)
                if (local.RelatedEntity == key) notified.Add(local.UserId);

            var trainerName = await context.Set<NFD_Trainer>()
                .AsNoTracking()
                .Where(t => t.TrainerId == attendance.TrainerId)
                .Select(t => t.User.FullName)
                .FirstOrDefaultAsync() ?? $"#{attendance.TrainerId}";

            var statusLabel = attendance.Status switch
            {
                NFD_TrainerAttendanceStatus.Absent => "الغياب",
                NFD_TrainerAttendanceStatus.Late => "التأخير",
                NFD_TrainerAttendanceStatus.EarlyLeave => "الانصراف المبكر",
                _ => "الحضور"
            };
            var title = "عذر جديد من مدرب";
            var message = $"قام المدرب {trainerName} بإرفاق عذر أو إثبات لحالة {statusLabel} بتاريخ {attendance.Date:yyyy-MM-dd}.";

            foreach (var userId in recipientIds.Where(id => !notified.Contains(id)))
            {
                context.Set<NFD_Notification>().Add(new NFD_Notification
                {
                    UserId = userId,
                    Title = title,
                    Message = message,
                    RelatedEntity = key,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }
    }
}
