// Implemented by Noura

using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Services
{
    public interface IRoleService
    {
        Task<List<RoleDTO>> GetAllAsync();
      
    }
}
