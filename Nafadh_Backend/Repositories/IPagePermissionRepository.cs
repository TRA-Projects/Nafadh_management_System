using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Repositories
{
    public  interface IPagePermissionRepository
    {

        Task<List<UserPagePermissionDto>> GetUserNafadhPermissionsAsync(string? email, int? nfdUserId);
    }
}
