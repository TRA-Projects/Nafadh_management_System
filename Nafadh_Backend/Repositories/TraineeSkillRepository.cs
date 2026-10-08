using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class TraineeSkillRepository : ITraineeSkillRepository
    {
        private readonly Nafadhcontext _context;

        public TraineeSkillRepository(Nafadhcontext context)
        {
            _context = context;
        }

        public async Task<List<NFD_TraineeSkill>> GetByTraineeId(int traineeId)
        {
            return await _context.NFD_TraineeSkills
                .Where(x => x.TraineeId == traineeId)
                .ToListAsync();
        }

        public async Task<NFD_TraineeSkill?> GetById(int id)
        {
            return await _context.NFD_TraineeSkills
                .FirstOrDefaultAsync(x => x.TraineeSkillId == id);
        }

        public async Task<NFD_TraineeSkill> Add(NFD_TraineeSkill traineeSkill)
        {
            _context.NFD_TraineeSkills.Add(traineeSkill);

            await _context.SaveChangesAsync();

            return traineeSkill;
        }

        public async Task<NFD_TraineeSkill> Update(NFD_TraineeSkill traineeSkill)
        {
            _context.NFD_TraineeSkills.Update(traineeSkill);

            await _context.SaveChangesAsync();

            return traineeSkill;
        }

        public async Task<bool> Delete(int id)
        {
            var traineeSkill = await _context.NFD_TraineeSkills
                .FirstOrDefaultAsync(x => x.TraineeSkillId == id);

            if (traineeSkill == null)
            {
                return false;
            }

            _context.NFD_TraineeSkills.Remove(traineeSkill);

            await _context.SaveChangesAsync();

            return true;
        }
    }
}