// Implemented by Noura 

using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Services
{
    public interface IPermissionService
    {
        Task<List<PermissionDTO>> GetAllAsync();
    }
}
