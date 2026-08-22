using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class SubmissionService : ISubmissionService
    {

        private readonly ISubmissionRepository _repository;



        public SubmissionService(ISubmissionRepository repository)
        {
            _repository = repository;
        }





        public async Task<IEnumerable<NFD_Submission>> GetSubmissionsByTaskIdAsync(int taskId)
        {
            return await _repository.GetSubmissionsByTaskIdAsync(taskId);
        }





        public async Task<IEnumerable<NFD_Submission>> GetSubmissionsByTraineeIdAsync(int traineeId)
        {
            return await _repository.GetSubmissionsByTraineeIdAsync(traineeId);
        }





        public async Task<NFD_Submission?> GetSubmissionByIdAsync(int id)
        {
            return await _repository.GetSubmissionByIdAsync(id);
        }





        public async Task AddSubmissionAsync(NFD_Submission submission)
        {
            await _repository.AddSubmissionAsync(submission);
        }





        public async Task UpdateSubmissionAsync(NFD_Submission submission)
        {
            await _repository.UpdateSubmissionAsync(submission);
        }

        public async Task<IEnumerable<NFD_Submission>>
    GetTrainerTaskSubmissionsAsync(int taskId)
        {
            return await _repository
                .GetTrainerTaskSubmissionsAsync(taskId);
        }
    }
}