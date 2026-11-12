#nullable disable
using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace Nafadh_Backend.IdentityAccess
{
    public static class IdentityAccessAdminRules
    {
        private static readonly Regex GroupCodePattern = new Regex("^[A-Za-z][A-Za-z0-9]{1,49}$", RegexOptions.Compiled);
        private static readonly HashSet<string> DataScopes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            PageDataScopes.Mine,
            PageDataScopes.Organization,
            PageDataScopes.Department,
            PageDataScopes.Assigned,
            PageDataScopes.Everything
        };

        private static readonly string[] AlwaysVisiblePaths =
        {
            "/login",
            "/staff/login",
            "/landing",
            "/complete-profile",
            "/jobseeker/dashboard",
            "/operator/dashboard",
            "/admin/dashboard",
            "/settings"
        };

        public static bool NeedsOrganization(string userTypeCode)
            => string.Equals(userTypeCode, UserTypeCodes.Corporate, StringComparison.OrdinalIgnoreCase);

        /// <summary>
        /// Requester capability is attached to the Individual user type (not a separate account type).
        /// Every Individual group can post a service request, receive offers, and manage the engagement.
        /// </summary>
        public static bool HasRequesterCapability(string userTypeCode)
            => string.Equals(userTypeCode, UserTypeCodes.Individual, StringComparison.OrdinalIgnoreCase);

        public static bool CanCreateServiceRequest(int profileType)
        {
            return profileType == (int)Enums.ProfileTypes.SME
                || profileType == (int)Enums.ProfileTypes.Operator
                || profileType == (int)Enums.ProfileTypes.Non_SME
                || profileType == (int)Enums.ProfileTypes.JobSeeker
                || profileType == (int)Enums.ProfileTypes.FreeLancer;
        }

        public static bool IsAccountAdminRoleName(string roleName)
            => string.Equals(roleName, IdentityRoleNames.AccountAdmin, StringComparison.OrdinalIgnoreCase);

        public static bool IsSystemAdminGroup(string userTypeCode, string groupCode)
            => string.Equals(userTypeCode, UserTypeCodes.System, StringComparison.OrdinalIgnoreCase)
               && string.Equals(groupCode, UserGroupCodes.SystemAdmin, StringComparison.OrdinalIgnoreCase);

        /// <summary>
        /// New users created from /admin/users must belong to a System (admin) group only.
        /// </summary>
        public static bool CanCreateAdminOrganizationUser(string userTypeCode)
            => string.Equals(userTypeCode, UserTypeCodes.System, StringComparison.OrdinalIgnoreCase);

        public static bool HasCreateAdminUserRequiredFields(string name, string email, string password, int userGroupId)
            => !string.IsNullOrWhiteSpace(name)
               && !string.IsNullOrWhiteSpace(email)
               && !string.IsNullOrWhiteSpace(password)
               && userGroupId > 0;

        /// <summary>
        /// Admin Users page may edit profile details but must not reassign the account group.
        /// Use Add account (new AspNet user) when a person needs another group.
        /// </summary>
        public static bool CanChangeUserGroup()
            => false;

        public static bool HasUpdateAdminUserRequiredFields(string name, string email)
            => !string.IsNullOrWhiteSpace(name) && !string.IsNullOrWhiteSpace(email);

        /// <summary>Cannot deactivate your own account from the admin users editor.</summary>
        public static bool CanSetUserActive(bool isSelf, bool nextIsActive)
            => !isSelf || nextIsActive;

        public static string TemplateRoleName(string userTypeCode, string groupCode)
            => $"{userTypeCode}.{groupCode}";

        /// <summary>
        /// UI labels for roles. Template roles use the linked group bilingual names
        /// (not the internal AspNet name like Corporate.SME). Custom roles use <paramref name="roleName"/>.
        /// </summary>
        public static (string NameEn, string NameAr) ResolveRoleDisplayNames(
            bool isTemplate,
            string roleName,
            string userGroupNameEn,
            string userGroupNameAr)
        {
            if (isTemplate)
            {
                var en = (userGroupNameEn ?? string.Empty).Trim();
                var ar = (userGroupNameAr ?? string.Empty).Trim();
                if (en.Length == 0 && ar.Length == 0)
                {
                    var fallback = (roleName ?? string.Empty).Trim();
                    return (fallback, fallback);
                }

                if (en.Length == 0)
                {
                    en = ar;
                }

                if (ar.Length == 0)
                {
                    ar = en;
                }

                return (en, ar);
            }

            var custom = (roleName ?? string.Empty).Trim();
            return (custom, custom);
        }

        public static int ResolveVendorType(string userTypeCode, string groupCode, int fallbackProfileType)
        {
            return TryMapProfileType(userTypeCode, groupCode, out var mapped)
                ? mapped
                : fallbackProfileType;
        }

        /// <summary>
        /// Login/JWT VendorType: always the profile's ProfileType.
        /// UserGroup mapping is for Identity Access admin tools, not runtime auth.
        /// </summary>
        public static int ResolveLoginVendorType(int? profileProfileType, int userProfileTypeFallback)
            => profileProfileType ?? userProfileTypeFallback;

        public static bool CanRemoveAccount(bool isSelf, int activeAccountCount, bool isLastSystemAdmin)
        {
            if (isSelf || isLastSystemAdmin)
            {
                return false;
            }

            return activeAccountCount > 1;
        }

        public static string BuildAccountUserName(string emailOrName, string groupCode)
        {
            var baseName = string.IsNullOrWhiteSpace(emailOrName) ? "user" : emailOrName.Trim();
            var code = string.IsNullOrWhiteSpace(groupCode) ? "group" : groupCode.Trim();
            return $"{baseName}#{code}";
        }

        public static string BuildAccountEmail(string email, string groupCode)
        {
            var code = string.IsNullOrWhiteSpace(groupCode) ? "group" : groupCode.Trim();
            if (string.IsNullOrWhiteSpace(email) || email.IndexOf('@') < 0)
            {
                return $"{code.ToLowerInvariant()}@accounts.local";
            }

            var at = email.IndexOf('@');
            return $"{email.Substring(0, at)}+{code}{email.Substring(at)}";
        }

        public static int NormalizePageSize(int? pageSize)
        {
            var size = pageSize ?? 5;
            return size == 5 || size == 10 || size == 15 ? size : 5;
        }

        public static int NormalizePageIndex(int? pageIndex, int total, int pageSize)
        {
            var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
            var index = pageIndex ?? 0;
            if (index < 0)
            {
                return 0;
            }

            return Math.Min(index, totalPages - 1);
        }


        public static bool TryMapProfileType(
            string userTypeCode,
            string groupCode,
            out int profileType)
        {
            profileType = 0;

            if (string.IsNullOrWhiteSpace(userTypeCode) ||
                string.IsNullOrWhiteSpace(groupCode))
            {
                return false;
            }

            // System: all groups use Admin ProfileType.
            // Permissions are controlled by the assigned role.
            if (string.Equals(
                userTypeCode,
                UserTypeCodes.System,
                StringComparison.OrdinalIgnoreCase))
            {
                profileType = (int)Enums.ProfileTypes.Admin;
                return true;
            }

            // Individual
            if (string.Equals(
                userTypeCode,
                UserTypeCodes.Individual,
                StringComparison.OrdinalIgnoreCase))
            {
                if (string.Equals(
                    groupCode,
                    UserGroupCodes.Freelancer,
                    StringComparison.OrdinalIgnoreCase))
                {
                    profileType = (int)Enums.ProfileTypes.FreeLancer;
                    return true;
                }

                // Jobseeker and custom Individual groups
                profileType = (int)Enums.ProfileTypes.JobSeeker;
                return true;
            }

            // Corporate
            if (string.Equals(
                userTypeCode,
                UserTypeCodes.Corporate,
                StringComparison.OrdinalIgnoreCase))
            {
                if (string.Equals(
                    groupCode,
                    UserGroupCodes.SME,
                    StringComparison.OrdinalIgnoreCase))
                {
                    profileType = (int)Enums.ProfileTypes.SME;
                    return true;
                }

                if (string.Equals(
                    groupCode,
                    UserGroupCodes.NonSME,
                    StringComparison.OrdinalIgnoreCase))
                {
                    profileType = (int)Enums.ProfileTypes.Non_SME;
                    return true;
                }

                if (string.Equals(
                    groupCode,
                    UserGroupCodes.Operator,
                    StringComparison.OrdinalIgnoreCase))
                {
                    profileType = (int)Enums.ProfileTypes.Operator;
                    return true;
                }

                if (string.Equals(
                    groupCode,
                    UserGroupCodes.Contractor,
                    StringComparison.OrdinalIgnoreCase))
                {
                    profileType = (int)Enums.ProfileTypes.Contractor;
                    return true;
                }

                // Staff and custom Corporate groups
                profileType = (int)Enums.ProfileTypes.Staff;
                return true;
            }

            return false;
        }


        public static int DefaultActionFlags(string userTypeCode)
            => IdentityAccessPermissionDefaults.ActionFlagsForUserType(userTypeCode);

        public static string DefaultDataScope(string userTypeCode)
            => IdentityAccessPermissionDefaults.DataScopeForUserType(userTypeCode);

        public static int NormalizeActionFlags(int? flags)
        {
            var value = (flags ?? 0) & PageActionFlags.All;
            return value == 0 ? PageActionFlags.View : value;
        }

        public static string NormalizeDataScope(string scope, string userTypeCode)
        {
            if (!string.IsNullOrWhiteSpace(scope) && DataScopes.Contains(scope.Trim()))
            {
                return scope.Trim().ToLowerInvariant();
            }

            return DefaultDataScope(userTypeCode);
        }

        public static bool HasAction(int grantedFlags, int requiredFlag)
            => requiredFlag > 0 && (NormalizeActionFlags(grantedFlags) & requiredFlag) == requiredFlag;

        public static bool MeetsRequiredActions(int grantedFlags, int requiredFlags)
        {
            var required = NormalizeActionFlags(requiredFlags);
            return (NormalizeActionFlags(grantedFlags) & required) == required;
        }

        public static int ScopeRank(string scope)
        {
            switch (NormalizeDataScope(scope, null))
            {
                case PageDataScopes.Everything:
                    return 5;
                case PageDataScopes.Organization:
                    return 4;
                case PageDataScopes.Department:
                    return 3;
                case PageDataScopes.Assigned:
                    return 2;
                default:
                    return 1;
            }
        }

        public static string WiderDataScope(string left, string right)
            => ScopeRank(left) >= ScopeRank(right) ? NormalizeDataScope(left, null) : NormalizeDataScope(right, null);

        public static int MergeActionFlags(int left, int right)
            => NormalizeActionFlags(left | right);

        public static bool CanMutateUserType()
            => false;

        public static bool IsKnownUserType(string userTypeCode)
            => string.Equals(userTypeCode, UserTypeCodes.System, StringComparison.OrdinalIgnoreCase)
               || string.Equals(userTypeCode, UserTypeCodes.Corporate, StringComparison.OrdinalIgnoreCase)
               || string.Equals(userTypeCode, UserTypeCodes.Individual, StringComparison.OrdinalIgnoreCase);

        public static string NormalizeGroupCode(string code)
            => (code ?? string.Empty).Trim();

        public static bool IsValidGroupCode(string code)
            => GroupCodePattern.IsMatch(NormalizeGroupCode(code));

        public static bool CanCreateUserGroup(string userTypeCode, string code, bool codeAlreadyExists)
            => IsKnownUserType(userTypeCode) && IsValidGroupCode(code) && !codeAlreadyExists;

        public static bool IsProtectedSeedGroup(string userTypeCode, string groupCode)
            => IsSystemAdminGroup(userTypeCode, groupCode);

        public static bool CanDeactivateUserGroup(string userTypeCode, string groupCode, int activeUserCount)
            => !IsProtectedSeedGroup(userTypeCode, groupCode) && activeUserCount == 0;

        public static bool IsLockedTemplateRoleName(string roleName)
            => IsAccountAdminRoleName(roleName)
               || string.Equals(roleName, TemplateRoleName(UserTypeCodes.System, UserGroupCodes.SystemAdmin), StringComparison.OrdinalIgnoreCase);

        public static bool CanDeleteRole(bool isTemplate, string roleName)
            => !isTemplate && !IsLockedTemplateRoleName(roleName);

        public static bool CanEditRolePages(string roleName)
            => !string.IsNullOrWhiteSpace(roleName);

        public static bool CanCreateCustomRole(int? organizationId, bool parentIsTemplate, string name)
        {
            if (!organizationId.HasValue || organizationId.Value <= 0 || !parentIsTemplate)
            {
                return false;
            }

            var trimmed = (name ?? string.Empty).Trim();
            return trimmed.Length >= 2
                   && trimmed.Length <= 100
                   && !IsLockedTemplateRoleName(trimmed)
                   && trimmed.IndexOf('.') < 0;
        }

        /// <summary>
        /// When <paramref name="templatesOnly"/> is true → templates only;
        /// false → custom only; null → include both.
        /// </summary>
        public static bool MatchesTemplatesOnlyFilter(bool isTemplate, bool? templatesOnly)
        {
            if (templatesOnly == true)
            {
                return isTemplate;
            }

            if (templatesOnly == false)
            {
                return !isTemplate;
            }

            return true;
        }

        /// <summary>
        /// Prefer an explicit org from the request; otherwise use the caller's organization.
        /// </summary>
        public static int? ResolveCustomRoleOrganizationId(int? bodyOrganizationId, int? callerOrganizationId)
            => bodyOrganizationId.HasValue && bodyOrganizationId.Value > 0
                ? bodyOrganizationId
                : callerOrganizationId;

        public static bool CanAssignCustomRole(int? userOrganizationId, int? roleOrganizationId)
            => userOrganizationId.HasValue
               && roleOrganizationId.HasValue
               && userOrganizationId.Value == roleOrganizationId.Value;

        /// <summary>
        /// Corporate groups an operator may assign to company users (not root SME/Operator/NonSME).
        /// </summary>
        public static bool IsOperatorDistributableUserGroup(string userTypeCode, string groupCode)
        {
            if (!string.Equals(userTypeCode, UserTypeCodes.Corporate, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            return string.Equals(groupCode, UserGroupCodes.Staff, StringComparison.OrdinalIgnoreCase)
                   || string.Equals(groupCode, UserGroupCodes.Contractor, StringComparison.OrdinalIgnoreCase)
                   || string.Equals(groupCode, UserGroupCodes.Provider, StringComparison.OrdinalIgnoreCase)
                   || string.Equals(groupCode, UserGroupCodes.Trainer, StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Operator may distribute: template roles for linked corporate groups, or custom roles for their org.
        /// </summary>
        public static bool CanOperatorDistributeRole(
            int? callerOrganizationId,
            bool roleIsTemplate,
            bool roleIsActive,
            int? roleOrganizationId,
            string roleUserTypeCode,
            string roleUserGroupCode)
        {
            if (!roleIsActive || !callerOrganizationId.HasValue || callerOrganizationId.Value <= 0)
            {
                return false;
            }

            if (roleIsTemplate)
            {
                return IsOperatorDistributableUserGroup(roleUserTypeCode, roleUserGroupCode);
            }

            return roleOrganizationId.HasValue
                   && roleOrganizationId.Value == callerOrganizationId.Value;
        }

        public static bool TryMapLegacyProfileType(
            int profileType,
            out string userTypeCode,
            out string userGroupCode,
            out bool needsOrganization,
            out bool grantAccountAdmin)
            => IdentityAccessLegacyProfileMap.TryMap(
                profileType,
                out userTypeCode,
                out userGroupCode,
                out needsOrganization,
                out grantAccountAdmin);

        public static bool ShouldAutoGrantAccountAdmin(string userTypeCode, int existingAccountAdminsInOrg)
            => NeedsOrganization(userTypeCode) && existingAccountAdminsInOrg <= 0;

        public static bool CanRemoveAccountAdmin(int remainingAccountAdminsInOrg)
            => remainingAccountAdminsInOrg > 0;

        public static bool BypassPageGrants(string userTypeCode, string groupCode)
            => IsSystemAdminGroup(userTypeCode, groupCode);

        public static bool IsAlwaysVisiblePage(string path)
        {
            var normalized = NormalizePath(path);
            foreach (var visible in AlwaysVisiblePaths)
            {
                if (string.Equals(normalized, visible, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }

        public static bool PageUrlMatches(string grantedUrl, string requestPath)
        {
            if (string.IsNullOrWhiteSpace(grantedUrl) || string.IsNullOrWhiteSpace(requestPath))
            {
                return false;
            }

            var granted = NormalizePath(grantedUrl);
            var request = NormalizePath(requestPath);
            if (string.Equals(granted, request, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            var grantedParts = granted.Split('/');
            var requestParts = request.Split('/');
            if (grantedParts.Length != requestParts.Length)
            {
                return false;
            }

            for (var i = 0; i < grantedParts.Length; i++)
            {
                if (grantedParts[i].StartsWith(":", StringComparison.Ordinal))
                {
                    if (string.IsNullOrWhiteSpace(requestParts[i]))
                    {
                        return false;
                    }

                    continue;
                }

                if (!string.Equals(grantedParts[i], requestParts[i], StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }
            }

            return true;
        }

        public static bool CanShowNav(string path, IReadOnlyCollection<string> grantedUrls, bool bypass)
        {
            if (bypass || IsAlwaysVisiblePage(path))
            {
                return true;
            }

            if (grantedUrls == null || grantedUrls.Count == 0)
            {
                return false;
            }

            foreach (var url in grantedUrls)
            {
                if (PageUrlMatches(url, path))
                {
                    return true;
                }
            }

            return false;
        }

        public static string NormalizePath(string path)
        {
            if (string.IsNullOrWhiteSpace(path))
            {
                return string.Empty;
            }

            var trimmed = path.Trim();
            var query = trimmed.IndexOf('?');
            if (query >= 0)
            {
                trimmed = trimmed.Substring(0, query);
            }

            if (!trimmed.StartsWith("/", StringComparison.Ordinal))
            {
                trimmed = "/" + trimmed;
            }

            if (trimmed.Length > 1)
            {
                trimmed = trimmed.TrimEnd('/');
            }

            return trimmed;
        }
    }
}
