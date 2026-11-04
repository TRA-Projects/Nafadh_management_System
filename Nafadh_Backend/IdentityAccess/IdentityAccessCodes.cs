#nullable disable
namespace Nafadh_Backend.IdentityAccess
{
    public static class UserTypeCodes
    {
        public const string System = "System";
        public const string Corporate = "Corporate";
        public const string Individual = "Individual";
    }

    public static class UserGroupCodes
    {
        public const string SystemAdmin = "SystemAdmin";
        public const string SME = "SME";
        public const string NonSME = "NonSME";
        public const string Operator = "Operator";
        public const string Provider = "Provider";
        public const string Trainer = "Trainer";
        public const string Jobseeker = "Jobseeker";
        public const string Freelancer = "Freelancer";
        public const string Trainee = "Trainee";
        public const string Staff = "Staff";
        public const string Contractor = "Contractor";
    }

    public static class IdentityRoleNames
    {
        public const string AccountAdmin = "AccountAdmin";
        public const string SystemAdmin = UserGroupCodes.SystemAdmin;
        public const string SME = UserGroupCodes.SME;
        public const string NonSME = UserGroupCodes.NonSME;
        public const string Operator = UserGroupCodes.Operator;
        public const string Provider = UserGroupCodes.Provider;
        public const string Trainer = UserGroupCodes.Trainer;
        public const string Jobseeker = UserGroupCodes.Jobseeker;
        public const string Freelancer = UserGroupCodes.Freelancer;
        public const string Trainee = UserGroupCodes.Trainee;
        public const string Staff = UserGroupCodes.Staff;
        public const string Contractor = UserGroupCodes.Contractor;
    }

    public static class PageActionFlags
    {
        public const int View = 1;
        public const int Create = 2;
        public const int Update = 4;
        public const int Approve = 8;
        public const int Award = 16;
        public const int All = View | Create | Update | Approve | Award;
    }

    public static class PageDataScopes
    {
        public const string Mine = "mine";
        public const string Organization = "organization";
        public const string Department = "department";
        public const string Assigned = "assigned";
        public const string Everything = "everything";
    }

    public static class IdentityAccessPermissionDefaults
    {
        public static int ActionFlagsForUserType(string userTypeCode)
        {
            if (string.Equals(userTypeCode, UserTypeCodes.System, System.StringComparison.OrdinalIgnoreCase))
            {
                return PageActionFlags.All;
            }

            if (string.Equals(userTypeCode, UserTypeCodes.Corporate, System.StringComparison.OrdinalIgnoreCase))
            {
                return PageActionFlags.View | PageActionFlags.Create | PageActionFlags.Update | PageActionFlags.Approve;
            }

            if (string.Equals(userTypeCode, UserTypeCodes.Individual, System.StringComparison.OrdinalIgnoreCase))
            {
                return PageActionFlags.View | PageActionFlags.Create | PageActionFlags.Update;
            }

            return PageActionFlags.View;
        }

        public static string DataScopeForUserType(string userTypeCode)
        {
            if (string.Equals(userTypeCode, UserTypeCodes.System, System.StringComparison.OrdinalIgnoreCase))
            {
                return PageDataScopes.Everything;
            }

            if (string.Equals(userTypeCode, UserTypeCodes.Corporate, System.StringComparison.OrdinalIgnoreCase))
            {
                return PageDataScopes.Organization;
            }

            return PageDataScopes.Mine;
        }

        public static int ActionFlagsForRoleName(string roleName)
        {
            if (string.IsNullOrWhiteSpace(roleName))
            {
                return PageActionFlags.View;
            }

            if (string.Equals(roleName, IdentityRoleNames.AccountAdmin, System.StringComparison.OrdinalIgnoreCase)
                || roleName.StartsWith(UserTypeCodes.System + ".", System.StringComparison.OrdinalIgnoreCase))
            {
                return PageActionFlags.All;
            }

            if (roleName.StartsWith(UserTypeCodes.Corporate + ".", System.StringComparison.OrdinalIgnoreCase))
            {
                return ActionFlagsForUserType(UserTypeCodes.Corporate);
            }

            if (roleName.StartsWith(UserTypeCodes.Individual + ".", System.StringComparison.OrdinalIgnoreCase))
            {
                return ActionFlagsForUserType(UserTypeCodes.Individual);
            }

            return PageActionFlags.View;
        }

        public static string DataScopeForRoleName(string roleName)
        {
            if (string.IsNullOrWhiteSpace(roleName))
            {
                return PageDataScopes.Mine;
            }

            if (string.Equals(roleName, IdentityRoleNames.AccountAdmin, System.StringComparison.OrdinalIgnoreCase)
                || roleName.StartsWith(UserTypeCodes.System + ".", System.StringComparison.OrdinalIgnoreCase))
            {
                return PageDataScopes.Everything;
            }

            if (roleName.StartsWith(UserTypeCodes.Corporate + ".", System.StringComparison.OrdinalIgnoreCase))
            {
                return PageDataScopes.Organization;
            }

            return PageDataScopes.Mine;
        }
    }

    /// <summary>
    /// Maps legacy <c>Profile.ProfileType</c> to Identity Access type/group codes.
    /// Shared by registration, seeder backfill, and operator role distribution.
    /// </summary>
    public static class IdentityAccessLegacyProfileMap
    {
        public static bool TryMap(
            int profileType,
            out string userTypeCode,
            out string userGroupCode,
            out bool needsOrganization,
            out bool grantAccountAdmin)
        {
            userTypeCode = null;
            userGroupCode = null;
            needsOrganization = false;
            grantAccountAdmin = false;

            switch ((Enums.ProfileTypes)profileType)
            {
                case Enums.ProfileTypes.Admin:
                    userTypeCode = UserTypeCodes.System;
                    userGroupCode = UserGroupCodes.SystemAdmin;
                    return true;
                case Enums.ProfileTypes.FreeLancer:
                    userTypeCode = UserTypeCodes.Individual;
                    userGroupCode = UserGroupCodes.Freelancer;
                    return true;
                case Enums.ProfileTypes.SME:
                    userTypeCode = UserTypeCodes.Corporate;
                    userGroupCode = UserGroupCodes.SME;
                    needsOrganization = true;
                    grantAccountAdmin = true;
                    return true;
                case Enums.ProfileTypes.Contractor:
                    userTypeCode = UserTypeCodes.Corporate;
                    userGroupCode = UserGroupCodes.Contractor;
                    needsOrganization = true;
                    grantAccountAdmin = true;
                    return true;
                case Enums.ProfileTypes.Operator:
                    userTypeCode = UserTypeCodes.Corporate;
                    userGroupCode = UserGroupCodes.Operator;
                    needsOrganization = true;
                    grantAccountAdmin = true;
                    return true;
                case Enums.ProfileTypes.OUser:
                case Enums.ProfileTypes.Staff:
                    userTypeCode = UserTypeCodes.Corporate;
                    userGroupCode = UserGroupCodes.Staff;
                    needsOrganization = true;
                    return true;
                case Enums.ProfileTypes.Non_SME:
                    userTypeCode = UserTypeCodes.Corporate;
                    userGroupCode = UserGroupCodes.NonSME;
                    needsOrganization = true;
                    grantAccountAdmin = true;
                    return true;
                case Enums.ProfileTypes.JobSeeker:
                    userTypeCode = UserTypeCodes.Individual;
                    userGroupCode = UserGroupCodes.Jobseeker;
                    return true;
                default:
                    return false;
            }
        }

        public static string TemplateRoleName(string userTypeCode, string userGroupCode)
            => $"{userTypeCode}.{userGroupCode}";
    }
}
