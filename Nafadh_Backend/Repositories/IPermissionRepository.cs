// Implemented by Noura 

using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IPermissionRepository
    {
        Task<List<NFD_Permission>> GetAllAsync();
        Task<NFD_Permission?> GetByIdAsync(int permissionId);
        Task<bool> KeyExistsAsync(string permissionKey, int? excludePermissionId = null);
        Task<NFD_Permission> AddAsync(NFD_Permission permission);
        Task UpdateAsync(NFD_Permission permission);
        Task DeleteAsync(NFD_Permission permission);

        // True if this permission is currently granted to at least one role - used to block deletion.
       
        Task<bool> IsInUseAsync(int permissionId);
    }
}
