using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class TaskService : ITaskService
    {
        private readonly ITaskRepository _repository;

        public TaskService(ITaskRepository repository)
        {
            _repository = repository;
        }

        // Get all tasks
        public async Task<List<NFD_Task>> GetAllTasksAsync()
        {
            return await _repository.GetAllTasksAsync();
        }

        // Get task by id
        public async Task<NFD_Task?> GetTaskByIdAsync(int taskId)
        {
            return await _repository.GetTaskByIdAsync(taskId);
        }

        // Add task
        public async Task AddTaskAsync(NFD_Task task)
        {
            // Business logic can be added here before adding the task
            await _repository.AddTaskAsync(task);
        }

        // Update task
        public async Task UpdateTaskAsync(NFD_Task task)
        {
            // Business logic can be added here before updating the task
            await _repository.UpdateTaskAsync(task);
        }

        // Delete task
        public async Task DeleteTaskAsync(NFD_Task task)
        {
            // Business logic can be added here before deleting the task
            await _repository.DeleteTaskAsync(task);
        }

        // Get tasks by batch
        public async Task<List<NFD_Task>> GetTasksByBatchIdAsync(int batchId)
        {
            return await _repository.GetTasksByBatchIdAsync(batchId);
        }

        // Get rubrics by task
        public async Task<List<NFD_Rubric>> GetRubricsByTaskIdAsync(int taskId)
        {
            return await _repository.GetRubricsByTaskIdAsync(taskId);
        }

        // Get submissions by task
        public async Task<List<NFD_Submission>> GetSubmissionsByTaskIdAsync(int taskId)
        {
            return await _repository.GetSubmissionsByTaskIdAsync(taskId);
        }
    }
}