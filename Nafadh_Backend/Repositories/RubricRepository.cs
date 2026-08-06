using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class RubricRepository : IRubricRepository
    {

        private readonly Nafadhcontext _context;



        public RubricRepository(Nafadhcontext context)
        {
            _context = context;
        }



        // GET /api/Rubric/task/{taskId}
        // Get all rubrics for specific task
        public async Task<IEnumerable<NFD_Rubric>> GetRubricsByTaskIdAsync(int taskId)
        {

            return await _context.NFD_Rubrics
                .Where(r => r.TaskId == taskId)
                .ToListAsync();

        }




        // Get rubric by id
        public async Task<NFD_Rubric?> GetRubricByIdAsync(int id)
        {

            return await _context.NFD_Rubrics
                .FirstOrDefaultAsync(r => r.RubricId == id);

        }




        // POST /api/Rubric
        // Add new rubric criterion
        public async Task AddRubricAsync(NFD_Rubric rubric)
        {

            await _context.NFD_Rubrics.AddAsync(rubric);

            await _context.SaveChangesAsync();

        }




        // PUT /api/Rubric/{id}
        // Update rubric
        public async Task UpdateRubricAsync(NFD_Rubric rubric)
        {

            _context.NFD_Rubrics.Update(rubric);

            await _context.SaveChangesAsync();

        }




        // DELETE /api/Rubric/{id}
        // Delete rubric
        public async Task DeleteRubricAsync(NFD_Rubric rubric)
        {

            _context.NFD_Rubrics.Remove(rubric);

            await _context.SaveChangesAsync();

        }

    }
}