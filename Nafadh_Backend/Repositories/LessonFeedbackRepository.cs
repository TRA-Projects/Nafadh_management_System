using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Interfaces;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class LessonFeedbackRepository : ILessonFeedbackRepository
    {
        private readonly Nafadhcontext _context;

        public LessonFeedbackRepository(Nafadhcontext context)
        {
            _context = context;
        }

        public async Task<NFD_LessonFeedback?> GetByTraineeAndLessonAsync(
            int traineeId,
            int lessonId)
        {
            return await _context.NFD_LessonFeedbacks
                .FirstOrDefaultAsync(x =>
                    x.TraineeId == traineeId &&
                    x.LessonId == lessonId);
        }

        public async Task<NFD_LessonFeedback> AddAsync(
            NFD_LessonFeedback feedback)
        {
            await _context.NFD_LessonFeedbacks.AddAsync(feedback);

            await _context.SaveChangesAsync();

            return feedback;
        }

        public async Task UpdateAsync(
            NFD_LessonFeedback feedback)
        {
            _context.NFD_LessonFeedbacks.Update(feedback);

            await _context.SaveChangesAsync();
        }

        public async Task<bool> LessonExistsAsync(int lessonId)
        {
            return await _context.NFD_Lessons
                .AnyAsync(x => x.LessonId == lessonId);
        }

        public async Task<bool> TraineeExistsAsync(int traineeId)
        {
            return await _context.NFD_Trainees
                .AnyAsync(x => x.TraineeId == traineeId);
        }
    }
}