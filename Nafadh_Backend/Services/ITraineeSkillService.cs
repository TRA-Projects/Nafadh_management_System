using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Services
{
    public interface ITraineeSkillService
    {
        Task<List<NFD_TraineeSkill>> GetByTraineeId(int traineeId);

        Task<NFD_TraineeSkill?> GetById(int id);

        Task<NFD_TraineeSkill> Add(TraineeSkillInputDTO dto);

        Task<NFD_TraineeSkill?> Update(
            int id,
            TraineeSkillInputDTO dto);

        Task<bool> Delete(int id);
    }
}