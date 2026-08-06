using Nafadh_Backend.Models;

namespace Nafadh_Backend.Services
{
    public interface IRubricService
    {

        // Get all rubrics for a task
        Task<IEnumerable<NFD_Rubric>> GetRubricsByTaskIdAsync(int taskId);



        // Get rubric by id
        Task<NFD_Rubric?> GetRubricByIdAsync(int id);



        // Add rubric
        Task AddRubricAsync(NFD_Rubric rubric);



        // Update rubric
        Task UpdateRubricAsync(NFD_Rubric rubric);



        // Delete rubric
        Task DeleteRubricAsync(NFD_Rubric rubric);

    }
}