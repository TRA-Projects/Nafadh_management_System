
// Implemented by Noura 

using Nafadh_Backend.Common;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.Services
{
    public interface IUserService
    {
        Task<UserResponseDTO> RegisterAsync(UserRegisterationDTO dto);
     
    }
}
