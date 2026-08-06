using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class TaskRepository : ITaskRepository
    {
        private readonly Nafadhcontext _context;

        public TaskRepository(Nafadhcontext context)
        {
            _context = context;
        }

        // Get all tasks
        public async Task<List<NFD_Task>> GetAllTasksAsync()
        {
            return await _context.NFD_Tasks
                .Include(t => t.Batch)
                .Include(t => t.User)
                .ToListAsync();
        }

        // Get task by id
        public async Task<NFD_Task?> GetTaskByIdAsync(int taskId)
        {
            return await _context.NFD_Tasks
                .Include(t => t.Batch)
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.TaskId == taskId);
        }

        // Add task
        public async Task AddTaskAsync(NFD_Task task)
        {
            await _context.NFD_Tasks.AddAsync(task);
            await _context.SaveChangesAsync();
        }

        // Update task
        public async Task UpdateTaskAsync(NFD_Task task)
        {
            _context.NFD_Tasks.Update(task);
            await _context.SaveChangesAsync();
        }

        // Delete task
        public async Task DeleteTaskAsync(NFD_Task task)
        {
            _context.NFD_Tasks.Remove(task);
            await _context.SaveChangesAsync();
        }

        // Get tasks by batch
        public async Task<List<NFD_Task>> GetTasksByBatchIdAsync(int batchId)
        {
            return await _context.NFD_Tasks
                .Where(t => t.BatchId == batchId)
                .Include(t => t.Batch)
                .Include(t => t.User)
                .ToListAsync();
        }

        // Get rubrics of a task
        public async Task<List<NFD_Rubric>> GetRubricsByTaskIdAsync(int taskId)
        {
            return await _context.NFD_Rubrics
                .Where(r => r.TaskId == taskId)
                .ToListAsync();
        }

        // Get submissions of a task
        public async Task<List<NFD_Submission>> GetSubmissionsByTaskIdAsync(int taskId)
        {
            return await _context.NFD_Submissions
                .Where(s => s.TaskId == taskId)
                .Include(s => s.Trainee)
                .ToListAsync();
        }
    }
}