
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IRoleRepository
    {
        Task<List<NFD_Role>> GetAllAsync();
        Task<NFD_Role?> GetByIdAsync(int roleId);
        Task<NFD_Role?> GetByIdWithPermissionsAsync(int roleId);
        Task<bool> NameExistsAsync(string roleName, int? excludeRoleId = null);
        Task<NFD_Role> AddAsync(NFD_Role role);
        Task UpdateAsync(NFD_Role role);
        Task DeleteAsync(NFD_Role role);

        Task<bool> IsInUseAsync(int roleId);
    }
}
