using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    /// <summary>
    /// Business logic for starting an approved company course plan from the trainer side.
    /// The trainer may start at any time after Authority approval; the plan dates do not block start.
    /// A mandatory reason is stored as a normal plan note for a complete audit trail.
    /// No plan StartDate restriction is applied here by design: the assigned trainer may start whenever appropriate after approval.
    /// </summary>
    public sealed class CoursePlanExecutionService : ICoursePlanExecutionService
    {
        private readonly ICoursePlanExecutionRepository _repository;

        public CoursePlanExecutionService(ICoursePlanExecutionRepository repository)
        {
            _repository = repository;
        }

        public async Task<CoursePlanStartResult> StartAsync(int planId, int trainerUserId, string note)
        {
            if (string.IsNullOrWhiteSpace(note))
                return CoursePlanStartResult.Fail(400, "ذكر سبب الشروع في الكورس مطلوب.");

            var cleanNote = note.Trim();
            if (cleanNote.Length > 2000)
                return CoursePlanStartResult.Fail(400, "ملاحظة الشروع لا تتجاوز 2000 حرف.");

            if (!await _repository.IsActiveTrainerUserAsync(trainerUserId))
                return CoursePlanStartResult.Fail(403, "حساب المدرب غير نشط أو غير مرتبط بملف مدرب.");

            var plan = await _repository.GetApprovedPlanForTrainerStartAsync(planId, trainerUserId);
            if (plan is null)
                return CoursePlanStartResult.Fail(404, "الخطة غير موجودة أو ليست معتمدة أو لا يوجد لك تكليف فيها.");

            if (plan.ExecutionStatus != NFD_CoursePlanExecutionStatus.NotStarted)
                return CoursePlanStartResult.Fail(409, "تم الشروع في هذا الكورس مسبقاً أو أن حالته لا تسمح بالشروع الآن.");

            const string notePrefix = "سبب الشروع في الكورس: ";
            if (cleanNote.Length > 2000 - notePrefix.Length)
                return CoursePlanStartResult.Fail(400, "ملاحظة الشروع طويلة جداً؛ الحد الأقصى 2000 حرف مع عنوان الملاحظة.");

            var now = DateTime.Now;
            plan.ExecutionStatus = NFD_CoursePlanExecutionStatus.InProgress;
            plan.StartedAt = now;
            plan.UpdatedAt = now;

            _repository.AddNote(new NFD_CoursePlanNote
            {
                PlanId = plan.PlanId,
                UserId = trainerUserId,
                Text = notePrefix + cleanNote,
                IsAuthority = false,
                CreatedAt = now
            });

            var supervisorIds = await _repository.GetCompanySupervisorUserIdsAsync(plan.CompanyId);
            foreach (var supervisorId in supervisorIds.Distinct())
            {
                _repository.AddNotification(new NFD_Notification
                {
                    UserId = supervisorId,
                    Title = "بدأ المدرب تنفيذ الكورس",
                    Message = $"بدأ المدرب تنفيذ خطة الكورس «{plan.Title}». تم تسجيل ملاحظة سبب الشروع ضمن سجل الخطة.",
                    RelatedEntity = $"CoursePlan:{plan.PlanId}",
                    IsRead = false,
                    CreatedAt = now
                });
            }

            await _repository.SaveChangesAsync();
            return CoursePlanStartResult.Ok(plan);
        }
    }
}
