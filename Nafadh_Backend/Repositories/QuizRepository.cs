
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class QuizRepository : IQuizRepository
    {
        private readonly Nafadhcontext _context;

        public QuizRepository(Nafadhcontext context)
        {
            _context = context;
        }

        // جميع اختبارات المدرب
        public async Task<IEnumerable<NFD_Quiz>>
            GetQuizzesByTrainerIdAsync(int trainerId)
        {
            return await _context.NFD_Quizzes
                .AsNoTracking()
                .Include(q => q.Batch)
                .Where(q => q.TrainerId == trainerId)
                .OrderByDescending(q => q.CreatedAt)
                .ToListAsync();
        }

        // تفاصيل الاختبار مع الأسئلة والدفعة
        public async Task<NFD_Quiz?> GetByIdAsync(int id)
        {
            return await _context.NFD_Quizzes
                .Include(q => q.Batch)
                .Include(q => q.QuizQuestions)
                .FirstOrDefaultAsync(q => q.QuizId == id);
        }

        // التأكد من ارتباط المدرب بالدفعة
        public async Task<bool> IsTrainerAssignedToBatchAsync(
      int trainerId, int batchId)
        {
            return await _context.NFD_Batches
                .AnyAsync(b =>
                    b.BatchId == batchId &&
                    b.BatchTrainers.Any(bt =>
                        bt.TrainerId == trainerId));
        }

        public async Task AddAsync(NFD_Quiz quiz)
        {
            await _context.NFD_Quizzes.AddAsync(quiz);
        }

        public Task UpdateAsync(NFD_Quiz quiz)
        {
            _context.NFD_Quizzes.Update(quiz);
            return Task.CompletedTask;
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }

        // اختبارات المتدرب المنشورة فقط
        public async Task<IEnumerable<NFD_Quiz>>
            GetQuizzesByTraineeIdAsync(int traineeId)
        {
            var batchIds = await _context.NFD_Enrollments
                .Where(e => e.TraineeId == traineeId)
                .Select(e => e.BatchId)
                .Distinct()
                .ToListAsync();

            return await _context.NFD_Quizzes
                .AsNoTracking()
                .Include(q => q.Batch)
                .Where(q =>
                    batchIds.Contains(q.BatchId) &&
                    (q.Status == NFD_QuizStatus.Scheduled ||
                     q.Status == NFD_QuizStatus.Open ||
                     q.Status == NFD_QuizStatus.Closed))
                .OrderByDescending(q => q.StartDateTime)
                .ToListAsync();
        }
    }
}
