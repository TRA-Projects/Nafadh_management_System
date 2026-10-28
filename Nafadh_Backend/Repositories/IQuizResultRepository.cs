
using System.Collections.Generic;
using System.Threading.Tasks;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IQuizResultRepository
    {
        // نتائج اختبارات المدرب
        Task<List<NFD_QuizAttempt>> GetTrainerResultsAsync(
            int trainerId,
            int? quizId = null);

        // النتائج المسموح للمتدرب بمشاهدتها
        Task<List<NFD_QuizAttempt>> GetTraineeResultsAsync(
            int traineeId);

        // جميع محاولات المتدرب للأدمن
        Task<List<NFD_QuizAttempt>> GetAdminTraineeResultsAsync(
            int traineeId);

        // تفاصيل محاولة محددة للمدرب
        Task<NFD_QuizAttempt?> GetTrainerAttemptDetailsAsync(
            int attemptId,
            int trainerId);
    }
}
