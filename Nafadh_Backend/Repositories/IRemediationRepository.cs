using System.Collections.Generic;
using System.Threading.Tasks;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Interfaces
{
    public interface IRemediationRepository
    {
        Task<IEnumerable<RemediationRequest>> GetAllWithDetailsAsync(string? searchTerm = null, int? status = null);
        Task<RemediationRequest?> GetByIdWithDetailsAsync(int id);
        Task<RemediationRequest?> GetByIdAsync(int id);
        Task AddAsync(RemediationRequest entity);
        Task UpdateAsync(RemediationRequest entity);
    }
}