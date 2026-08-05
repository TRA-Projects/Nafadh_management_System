// Implemented by Noura

using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Services
{
    public interface IRoleService
    {
        Task<List<RoleDTO>> GetAllAsync();

        Task<RoleDetailDTO> GetByIdAsync(int roleId);

        Task<RoleDTO> CreateAsync(RoleCreateDTO dto);

        Task<RoleDTO> UpdateAsync(int roleId, RoleUpdateDTO dto);

        Task DeleteAsync(int roleId);

    }
}
