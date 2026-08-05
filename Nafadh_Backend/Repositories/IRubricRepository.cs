using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IRubricRepository
    {

        // Get all rubric criteria for a specific task
        Task<IEnumerable<NFD_Rubric>> GetRubricsByTaskIdAsync(int taskId);



        // Get rubric by id
        Task<NFD_Rubric?> GetRubricByIdAsync(int id);



        // Add new rubric
        Task AddRubricAsync(NFD_Rubric rubric);



        // Update rubric
        Task UpdateRubricAsync(NFD_Rubric rubric);



        // Delete rubric
        Task DeleteRubricAsync(NFD_Rubric rubric);

    }
}