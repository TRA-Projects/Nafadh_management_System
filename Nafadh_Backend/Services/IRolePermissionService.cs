// Implemented by Noura

using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Services
{
    public interface IRolePermissionService
    {
        Task<List<PermissionDTO>> GetByRoleIdAsync(int roleId);
        Task GrantAsync(GrantPermissionDTO dto);
        Task RevokeAsync(GrantPermissionDTO dto);

    }
}
