using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Nafadh_Backend.Services
{
    // التحقق من أن المستخدم (من الـ JWT) هو صاحب المتدرب/المحاولة/الاختبار
    public interface IQuizAccessService
    {
        Task<bool> TraineeOwnsTraineeIdAsync(ClaimsPrincipal user, int traineeId);
        Task<bool> TraineeOwnsAttemptAsync(ClaimsPrincipal user, int attemptId);
        Task<bool> TrainerOwnsTrainerIdAsync(ClaimsPrincipal user, int trainerId);
        Task<bool> CanReviewQuizAsync(ClaimsPrincipal user, int quizId);
        Task<bool> CanReviewAttemptAsync(ClaimsPrincipal user, int attemptId);
    }

    public class QuizAccessService : IQuizAccessService
    {
        private readonly Nafadhcontext _context;

        public QuizAccessService(Nafadhcontext context) => _context = context;

        private static int? UserId(ClaimsPrincipal user)
        {
            var v = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
            return int.TryParse(v, out var id) ? id : null;
        }

        public async Task<bool> TraineeOwnsTraineeIdAsync(ClaimsPrincipal user, int traineeId)
        {
            var uid = UserId(user);
            if (uid == null) return false;
            return await _context.NFD_Trainees
                .AnyAsync(t => t.TraineeId == traineeId && t.UserId == uid.Value);
        }

        public async Task<bool> TraineeOwnsAttemptAsync(ClaimsPrincipal user, int attemptId)
        {
            var uid = UserId(user);
            if (uid == null) return false;
            return await _context.NFD_QuizAttempts
                .AnyAsync(a => a.AttemptId == attemptId && a.Trainee.UserId == uid.Value);
        }

        public async Task<bool> TrainerOwnsTrainerIdAsync(ClaimsPrincipal user, int trainerId)
        {
            if (user.IsInRole("Admin")) return true;
            var uid = UserId(user);
            if (uid == null) return false;
            return await _context.NFD_Trainers
                .AnyAsync(t => t.TrainerId == trainerId && t.UserId == uid.Value);
        }

        public async Task<bool> CanReviewQuizAsync(ClaimsPrincipal user, int quizId)
        {
            if (user.IsInRole("Admin")) return true;
            var uid = UserId(user);
            if (uid == null) return false;
            return await _context.NFD_Quizzes
                .AnyAsync(q => q.QuizId == quizId && q.Trainer.UserId == uid.Value);
        }

        public async Task<bool> CanReviewAttemptAsync(ClaimsPrincipal user, int attemptId)
        {
            if (user.IsInRole("Admin")) return true;
            var uid = UserId(user);
            if (uid == null) return false;
            return await _context.NFD_QuizAttempts
                .AnyAsync(a => a.AttemptId == attemptId && a.Quiz.Trainer.UserId == uid.Value);
        }
    }
}