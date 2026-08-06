// Implemented by Noura 

using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IRolePermissionRepository
    {
        Task<List<NFD_RolePermission>> GetByRoleIdAsync(int roleId);
        Task<bool> ExistsAsync(int roleId, int permissionId);
        Task<NFD_RolePermission> AddAsync(NFD_RolePermission rolePermission);
        Task<bool> RemoveAsync(int roleId, int permissionId);

       
        // Atomically replaces every permission grant for a role with the given permission id set.
        
        Task ReplaceForRoleAsync(int roleId, List<int> permissionIds);
    }
}
