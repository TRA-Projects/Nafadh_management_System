using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class RubricService : IRubricService
    {

        private readonly IRubricRepository _repository;



        public RubricService(IRubricRepository repository)
        {
            _repository = repository;
        }



        // Get all rubrics for specific task
        public async Task<IEnumerable<NFD_Rubric>> GetRubricsByTaskIdAsync(int taskId)
        {
            return await _repository.GetRubricsByTaskIdAsync(taskId);
        }





        // Get rubric by id
        public async Task<NFD_Rubric?> GetRubricByIdAsync(int id)
        {
            return await _repository.GetRubricByIdAsync(id);
        }





        // Add new rubric
        public async Task AddRubricAsync(NFD_Rubric rubric)
        {
            await _repository.AddRubricAsync(rubric);
        }





        // Update rubric
        public async Task UpdateRubricAsync(NFD_Rubric rubric)
        {
            await _repository.UpdateRubricAsync(rubric);
        }





        // Delete rubric
        public async Task DeleteRubricAsync(NFD_Rubric rubric)
        {
            await _repository.DeleteRubricAsync(rubric);
        }

    }
}