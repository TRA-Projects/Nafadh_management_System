using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface ITrainerCertificateRepository
    {
        Task<List<NFD_TrainerCertificate>> GetByTrainerIdAsync(int trainerId);
        Task<NFD_TrainerCertificate?> GetByIdAsync(int id);
        Task AddAsync(NFD_TrainerCertificate certificate);
        Task<bool> DeleteAsync(int id);
    }
}