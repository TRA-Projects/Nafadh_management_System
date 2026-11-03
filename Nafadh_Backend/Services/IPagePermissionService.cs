using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Services
{
   public interface IPagePermissionService
    {
        Task<List<UserPagePermissionDto>> GetMyPermissionsAsync(string? email, int? nfdUserId);
        Task<(bool Allowed, string DataScope)> CheckAccessAsync(string? email, int? nfdUserId, string pageCode, string requiredAction);
    }
}
