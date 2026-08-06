using Nafadh_Backend.Models;

namespace Nafadh_Backend.Services
{
    public interface ITaskService
    {
        Task<List<NFD_Task>> GetAllTasksAsync();

        Task<NFD_Task?> GetTaskByIdAsync(int taskId);

        Task AddTaskAsync(NFD_Task task);

        Task UpdateTaskAsync(NFD_Task task);

        Task DeleteTaskAsync(NFD_Task task);

        Task<List<NFD_Task>> GetTasksByBatchIdAsync(int batchId);

        Task<List<NFD_Rubric>> GetRubricsByTaskIdAsync(int taskId);

        Task<List<NFD_Submission>> GetSubmissionsByTaskIdAsync(int taskId);
    }
}