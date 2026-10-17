using System.Collections.Generic;
using System.Threading.Tasks;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IQuizRepository
    {
        Task<IEnumerable<NFD_Quiz>> GetQuizzesByTrainerIdAsync(int trainerId);
        Task<IEnumerable<NFD_Quiz>> GetQuizzesByTraineeIdAsync(int traineeId);
        Task<NFD_Quiz> GetByIdAsync(int id);
        Task AddAsync(NFD_Quiz quiz);
        Task UpdateAsync(NFD_Quiz quiz);
        Task SaveChangesAsync();
    }
}