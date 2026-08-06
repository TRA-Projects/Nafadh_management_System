
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface IUserRepository
    {
        Task<NFD_User?> GetByIdAsync(int userId);
        Task<NFD_User?> GetByIdWithRoleAsync(int userId);
        Task<NFD_User?> GetByEmailAsync(string email);
        Task<bool> EmailExistsAsync(string email, int? excludeUserId = null);

        Task<(List<NFD_User> Items, int TotalCount)> SearchAsync(
            int? roleId,
            NFD_UserStatus? status,
            string? searchTerm,
            int page,
            int pageSize);

        Task<NFD_User> AddAsync(NFD_User user);
        Task UpdateAsync(NFD_User user);

      
        Task<List<string>> GetPermissionKeysForUserAsync(int userId);
    }
}
