
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class QuizResultRepository : IQuizResultRepository
    {
        private readonly Nafadhcontext _context;

        public QuizResultRepository(Nafadhcontext context)
        {
            _context = context;
        }

        // ==========================================
        // 1. عرض نتائج اختبارات المدرب
        // ==========================================
        public async Task<List<NFD_QuizAttempt>> GetTrainerResultsAsync(
            int trainerId,
            int? quizId = null)
        {
            var query = _context.NFD_QuizAttempts
                .AsNoTracking()
                .Include(a => a.Quiz)
                    .ThenInclude(q => q.Batch)
                .Include(a => a.Trainee)
                    .ThenInclude(t => t.User)
                .Include(a => a.AttemptQuestions)
                    .ThenInclude(aq => aq.Question)
                .Include(a => a.AttemptQuestions)
                    .ThenInclude(aq => aq.Answers)
                .Where(a => a.Quiz.TrainerId == trainerId);

            if (quizId.HasValue)
            {
                query = query.Where(a =>
                    a.QuizId == quizId.Value);
            }

            return await query
                .AsSplitQuery()
                .OrderByDescending(a => a.SubmittedAt)
                .ThenBy(a => a.Trainee.User.FullName)
                .ToListAsync();
        }

        // ==========================================
        // 2. نتائج المتدرب لنفسه
        // الحفاظ على سياسة عرض النتائج الحالية
        // ==========================================
        public async Task<List<NFD_QuizAttempt>> GetTraineeResultsAsync(
            int traineeId)
        {
            return await _context.NFD_QuizAttempts
                .AsNoTracking()
                .Include(a => a.Quiz)
                    .ThenInclude(q => q.Batch)
                .Include(a => a.Trainee)
                    .ThenInclude(t => t.User)
                .Where(a =>
                    a.TraineeId == traineeId &&
                    (
                        a.Status == "Terminated" ||

                        (
                            (
                                a.Status == "Submitted" ||
                                a.Status == "Expired"
                            ) &&

                            !a.AttemptQuestions.Any(aq =>
                                aq.Question.QuestionType ==
                                    NFD_QuizQuestionType.Essay &&

                                aq.Answers.Any(answer =>
                                    !answer.IsManuallyGraded))
                        )
                    ))
                .OrderByDescending(a => a.SubmittedAt)
                .ToListAsync();
        }

        // ==========================================
        // 3. جميع نتائج المتدرب للأدمن
        // هذه الدالة تحل مشكلة ظهور []
        // ==========================================
        public async Task<List<NFD_QuizAttempt>>
            GetAdminTraineeResultsAsync(int traineeId)
        {
            return await _context.NFD_QuizAttempts
                .AsNoTracking()

                // نحدد المتدرب فقط، بدون استبعاد
                // Graded أو Pending أو باقي الحالات
                .Where(a => a.TraineeId == traineeId)

                // معلومات الاختبار والدفعة
                .Include(a => a.Quiz)
                    .ThenInclude(q => q.Batch)

                // بيانات المتدرب
                .Include(a => a.Trainee)
                    .ThenInclude(t => t.User)

                // الأسئلة المطلوبة لحساب اكتمال التصحيح
                .Include(a => a.AttemptQuestions)
                    .ThenInclude(aq => aq.Question)

                // الإجابات والتصحيح اليدوي
                .Include(a => a.AttemptQuestions)
                    .ThenInclude(aq => aq.Answers)

                .AsSplitQuery()
                .OrderByDescending(a => a.StartedAt)
                .ThenByDescending(a => a.AttemptId)
                .ToListAsync();
        }

        // ==========================================
        // 4. تفاصيل محاولة للمدرب
        // ==========================================
        public async Task<NFD_QuizAttempt?>
            GetTrainerAttemptDetailsAsync(
                int attemptId,
                int trainerId)
        {
            return await _context.NFD_QuizAttempts
                .AsNoTracking()
                .Include(a => a.Quiz)
                .Include(a => a.Trainee)
                    .ThenInclude(t => t.User)
                .Include(a => a.AttemptQuestions)
                    .ThenInclude(aq => aq.Question)
                        .ThenInclude(q => q.Options)
                .Include(a => a.AttemptQuestions)
                    .ThenInclude(aq => aq.Answers)
                        .ThenInclude(answer => answer.SelectedOption)
                .AsSplitQuery()
                .FirstOrDefaultAsync(a =>
                    a.AttemptId == attemptId &&
                    a.Quiz.TrainerId == trainerId);
        }
    }
}
