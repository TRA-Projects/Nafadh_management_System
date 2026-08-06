using Nafadh_Backend.Models;

namespace Nafadh_Backend.Services
{
    public interface ISubmissionService
    {


        Task<IEnumerable<NFD_Submission>> GetSubmissionsByTaskIdAsync(int taskId);



        Task<IEnumerable<NFD_Submission>> GetSubmissionsByTraineeIdAsync(int traineeId);



        Task<NFD_Submission?> GetSubmissionByIdAsync(int id);



        Task AddSubmissionAsync(NFD_Submission submission);



        Task UpdateSubmissionAsync(NFD_Submission submission);


    }
}