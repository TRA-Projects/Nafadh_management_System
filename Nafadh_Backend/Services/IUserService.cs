
// Implemented by Noura 

using Nafadh_Backend.Common;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.Services
{
    public interface IUserService
    {
        Task<UserResponseDTO> RegisterAsync(UserRegisterationDTO dto);

        Task<UserLoginResponseDTO> LoginAsync(UserLoginDTO dto);

        Task<UserResponseDTO?> GetByIdAsync(int userId);

        Task<UserResponseDTO> UpdateAsync(int userId, UserUpdateDTO dto);

        Task<UserResponseDTO> UpdateStatusAsync(int userId, UserStatusUpdateDTO dto);

        Task ResetPasswordAsync(int userId, AdminResetPasswordDTO dto);

        Task<PagedResult<UserResponseDTO>> SearchAsync(
            int? roleId,
            NFD_UserStatus? status,
            string? search,
            int page,
            int pageSize);

        Task<List<string>> GetEffectivePermissionsAsync(int userId);

        // Soft-deletes a user by flipping Status to Inactive rather than removing the row,
        // preserving referential history (audit logs, enrollments, etc.).
        Task DeactivateAsync(int userId);


    }
}
