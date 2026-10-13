using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface ITraineeSkillRepository
    {
        Task<List<NFD_TraineeSkill>> GetByTraineeId(int traineeId);

        Task<NFD_TraineeSkill?> GetById(int id);

        Task<NFD_TraineeSkill> Add(NFD_TraineeSkill traineeSkill);

        Task<NFD_TraineeSkill> Update(NFD_TraineeSkill traineeSkill);

        Task<bool> Delete(int id);
    }
}