using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface ISubmissionRepository
    {


        // Get submissions for a task
        Task<IEnumerable<NFD_Submission>> GetSubmissionsByTaskIdAsync(int taskId);



        // Get trainee submission history
        Task<IEnumerable<NFD_Submission>> GetSubmissionsByTraineeIdAsync(int traineeId);



        // Get submission details
        Task<NFD_Submission?> GetSubmissionByIdAsync(int id);



        // Add submission
        Task AddSubmissionAsync(NFD_Submission submission);



        // Update submission
        Task UpdateSubmissionAsync(NFD_Submission submission);



    }
}