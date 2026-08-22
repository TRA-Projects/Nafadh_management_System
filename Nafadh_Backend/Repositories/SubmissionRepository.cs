using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class SubmissionRepository : ISubmissionRepository
    {

        private readonly Nafadhcontext _context;



        public SubmissionRepository(Nafadhcontext context)
        {
            _context = context;
        }




        // GET /api/Submission/task/{taskId}
        public async Task<IEnumerable<NFD_Submission>> GetSubmissionsByTaskIdAsync(int taskId)
        {

            return await _context.NFD_Submissions
                .Where(s => s.TaskId == taskId)
                .ToListAsync();

        }





        // GET /api/Submission/trainee/{traineeId}
        public async Task<IEnumerable<NFD_Submission>> GetSubmissionsByTraineeIdAsync(int traineeId)
        {

            return await _context.NFD_Submissions
                .Where(s => s.TraineeId == traineeId)
                .ToListAsync();

        }





        // GET /api/Submission/{id}
        public async Task<NFD_Submission?> GetSubmissionByIdAsync(int id)
        {

            return await _context.NFD_Submissions
                .FirstOrDefaultAsync(s => s.SubmissionId == id);

        }





        // POST
        public async Task AddSubmissionAsync(NFD_Submission submission)
        {

            await _context.NFD_Submissions.AddAsync(submission);

            await _context.SaveChangesAsync();

        }





        // PUT
        public async Task UpdateSubmissionAsync(NFD_Submission submission)
        {

            _context.NFD_Submissions.Update(submission);

            await _context.SaveChangesAsync();

        }

        public async Task<IEnumerable<NFD_Submission>>
    GetTrainerTaskSubmissionsAsync(int taskId)
        {
            return await _context.NFD_Submissions
                .Include(s => s.Trainee)
                    .ThenInclude(t => t.User)
                .Where(s => s.TaskId == taskId)
                .ToListAsync();
        }

    }
}