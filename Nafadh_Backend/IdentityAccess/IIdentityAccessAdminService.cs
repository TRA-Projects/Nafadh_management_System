#nullable disable
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Nafadh_Backend.IdentityAccess
{
    public interface IIdentityAccessAdminService
    {
        Task<PagedListResponseDto<IdentityAccessUserRowDto>> GetUsersPageAsync(
            int? pageIndex,
            int? pageSize,
            string q,
            int? userTypeId,
            int? userGroupId,
            bool? isActive,
            string callerUserId);

        Task<IdentityAccessUserRowDto> ChangeUserGroupAsync(string userId, int userGroupId, string callerUserId);

        Task<IdentityAccessUserRowDto> UpdateAdminUserAsync(string userId, UpdateAdminUserRequestDto body, string callerUserId);

        Task<IdentityAccessUserRowDto> AddProfileAccountAsync(string sourceUserId, int userGroupId, string callerUserId);

        Task<IdentityAccessUserRowDto> CreateAdminUserAsync(CreateAdminUserRequestDto body, string callerUserId);

        Task RemoveProfileAccountAsync(string userId, string callerUserId);

        Task<List<IdentityAccessUserTypeDto>> GetGroupsCatalogAsync(bool includeInactive = false);

        Task<IdentityAccessUserGroupDto> CreateUserGroupAsync(UpsertUserGroupRequestDto body, string callerUserId);

        Task<IdentityAccessUserGroupDto> UpdateUserGroupAsync(int groupId, UpsertUserGroupRequestDto body, string callerUserId);

        Task DeactivateUserGroupAsync(int groupId, string callerUserId);

        Task<PagedListResponseDto<IdentityAccessRoleRowDto>> GetRolesPageAsync(
            int? pageIndex,
            int? pageSize,
            string q,
            int? userTypeId,
            int? userGroupId,
            bool? templatesOnly);

        Task<IdentityAccessRoleRowDto> CreateCustomRoleAsync(CreateCustomRoleRequestDto body, string callerUserId);

        Task DeleteCustomRoleAsync(string roleId, string callerUserId);

        Task<IdentityAccessRolePagesDto> GetRolePagesAsync(string roleId);

        Task<IdentityAccessRolePagesDto> UpdateRolePagesAsync(string roleId, UpdateRolePagesRequestDto body, string callerUserId);

        Task<List<IdentityAccessAppPageDto>> GetPagesCatalogAsync();

        Task<IdentityAccessAppPageDto> UpdatePageRequirementsAsync(int pageId, UpdatePageRequirementsRequestDto body, string callerUserId);

        Task<PagedListResponseDto<IdentityAccessOrganizationRowDto>> GetOrganizationsPageAsync(
            int? pageIndex,
            int? pageSize,
            string q);

        Task<IdentityAccessPermissionDto> GetCurrentPermissionsAsync(string userId);
    }
}
