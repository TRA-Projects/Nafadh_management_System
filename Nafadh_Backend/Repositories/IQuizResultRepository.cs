
using System.Collections.Generic;
using System.Threading.Tasks;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IQuizResultRepository
    {
        // عرض نتائج اختبارات المدرب
        Task<List<NFD_QuizAttempt>> GetTrainerResultsAsync(
            int trainerId,
            int? quizId = null);

        // عرض نتائج المتدرب - نحافظ على الوظيفة الحالية
        Task<List<NFD_QuizAttempt>> GetTraineeResultsAsync(
            int traineeId);

        // عرض جميع نتائج المتدرب للأدمن
        Task<List<NFD_QuizAttempt>> GetAdminTraineeResultsAsync(
            int traineeId);

        // عرض تفاصيل محاولة محددة للمدرب
        Task<NFD_QuizAttempt?> GetTrainerAttemptDetailsAsync(
            int attemptId,
            int trainerId);
    }
}
