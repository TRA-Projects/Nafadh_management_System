#nullable disable
using System.Collections.Generic;

namespace Nafadh_Backend.IdentityAccess
{
    public class IdentityAccessUserRowDto
    {
        public string Id { get; set; }
        public int? ProfileId { get; set; }
        public string NameEn { get; set; }
        public string NameAr { get; set; }
        public string Email { get; set; }
        public int? UserTypeId { get; set; }
        public string UserTypeCode { get; set; }
        public string UserTypeNameEn { get; set; }
        public string UserTypeNameAr { get; set; }
        public int? UserGroupId { get; set; }
        public string UserGroupCode { get; set; }
        public string UserGroupNameEn { get; set; }
        public string UserGroupNameAr { get; set; }
        public bool IsActive { get; set; }
        public bool IsPrimary { get; set; }
        public bool HasRequesterCapability { get; set; }
        public bool CanRemove { get; set; }
        public bool IsSelf { get; set; }
    }

    public class IdentityAccessAccountRowDto
    {
        public string Id { get; set; }
        public int? UserGroupId { get; set; }
        public string UserGroupCode { get; set; }
        public string UserGroupNameEn { get; set; }
        public string UserGroupNameAr { get; set; }
        public string UserTypeCode { get; set; }
        public string UserTypeNameEn { get; set; }
        public string UserTypeNameAr { get; set; }
        public bool IsPrimary { get; set; }
        public bool IsCurrent { get; set; }
    }

    public class SwitchAccountRequestDto
    {
        public string UserId { get; set; }
    }

    public class IdentityAccessUserTypeDto
    {
        public int Id { get; set; }
        public string Code { get; set; }
        public string NameEn { get; set; }
        public string NameAr { get; set; }
        public int SortOrder { get; set; }
        public bool HasRequesterCapability { get; set; }
        public List<IdentityAccessUserGroupDto> Groups { get; set; } = new List<IdentityAccessUserGroupDto>();
    }

    public class IdentityAccessUserGroupDto
    {
        public int Id { get; set; }
        public int UserTypeId { get; set; }
        public string Code { get; set; }
        public string NameEn { get; set; }
        public string NameAr { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsProtected { get; set; }
        public bool CanDeactivate { get; set; }
        /// <summary>AspNet template role for this group (Type.Code) — used to assign pages.</summary>
        public string TemplateRoleId { get; set; }
        /// <summary>Internal AspNet role name (e.g. Corporate.SME).</summary>
        public string TemplateRoleName { get; set; }
        /// <summary>Localized template role label (same as group names).</summary>
        public string TemplateRoleNameEn { get; set; }
        public string TemplateRoleNameAr { get; set; }
    }

    public class UpsertUserGroupRequestDto
    {
        public int UserTypeId { get; set; }
        public string Code { get; set; }
        public string NameEn { get; set; }
        public string NameAr { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class ChangeUserGroupRequestDto
    {
        public int UserGroupId { get; set; }
    }

    public class CreateAdminUserRequestDto
    {
        public string Name { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public int UserGroupId { get; set; }

        // Required when creating an account for an existing organization.
        public int? OrganizationId { get; set; }
    }

    public class UpdateAdminUserRequestDto
    {
        public string Name { get; set; }
        public string Email { get; set; }
        public bool IsActive { get; set; }
    }

    public class IdentityAccessRoleRowDto
    {
        public string Id { get; set; }
        /// <summary>AspNet role name (stable key, e.g. Corporate.SME for templates).</summary>
        public string Name { get; set; }
        /// <summary>Localized display for lists (group name for templates; same as Name for custom).</summary>
        public string DisplayNameEn { get; set; }
        public string DisplayNameAr { get; set; }
        public int? UserTypeId { get; set; }
        public string UserTypeCode { get; set; }
        public string UserTypeNameEn { get; set; }
        public string UserTypeNameAr { get; set; }
        public int? UserGroupId { get; set; }
        public string UserGroupCode { get; set; }
        public string UserGroupNameEn { get; set; }
        public string UserGroupNameAr { get; set; }
        public bool IsTemplate { get; set; }
        public bool IsLocked { get; set; }
        public bool CanDelete { get; set; }
        public int? OrganizationId { get; set; }
        public string OrganizationNameEn { get; set; }
        public string OrganizationNameAr { get; set; }
        public string ParentRoleId { get; set; }
    }

    public class CreateCustomRoleRequestDto
    {
        public string Name { get; set; }
        public string ParentRoleId { get; set; }
        /// <summary>Optional. When omitted or &lt;= 0, the API uses the caller's organization.</summary>
        public int? OrganizationId { get; set; }
    }

    public class IdentityAccessOrganizationRowDto
    {
        public int Id { get; set; }
        public string NameEn { get; set; }
        public string NameAr { get; set; }
        public string CrNumber { get; set; }
    }

    public class IdentityAccessAppPageDto
    {
        public int Id { get; set; }
        public string Code { get; set; }
        public string SystemCode { get; set; }
        public string Url { get; set; }
        public string NameEn { get; set; }
        public string NameAr { get; set; }
        public int SortOrder { get; set; }
        public int RequiredActionFlags { get; set; }
        public string DefaultDataScope { get; set; }
    }

    public class IdentityAccessPageGrantDto
    {
        public int AppPageId { get; set; }
        public int ActionFlags { get; set; }
        public string DataScope { get; set; }
    }

    public class IdentityAccessRolePagesDto
    {
        public string RoleId { get; set; }
        /// <summary>Internal AspNet role name.</summary>
        public string RoleName { get; set; }
        public string RoleNameEn { get; set; }
        public string RoleNameAr { get; set; }
        public bool IsLocked { get; set; }
        public List<IdentityAccessAppPageDto> Pages { get; set; } = new List<IdentityAccessAppPageDto>();
        public List<int> SelectedPageIds { get; set; } = new List<int>();
        public List<IdentityAccessPageGrantDto> Grants { get; set; } = new List<IdentityAccessPageGrantDto>();
    }

    public class UpdateRolePagesRequestDto
    {
        public List<int> PageIds { get; set; } = new List<int>();
        public List<IdentityAccessPageGrantDto> Grants { get; set; } = new List<IdentityAccessPageGrantDto>();
    }

    public class UpdatePageRequirementsRequestDto
    {
        public int RequiredActionFlags { get; set; }
        public string DefaultDataScope { get; set; }
    }

    public class IdentityAccessPermissionDto
    {
        public bool Bypass { get; set; }
        public List<IdentityAccessPageGrantViewDto> Pages { get; set; } = new List<IdentityAccessPageGrantViewDto>();
    }

    public class IdentityAccessPageGrantViewDto
    {
        public int AppPageId { get; set; }
        public string Code { get; set; }
        public string Url { get; set; }
        public int ActionFlags { get; set; }
        public string DataScope { get; set; }
    }
}

namespace Nafadh_Backend.IdentityAccess
{
    public class PagedListResponseDto<T>
    {
        public System.Collections.Generic.List<T> rows { get; set; } = new System.Collections.Generic.List<T>();
        public int total { get; set; }
        public int pageIndex { get; set; }
        public int pageSize { get; set; }
    }
}
