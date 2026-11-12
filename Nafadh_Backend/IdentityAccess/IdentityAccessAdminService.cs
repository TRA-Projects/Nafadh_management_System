#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Nafadh_Backend.IdentityAccess
{
    public class IdentityAccessAdminService : IIdentityAccessAdminService
    {
        private readonly Nafadhcontext _context;
        private readonly UserManager<AppUser> _userManager;

        public IdentityAccessAdminService(
            Nafadhcontext context,
            UserManager<AppUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }
        public async Task<PagedListResponseDto<IdentityAccessUserRowDto>> GetUsersPageAsync(
            int? pageIndex,
            int? pageSize,
            string q,
            int? userTypeId,
            int? userGroupId,
            bool? isActive,
            string callerUserId)
        {
            var query = _context.Users
                .AsNoTracking()
                .Include(u => u.Profile)
                .Include(u => u.UserGroup)
                    .ThenInclude(g => g.UserType)
                .AsQueryable();

            if (userGroupId.HasValue && userGroupId.Value > 0)
            {
                query = query.Where(u => u.UserGroupId == userGroupId.Value);
            }

            if (userTypeId.HasValue && userTypeId.Value > 0)
            {
                query = query.Where(u => u.UserGroup != null && u.UserGroup.UserTypeId == userTypeId.Value);
            }

            if (isActive.HasValue)
            {
                query = query.Where(u => u.IsActive == isActive.Value);
            }

            var search = (q ?? string.Empty).Trim();
            if (search.Length > 0)
            {
                query = query.Where(u =>
                    (u.Email != null && u.Email.Contains(search))
                    || (u.UserName != null && u.UserName.Contains(search))
                    || (u.Profile != null && u.Profile.EmailAddress != null && u.Profile.EmailAddress.Contains(search))
                    || (u.Profile != null && u.Profile.Name != null && u.Profile.Name.Contains(search))
                    || (u.Profile != null && u.Profile.NameAr != null && u.Profile.NameAr.Contains(search)));
            }

            var total = await query.CountAsync();
            var size = IdentityAccessAdminRules.NormalizePageSize(pageSize);
            var index = IdentityAccessAdminRules.NormalizePageIndex(pageIndex, total, size);

            var rows = await query
                .OrderBy(u => u.Email)
                .ThenBy(u => u.Id)
                .Skip(index * size)
                .Take(size)
                .ToListAsync();

            var profileIds = rows
                .Where(u => u.ProfileId.HasValue)
                .Select(u => u.ProfileId.Value)
                .Distinct()
                .ToList();
            var accountCounts = profileIds.Count == 0
                ? new Dictionary<int, int>()
                : await _context.Users
                    .Where(u => u.ProfileId.HasValue && profileIds.Contains(u.ProfileId.Value) && u.IsActive)
                    .GroupBy(u => u.ProfileId.Value)
                    .Select(g => new { ProfileId = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.ProfileId, x => x.Count);

            return new PagedListResponseDto<IdentityAccessUserRowDto>
            {
                rows = rows.Select(u =>
                {
                    var count = u.ProfileId.HasValue && accountCounts.TryGetValue(u.ProfileId.Value, out var n) ? n : 1;
                    return MapUser(u, callerUserId, count);
                }).ToList(),
                total = total,
                pageIndex = index,
                pageSize = size
            };
        }

        public async Task<IdentityAccessUserRowDto> ChangeUserGroupAsync(string userId, int userGroupId, string callerUserId)
        {
            if (!IdentityAccessAdminRules.CanChangeUserGroup())
            {
                throw new SafeExecutionHelper.BadRequestException(
                    "Changing a user's group is not allowed. Add a new account for another group instead.");
            }

            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new SafeExecutionHelper.BadRequestException("User id is required.");
            }

            if (string.Equals(userId, callerUserId, StringComparison.Ordinal))
            {
                throw new SafeExecutionHelper.BadRequestException("You cannot change your own group.");
            }

            var user = await _context.Users
                .Include(u => u.Profile)
                .Include(u => u.UserGroup)
                    .ThenInclude(g => g.UserType)
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                throw new SafeExecutionHelper.NotFoundException("User was not found.");
            }

            var group = await _context.UserGroups
                .Include(g => g.UserType)
                .FirstOrDefaultAsync(g => g.Id == userGroupId);
            if (group == null || !group.IsActive)
            {
                throw new SafeExecutionHelper.BadRequestException("User group was not found or is inactive.");
            }

            var previousTypeCode = user.UserGroup?.UserType?.Code;
            var previousGroupCode = user.UserGroup?.Code;
            var nextTypeCode = group.UserType?.Code ?? string.Empty;
            var nextGroupCode = group.Code ?? string.Empty;

            if (IdentityAccessAdminRules.IsSystemAdminGroup(previousTypeCode, previousGroupCode)
                && !IdentityAccessAdminRules.IsSystemAdminGroup(nextTypeCode, nextGroupCode))
            {
                var remainingAdmins = await _context.Users
                    .CountAsync(u =>
                        u.Id != user.Id
                        && u.IsActive
                        && u.UserGroup != null
                        && u.UserGroup.UserType != null
                        && u.UserGroup.UserType.Code == UserTypeCodes.System
                        && u.UserGroup.Code == UserGroupCodes.SystemAdmin);
                if (remainingAdmins == 0)
                {
                    throw new SafeExecutionHelper.BadRequestException("Cannot change the last system admin group.");
                }
            }

            var utcNow = DateTime.UtcNow;
            var needsOrg = IdentityAccessAdminRules.NeedsOrganization(nextTypeCode);
            user.UserGroupId = group.Id;
            user.UserGroup = group;

            if (needsOrg)
            {
                if (!user.OrganizationId.HasValue && user.Profile != null)
                {
                    var orgProfileId = user.Profile.ParentProfileId ?? user.Profile.Id;
                    var orgId = await ResolveOrCreateOrgForProfileAsync(orgProfileId, utcNow);
                    if (orgId > 0)
                    {
                        user.OrganizationId = orgId;
                    }
                }
            }
            else
            {
                user.OrganizationId = null;
            }

            await SwapTemplateRolesAsync(user.Id, nextTypeCode, nextGroupCode, !needsOrg);

            if (user.Profile != null
                && IdentityAccessAdminRules.TryMapProfileType(nextTypeCode, nextGroupCode, out var profileType))
            {
                user.Profile.ProfileType = profileType;
            }

            await _context.SaveChangesAsync();

            var refreshed = await _context.Users
                .AsNoTracking()
                .Include(u => u.Profile)
                .Include(u => u.UserGroup)
                    .ThenInclude(g => g.UserType)
                .FirstAsync(u => u.Id == user.Id);
            return MapUser(refreshed, callerUserId, 1);
        }

        public async Task<IdentityAccessUserRowDto> UpdateAdminUserAsync(
            string userId,
            UpdateAdminUserRequestDto body,
            string callerUserId)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new SafeExecutionHelper.BadRequestException("User id is required.");
            }

            if (body == null || !IdentityAccessAdminRules.HasUpdateAdminUserRequiredFields(body.Name, body.Email))
            {
                throw new SafeExecutionHelper.BadRequestException("Name and email are required.");
            }

            var isSelf = string.Equals(userId, callerUserId, StringComparison.Ordinal);
            if (!IdentityAccessAdminRules.CanSetUserActive(isSelf, body.IsActive))
            {
                throw new SafeExecutionHelper.BadRequestException("You cannot deactivate your own account.");
            }

            var name = body.Name.Trim();
            var email = body.Email.Trim();

            var user = await _context.Users
                .Include(u => u.Profile)
                .Include(u => u.UserGroup)
                    .ThenInclude(g => g.UserType)
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                throw new SafeExecutionHelper.NotFoundException("User was not found.");
            }

            if (!body.IsActive
                && user.IsActive
                && IdentityAccessAdminRules.IsSystemAdminGroup(user.UserGroup?.UserType?.Code, user.UserGroup?.Code))
            {
                var remainingAdmins = await _context.Users
                    .CountAsync(u =>
                        u.Id != user.Id
                        && u.IsActive
                        && u.UserGroup != null
                        && u.UserGroup.UserType != null
                        && u.UserGroup.UserType.Code == UserTypeCodes.System
                        && u.UserGroup.Code == UserGroupCodes.SystemAdmin);
                if (remainingAdmins == 0)
                {
                    throw new SafeExecutionHelper.BadRequestException("Cannot deactivate the last system admin.");
                }
            }

            var emailTaken = await _context.Users.AnyAsync(u =>
                u.Id != user.Id
                && ((u.Email != null && u.Email.ToLower() == email.ToLower())
                    || (u.UserName != null && u.UserName.ToLower() == email.ToLower())));
            if (emailTaken)
            {
                throw new SafeExecutionHelper.BadRequestException("A user with this email already exists.");
            }

            user.Email = email;
            user.UserName = email;
            user.NormalizedEmail = email.ToUpperInvariant();
            user.NormalizedUserName = email.ToUpperInvariant();
            user.IsActive = body.IsActive;

            if (user.Profile != null)
            {
                user.Profile.Name = name;
                user.Profile.NameAr = name;
                user.Profile.EmailAddress = email;
                user.Profile.IsActive = body.IsActive;
            }

            await _context.SaveChangesAsync();

            var refreshed = await _context.Users
                .AsNoTracking()
                .Include(u => u.Profile)
                .Include(u => u.UserGroup)
                    .ThenInclude(g => g.UserType)
                .FirstAsync(u => u.Id == user.Id);
            return MapUser(refreshed, callerUserId, 1);
        }

        public async Task<IdentityAccessUserRowDto> AddProfileAccountAsync(string sourceUserId, int userGroupId, string callerUserId)
        {
            if (string.IsNullOrWhiteSpace(sourceUserId))
            {
                throw new SafeExecutionHelper.BadRequestException("User id is required.");
            }

            var source = await _context.Users
                .Include(u => u.Profile)
                .Include(u => u.UserGroup)
                    .ThenInclude(g => g.UserType)
                .FirstOrDefaultAsync(u => u.Id == sourceUserId);
            if (source == null || !source.ProfileId.HasValue)
            {
                throw new SafeExecutionHelper.NotFoundException("User was not found.");
            }

            var group = await _context.UserGroups
                .Include(g => g.UserType)
                .FirstOrDefaultAsync(g => g.Id == userGroupId);
            if (group == null || !group.IsActive)
            {
                throw new SafeExecutionHelper.BadRequestException("User group was not found or is inactive.");
            }

            var duplicate = await _context.Users.AnyAsync(u =>
                u.ProfileId == source.ProfileId
                && u.UserGroupId == group.Id
                && u.IsActive);
            if (duplicate)
            {
                throw new SafeExecutionHelper.BadRequestException("This profile already has an account for the selected group.");
            }

            var nextTypeCode = group.UserType?.Code ?? string.Empty;
            var nextGroupCode = group.Code ?? string.Empty;
            var utcNow = DateTime.UtcNow;
            var needsOrg = IdentityAccessAdminRules.NeedsOrganization(nextTypeCode);
            int? organizationId = source.OrganizationId;
            if (needsOrg && !organizationId.HasValue && source.Profile != null)
            {
                var orgProfileId = source.Profile.ParentProfileId ?? source.Profile.Id;
                var orgId = await ResolveOrCreateOrgForProfileAsync(orgProfileId, utcNow);
                if (orgId > 0)
                {
                    organizationId = orgId;
                }
            }
            else if (!needsOrg)
            {
                organizationId = null;
            }

            var emailSource = FirstNonEmpty(source.Email, source.Profile?.EmailAddress, source.UserName) ?? source.Id;
            var extra = new AppUser
            {
                Id = Guid.NewGuid().ToString(),
                UserName = IdentityAccessAdminRules.BuildAccountUserName(emailSource, nextGroupCode),
                Email = IdentityAccessAdminRules.BuildAccountEmail(emailSource, nextGroupCode),
                EmailConfirmed = source.EmailConfirmed,
                PhoneNumber = source.PhoneNumber,
                PhoneNumberConfirmed = source.PhoneNumberConfirmed,
                PasswordHash = source.PasswordHash,
                SecurityStamp = Guid.NewGuid().ToString(),
                ConcurrencyStamp = Guid.NewGuid().ToString(),
                ProfileId = source.ProfileId,
                UserGroupId = group.Id,
                OrganizationId = organizationId,
                IsPrimary = false,
                IsActive = true,
                CreatedDate = DateTime.Now
            };
            extra.NormalizedUserName = extra.UserName.ToUpperInvariant();
            extra.NormalizedEmail = extra.Email.ToUpperInvariant();

            _context.Users.Add(extra);
            await _context.SaveChangesAsync();
            await SwapTemplateRolesAsync(extra.Id, nextTypeCode, nextGroupCode, !needsOrg);
            if (needsOrg && organizationId.HasValue)
            {
                await TryAutoGrantAccountAdminAsync(extra.Id, organizationId.Value, nextTypeCode, callerUserId);
            }
            await _context.SaveChangesAsync();
            await WriteAuditAsync(
                callerUserId,
                "UserAccount",
                extra.Id,
                "UserGroupId",
                null,
                group.Id.ToString(),
                SystemAuditActions.Create);

            var created = await _context.Users
                .AsNoTracking()
                .Include(u => u.Profile)
                .Include(u => u.UserGroup)
                    .ThenInclude(g => g.UserType)
                .FirstAsync(u => u.Id == extra.Id);
            return MapUser(created, callerUserId, 2);
        }


        public async Task<IdentityAccessUserRowDto> CreateAdminUserAsync(
            CreateAdminUserRequestDto body,
            string callerUserId)
        {
            if (body == null ||
                !IdentityAccessAdminRules.HasCreateAdminUserRequiredFields(
                    body.Name,
                    body.Email,
                    body.Password,
                    body.UserGroupId))
            {
                throw new SafeExecutionHelper.BadRequestException(
                    "Name, email, password and user group are required.");
            }

            var name = body.Name.Trim();
            var email = body.Email.Trim();

            // 1. Get selected group and its user type
            var group = await _context.UserGroups
                .Include(g => g.UserType)
                .FirstOrDefaultAsync(g =>
                    g.Id == body.UserGroupId &&
                    g.IsActive);

            if (group == null ||
                group.UserType == null ||
                !group.UserType.IsActive)
            {
                throw new SafeExecutionHelper.BadRequestException(
                    "The selected user group is invalid or inactive.");
            }

            var typeCode = group.UserType.Code;
            var groupCode = group.Code;

            // 2. Resolve organization for Corporate users
            var needsOrganization =
                IdentityAccessAdminRules.NeedsOrganization(typeCode);

            Organization organization = null;

            if (needsOrganization)
            {
                int? organizationId = body.OrganizationId;

                // If no organization was provided, use the
                // organization of the current admin account.
                if (!organizationId.HasValue ||
                    organizationId.Value <= 0)
                {
                    organizationId = await _context.Users
                        .AsNoTracking()
                        .Where(u => u.Id == callerUserId)
                        .Select(u => u.OrganizationId)
                        .FirstOrDefaultAsync();
                }

                if (!organizationId.HasValue ||
                    organizationId.Value <= 0)
                {
                    throw new SafeExecutionHelper.BadRequestException(
                        "Cannot determine an organization for this corporate user.");
                }

                organization = await _context.Organizations
                    .AsNoTracking()
                    .FirstOrDefaultAsync(o =>
                        o.Id == organizationId.Value &&
                        o.IsActive);

                if (organization == null)
                {
                    throw new SafeExecutionHelper.BadRequestException(
                        "The selected organization was not found or is inactive.");
                }
            }
            else if (body.OrganizationId.HasValue)
            {
                throw new SafeExecutionHelper.BadRequestException(
                    "This user type does not support an organization.");
            }

            // 3. Check duplicate email
            var existingUser =
                await _userManager.FindByEmailAsync(email);

            if (existingUser != null ||
                await _context.Users.AnyAsync(u =>
                    u.Email != null &&
                    u.Email.ToLower() == email.ToLower()))
            {
                throw new SafeExecutionHelper.BadRequestException(
                    "A user with this email already exists.");
            }

            // 4. Find active template role for the selected group
            var templateRoleName =
                IdentityAccessAdminRules.TemplateRoleName(
                    typeCode,
                    groupCode);

            var templateRole = await _context.Roles
                .AsNoTracking()
                .FirstOrDefaultAsync(r =>
                    r.Name == templateRoleName &&
                    r.IsTemplate &&
                    r.IsActive);

            if (templateRole == null)
            {
                throw new SafeExecutionHelper.BadRequestException(
                    "The selected group does not have an active template role.");
            }

            // 5. Resolve ProfileType
            int profileType;

            if (!IdentityAccessAdminRules.TryMapProfileType(
                typeCode,
                groupCode,
                out profileType))
            {
                // Custom groups may not have a fixed ProfileType mapping.
                // Reuse the type only if an existing user in the same
                // group provides an established mapping.
                var existingGroupProfileType = await _context.Users
                    .AsNoTracking()
                    .Where(u =>
                        u.UserGroupId == group.Id &&
                        u.Profile != null)
                    .Select(u => (int?)u.Profile.ProfileType)
                    .FirstOrDefaultAsync();

                if (!existingGroupProfileType.HasValue)
                {
                    throw new SafeExecutionHelper.BadRequestException(
                        "Profile type could not be determined for this group. " +
                        "The custom group requires a profile type mapping.");
                }

                profileType = existingGroupProfileType.Value;
            }

            // 6. Create profile and user in one transaction
            var now = DateTime.UtcNow;

            await using var transaction =
                await _context.Database.BeginTransactionAsync();

            try
            {
                var profile = new Profile
                {
                    Name = name,
                    NameAr = name,
                    EmailAddress = email,

                    InsertedById = callerUserId,
                    InsertedDate = now,

                    ProfileType = profileType,
                    ProfileStatus = 0,

                    IsActive = true,
                    IsVerified = false,
                    IsVerifiedInMol = false,
                    IsOmani = false,

                    JoinDate = now,
                    TotalExperience = 0,

                    IsHead = false,
                    IsPostOpertunity = false
                };

                _context.Profiles.Add(profile);
                await _context.SaveChangesAsync();

                var user = new AppUser
                {
                    Id = Guid.NewGuid().ToString(),

                    UserName = email,
                    Email = email,
                    EmailConfirmed = false,

                    ProfileId = profile.Id,
                    UserGroupId = group.Id,

                    OrganizationId = organization?.Id,

                    IsActive = true,
                    IsPrimary = true,
                    isRegisterbyAdmin = true,

                    CreatedDate = now
                };

                // 7. Create Identity user
                var createResult =
                    await _userManager.CreateAsync(
                        user,
                        body.Password);

                if (!createResult.Succeeded)
                {
                    var errors = string.Join(
                        "; ",
                        createResult.Errors.Select(e => e.Description));

                    throw new SafeExecutionHelper.BadRequestException(
                        errors);
                }

                // 8. Assign selected group's template role
                var roleResult =
                    await _userManager.AddToRoleAsync(
                        user,
                        templateRole.Name);

                if (!roleResult.Succeeded)
                {
                    var errors = string.Join(
                        "; ",
                        roleResult.Errors.Select(e => e.Description));

                    throw new SafeExecutionHelper.BadRequestException(
                        errors);
                }

                // 9. Audit
                await WriteAuditAsync(
                    callerUserId,
                    "UserAccount",
                    user.Id,
                    "UserGroupId",
                    null,
                    group.Id.ToString(),
                    SystemAuditActions.Create);

                await transaction.CommitAsync();

                // 10. Return created user
                var created = await _context.Users
                    .AsNoTracking()
                    .Include(u => u.Profile)
                    .Include(u => u.UserGroup)
                        .ThenInclude(g => g.UserType)
                    .FirstAsync(u => u.Id == user.Id);

                return MapUser(created, callerUserId, 1);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }


        public async Task RemoveProfileAccountAsync(string userId, string callerUserId)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new SafeExecutionHelper.BadRequestException("User id is required.");
            }

            if (string.Equals(userId, callerUserId, StringComparison.Ordinal))
            {
                throw new SafeExecutionHelper.BadRequestException("You cannot remove your own account.");
            }

            var user = await _context.Users
                .Include(u => u.UserGroup)
                    .ThenInclude(g => g.UserType)
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                throw new SafeExecutionHelper.NotFoundException("User was not found.");
            }

            var activeCount = user.ProfileId.HasValue
                ? await _context.Users.CountAsync(u => u.ProfileId == user.ProfileId && u.IsActive)
                : 1;
            var isLastAdmin = IdentityAccessAdminRules.IsSystemAdminGroup(user.UserGroup?.UserType?.Code, user.UserGroup?.Code)
                && await _context.Users.CountAsync(u =>
                    u.Id != user.Id
                    && u.IsActive
                    && u.UserGroup != null
                    && u.UserGroup.UserType != null
                    && u.UserGroup.UserType.Code == UserTypeCodes.System
                    && u.UserGroup.Code == UserGroupCodes.SystemAdmin) == 0;

            if (await UserHasAccountAdminAsync(user.Id)
                && user.OrganizationId.HasValue
                && !IdentityAccessAdminRules.CanRemoveAccountAdmin(
                    await CountAccountAdminsAsync(user.OrganizationId.Value, user.Id)))
            {
                throw new SafeExecutionHelper.BadRequestException("Cannot remove the last account admin for this organization.");
            }

            if (!IdentityAccessAdminRules.CanRemoveAccount(false, activeCount, isLastAdmin))
            {
                throw new SafeExecutionHelper.BadRequestException(
                    isLastAdmin
                        ? "Cannot remove the last system admin account."
                        : "Cannot remove the last account on this profile.");
            }

            user.IsActive = false;
            if (user.IsPrimary)
            {
                var nextPrimary = await _context.Users
                    .Where(u => u.ProfileId == user.ProfileId && u.Id != user.Id && u.IsActive)
                    .OrderBy(u => u.CreatedDate)
                    .FirstOrDefaultAsync();
                if (nextPrimary != null)
                {
                    nextPrimary.IsPrimary = true;
                }

                user.IsPrimary = false;
            }

            await _context.SaveChangesAsync();
            await WriteAuditAsync(
                callerUserId,
                "UserAccount",
                user.Id,
                "IsActive",
                "true",
                "false",
                SystemAuditActions.Delete);
        }

        public async Task<List<IdentityAccessUserTypeDto>> GetGroupsCatalogAsync(bool includeInactive = false)
        {
            var types = await _context.UserTypes
                .AsNoTracking()
                .Include(t => t.UserGroups)
                .Where(t => t.IsActive)
                .OrderBy(t => t.NameEn)
                .ToListAsync();

            var groupIds = types
                .SelectMany(t => t.UserGroups ?? new List<UserGroup>())
                .Select(g => g.Id)
                .ToList();
            var userCounts = groupIds.Count == 0
                ? new Dictionary<int, int>()
                : await _context.Users
                    .Where(u => u.UserGroupId.HasValue && groupIds.Contains(u.UserGroupId.Value) && u.IsActive)
                    .GroupBy(u => u.UserGroupId.Value)
                    .Select(g => new { Id = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.Id, x => x.Count);

            var templateByGroup = groupIds.Count == 0
                ? new Dictionary<int, (string Id, string Name)>()
                : (await _context.Roles.AsNoTracking()
                        .Where(r => r.IsTemplate && r.UserGroupId.HasValue && groupIds.Contains(r.UserGroupId.Value))
                        .Select(r => new { r.UserGroupId, r.Id, r.Name })
                        .ToListAsync())
                    .GroupBy(r => r.UserGroupId.Value)
                    .ToDictionary(g => g.Key, g => (g.First().Id, g.First().Name));

            return types.Select(t => new IdentityAccessUserTypeDto
            {
                Id = t.Id,
                Code = t.Code,
                NameEn = t.NameEn,
                NameAr = t.NameAr,
                SortOrder = 0,
                HasRequesterCapability = IdentityAccessAdminRules.HasRequesterCapability(t.Code),
                Groups = (t.UserGroups ?? new List<UserGroup>())
                    .Where(g => includeInactive || g.IsActive)
                    .OrderBy(g => g.SortOrder)
                    .ThenBy(g => g.NameEn)
                    .Select(g =>
                    {
                        templateByGroup.TryGetValue(g.Id, out var template);
                        return MapGroup(
                            g,
                            t.Code,
                            userCounts.TryGetValue(g.Id, out var n) ? n : 0,
                            template.Id,
                            template.Name);
                    })
                    .ToList()
            }).ToList();
        }

        public async Task<IdentityAccessUserGroupDto> CreateUserGroupAsync(UpsertUserGroupRequestDto body, string callerUserId)
        {
            if (IdentityAccessAdminRules.CanMutateUserType())
            {
                throw new SafeExecutionHelper.BadRequestException("User types cannot be changed.");
            }

            var type = await _context.UserTypes.FirstOrDefaultAsync(t => t.Id == body.UserTypeId && t.IsActive);
            if (type == null || !IdentityAccessAdminRules.IsKnownUserType(type.Code))
            {
                throw new SafeExecutionHelper.BadRequestException("User type was not found.");
            }

            var code = IdentityAccessAdminRules.NormalizeGroupCode(body?.Code);
            var exists = await _context.UserGroups.AnyAsync(g =>
                g.UserTypeId == type.Id && g.Code == code);
            if (!IdentityAccessAdminRules.CanCreateUserGroup(type.Code, code, exists))
            {
                throw new SafeExecutionHelper.BadRequestException("User group code is invalid or already exists.");
            }

            var utcNow = DateTime.UtcNow;
            var group = new UserGroup
            {
                UserTypeId = type.Id,
                Code = code,
                NameEn = RequiredName(body?.NameEn, "NameEn"),
                NameAr = RequiredName(body?.NameAr, "NameAr"),
                SortOrder = body?.SortOrder ?? 0,
                IsActive = true,
                CreatedAt = utcNow,
                UpdatedAt = utcNow
            };
            _context.UserGroups.Add(group);
            await _context.SaveChangesAsync();

            var templateName = IdentityAccessAdminRules.TemplateRoleName(type.Code, group.Code);
            string templateRoleId = null;
            var existingTemplate = await _context.Roles.FirstOrDefaultAsync(r => r.Name == templateName);
            if (existingTemplate == null)
            {
                templateRoleId = Guid.NewGuid().ToString();
                _context.Roles.Add(new Roles
                {
                    Id = templateRoleId,
                    Name = templateName,
                    NormalizedName = templateName.ToUpperInvariant(),
                    ConcurrencyStamp = Guid.NewGuid().ToString(),
                    UserGroupId = group.Id,
                    IsTemplate = true,
                    IsActive = true
                });
                await _context.SaveChangesAsync();
            }
            else
            {
                templateRoleId = existingTemplate.Id;
                if (existingTemplate.UserGroupId != group.Id)
                {
                    existingTemplate.UserGroupId = group.Id;
                    await _context.SaveChangesAsync();
                }
            }

            await WriteAuditAsync(callerUserId, "UserGroup", group.Id.ToString(), "Code", null, group.Code, SystemAuditActions.Create);
            return MapGroup(group, type.Code, 0, templateRoleId, templateName);
        }

        public async Task<IdentityAccessUserGroupDto> UpdateUserGroupAsync(int groupId, UpsertUserGroupRequestDto body, string callerUserId)
        {
            var group = await _context.UserGroups.Include(g => g.UserType).FirstOrDefaultAsync(g => g.Id == groupId);
            if (group == null)
            {
                throw new SafeExecutionHelper.NotFoundException("User group was not found.");
            }

            var previousName = group.NameEn;
            group.NameEn = RequiredName(body?.NameEn, "NameEn");
            group.NameAr = RequiredName(body?.NameAr, "NameAr");
            group.SortOrder = body?.SortOrder ?? group.SortOrder;
            if (body != null && !body.IsActive)
            {
                var activeUsers = await _context.Users.CountAsync(u => u.UserGroupId == group.Id && u.IsActive);
                if (!IdentityAccessAdminRules.CanDeactivateUserGroup(group.UserType?.Code, group.Code, activeUsers))
                {
                    throw new SafeExecutionHelper.BadRequestException("This group cannot be deactivated.");
                }

                group.IsActive = false;
            }
            else if (body != null && body.IsActive)
            {
                group.IsActive = true;
            }

            group.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            await WriteAuditAsync(callerUserId, "UserGroup", group.Id.ToString(), "NameEn", previousName, group.NameEn, SystemAuditActions.Update);
            var count = await _context.Users.CountAsync(u => u.UserGroupId == group.Id && u.IsActive);
            var templateName = IdentityAccessAdminRules.TemplateRoleName(group.UserType?.Code, group.Code);
            var template = await _context.Roles.AsNoTracking()
                .FirstOrDefaultAsync(r => r.IsTemplate && (r.UserGroupId == group.Id || r.Name == templateName));
            return MapGroup(group, group.UserType?.Code, count, template?.Id, template?.Name ?? templateName);
        }

        public async Task DeactivateUserGroupAsync(int groupId, string callerUserId)
        {
            var group = await _context.UserGroups.FirstOrDefaultAsync(g => g.Id == groupId);
            if (group == null)
            {
                throw new SafeExecutionHelper.NotFoundException("User group was not found.");
            }

            await UpdateUserGroupAsync(groupId, new UpsertUserGroupRequestDto
            {
                NameEn = group.NameEn,
                NameAr = group.NameAr,
                SortOrder = group.SortOrder,
                IsActive = false
            }, callerUserId);
        }

        public async Task<PagedListResponseDto<IdentityAccessRoleRowDto>> GetRolesPageAsync(
            int? pageIndex,
            int? pageSize,
            string q,
            int? userTypeId,
            int? userGroupId,
            bool? templatesOnly)
        {
            var query = _context.Roles
                .AsNoTracking()
                .Include(r => r.UserGroup)
                    .ThenInclude(g => g.UserType)
                .Include(r => r.Organization)
                .Where(r => r.IsActive);

            if (templatesOnly == true)
            {
                query = query.Where(r => r.IsTemplate);
            }
            else if (templatesOnly == false)
            {
                query = query.Where(r => !r.IsTemplate);
            }

            if (userGroupId.HasValue && userGroupId.Value > 0)
            {
                query = query.Where(r => r.UserGroupId == userGroupId.Value);
            }

            if (userTypeId.HasValue && userTypeId.Value > 0)
            {
                query = query.Where(r => r.UserGroup != null && r.UserGroup.UserTypeId == userTypeId.Value);
            }

            var search = (q ?? string.Empty).Trim();
            if (search.Length > 0)
            {
                query = query.Where(r =>
                    (r.Name != null && r.Name.Contains(search))
                    || (r.UserGroup != null && r.UserGroup.NameEn != null && r.UserGroup.NameEn.Contains(search))
                    || (r.UserGroup != null && r.UserGroup.NameAr != null && r.UserGroup.NameAr.Contains(search)));
            }

            var total = await query.CountAsync();
            var size = IdentityAccessAdminRules.NormalizePageSize(pageSize);
            var index = IdentityAccessAdminRules.NormalizePageIndex(pageIndex, total, size);

            var rows = await query
                .OrderBy(r => r.Name)
                .Skip(index * size)
                .Take(size)
                .ToListAsync();

            return new PagedListResponseDto<IdentityAccessRoleRowDto>
            {
                rows = rows.Select(MapRole).ToList(),
                total = total,
                pageIndex = index,
                pageSize = size
            };
        }

        public async Task<IdentityAccessRoleRowDto> CreateCustomRoleAsync(CreateCustomRoleRequestDto body, string callerUserId)
        {
            var parent = await RequireRoleAsync(body?.ParentRoleId);
            var caller = await _context.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == callerUserId);
            var organizationId = IdentityAccessAdminRules.ResolveCustomRoleOrganizationId(
                body?.OrganizationId,
                caller?.OrganizationId);

            if (!IdentityAccessAdminRules.CanCreateCustomRole(organizationId, parent.IsTemplate, body?.Name))
            {
                throw new SafeExecutionHelper.BadRequestException(
                    organizationId == null || organizationId <= 0
                        ? "Your account has no organization; custom roles require an organization."
                        : "Custom role requires a template parent and a unique name.");
            }

            var org = await _context.Organizations.FirstOrDefaultAsync(o => o.Id == organizationId.Value && o.IsActive);
            if (org == null)
            {
                throw new SafeExecutionHelper.BadRequestException("Organization was not found.");
            }

            var name = body.Name.Trim();
            if (await _context.Roles.AnyAsync(r => r.OrganizationId == org.Id && r.Name == name))
            {
                throw new SafeExecutionHelper.BadRequestException("A role with this name already exists for the organization.");
            }

            var role = new Roles
            {
                Id = Guid.NewGuid().ToString(),
                Name = name,
                NormalizedName = name.ToUpperInvariant(),
                ConcurrencyStamp = Guid.NewGuid().ToString(),
                ParentRoleId = parent.Id,
                OrganizationId = org.Id,
                UserGroupId = parent.UserGroupId,
                IsTemplate = false,
                IsActive = true
            };
            _context.Roles.Add(role);
            await _context.SaveChangesAsync();

            var parentPages = await _context.RolePages.Where(rp => rp.RoleId == parent.Id).ToListAsync();
            foreach (var page in parentPages)
            {
                _context.RolePages.Add(new RolePage
                {
                    RoleId = role.Id,
                    AppPageId = page.AppPageId,
                    ActionFlags = IdentityAccessAdminRules.NormalizeActionFlags(page.ActionFlags),
                    DataScope = IdentityAccessAdminRules.NormalizeDataScope(page.DataScope, parent.UserGroup?.UserType?.Code)
                });
            }

            await _context.SaveChangesAsync();
            await WriteAuditAsync(callerUserId, "Role", role.Id, "Name", null, role.Name, SystemAuditActions.Create);

            var created = await _context.Roles
                .AsNoTracking()
                .Include(r => r.UserGroup)
                    .ThenInclude(g => g.UserType)
                .Include(r => r.Organization)
                .FirstAsync(r => r.Id == role.Id);
            return MapRole(created);
        }

        public async Task DeleteCustomRoleAsync(string roleId, string callerUserId)
        {
            var role = await RequireRoleAsync(roleId);
            if (!IdentityAccessAdminRules.CanDeleteRole(role.IsTemplate, role.Name))
            {
                throw new SafeExecutionHelper.BadRequestException("Template and locked roles cannot be deleted.");
            }

            var assigned = await _context.UserRoles.CountAsync(ur => ur.RoleId == role.Id);
            if (assigned > 0)
            {
                throw new SafeExecutionHelper.BadRequestException("Remove the role from users before deleting it.");
            }

            role.IsActive = false;
            await _context.SaveChangesAsync();
            await WriteAuditAsync(callerUserId, "Role", role.Id, "IsActive", "true", "false", SystemAuditActions.Delete);
        }

        public async Task<IdentityAccessRolePagesDto> GetRolePagesAsync(string roleId)
        {
            var role = await RequireRoleAsync(roleId);
            var pages = await LoadActivePagesAsync();
            var grants = await _context.RolePages
                .AsNoTracking()
                .Where(rp => rp.RoleId == role.Id)
                .ToListAsync();

            var (roleNameEn, roleNameAr) = IdentityAccessAdminRules.ResolveRoleDisplayNames(
                role.IsTemplate,
                role.Name,
                role.UserGroup?.NameEn,
                role.UserGroup?.NameAr);

            return new IdentityAccessRolePagesDto
            {
                RoleId = role.Id,
                RoleName = role.Name,
                RoleNameEn = roleNameEn,
                RoleNameAr = roleNameAr,
                IsLocked = IdentityAccessAdminRules.IsLockedTemplateRoleName(role.Name),
                Pages = pages,
                SelectedPageIds = grants.Select(g => g.AppPageId).ToList(),
                Grants = grants.Select(g => new IdentityAccessPageGrantDto
                {
                    AppPageId = g.AppPageId,
                    ActionFlags = IdentityAccessAdminRules.NormalizeActionFlags(g.ActionFlags),
                    DataScope = IdentityAccessAdminRules.NormalizeDataScope(g.DataScope, role.UserGroup?.UserType?.Code)
                }).ToList()
            };
        }

        public async Task<IdentityAccessRolePagesDto> UpdateRolePagesAsync(string roleId, UpdateRolePagesRequestDto body, string callerUserId)
        {
            var role = await RequireRoleAsync(roleId);
            if (!IdentityAccessAdminRules.CanEditRolePages(role.Name))
            {
                throw new SafeExecutionHelper.BadRequestException("This role cannot be edited.");
            }

            var grants = (body?.Grants ?? new List<IdentityAccessPageGrantDto>())
                .Where(g => g.AppPageId > 0)
                .GroupBy(g => g.AppPageId)
                .Select(g => g.Last())
                .ToList();
            if (grants.Count == 0)
            {
                grants = (body?.PageIds ?? new List<int>())
                    .Where(id => id > 0)
                    .Distinct()
                    .Select(id => new IdentityAccessPageGrantDto
                    {
                        AppPageId = id,
                        ActionFlags = IdentityAccessAdminRules.DefaultActionFlags(role.UserGroup?.UserType?.Code),
                        DataScope = IdentityAccessAdminRules.DefaultDataScope(role.UserGroup?.UserType?.Code)
                    })
                    .ToList();
            }

            var requestedIds = grants.Select(g => g.AppPageId).Distinct().ToList();
            if (requestedIds.Count > 0)
            {
                var validCount = await _context.AppPages.CountAsync(p => requestedIds.Contains(p.Id) && p.IsActive);
                if (validCount != requestedIds.Count)
                {
                    throw new SafeExecutionHelper.BadRequestException("One or more pages are invalid.");
                }
            }

            var existing = await _context.RolePages.Where(rp => rp.RoleId == role.Id).ToListAsync();
            _context.RolePages.RemoveRange(existing);
            foreach (var grant in grants)
            {
                _context.RolePages.Add(new RolePage
                {
                    RoleId = role.Id,
                    AppPageId = grant.AppPageId,
                    ActionFlags = IdentityAccessAdminRules.NormalizeActionFlags(grant.ActionFlags),
                    DataScope = IdentityAccessAdminRules.NormalizeDataScope(grant.DataScope, role.UserGroup?.UserType?.Code)
                });
            }

            await _context.SaveChangesAsync();
            await WriteAuditAsync(
                callerUserId,
                "RolePage",
                role.Id,
                "Pages",
                existing.Count.ToString(),
                grants.Count.ToString(),
                SystemAuditActions.Update);
            return await GetRolePagesAsync(role.Id);
        }

        public async Task<List<IdentityAccessAppPageDto>> GetPagesCatalogAsync()
        {
            return await LoadActivePagesAsync();
        }

        public async Task<IdentityAccessAppPageDto> UpdatePageRequirementsAsync(int pageId, UpdatePageRequirementsRequestDto body, string callerUserId)
        {
            var page = await _context.AppPages.FirstOrDefaultAsync(p => p.Id == pageId);
            if (page == null || !page.IsActive)
            {
                throw new SafeExecutionHelper.NotFoundException("Page was not found.");
            }

            var previous = page.RequiredActionFlags.ToString();
            page.RequiredActionFlags = IdentityAccessAdminRules.NormalizeActionFlags(body?.RequiredActionFlags);
            page.DefaultDataScope = IdentityAccessAdminRules.NormalizeDataScope(body?.DefaultDataScope, null);
            page.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            await WriteAuditAsync(callerUserId, "AppPage", page.Id.ToString(), "RequiredActionFlags", previous, page.RequiredActionFlags.ToString(), SystemAuditActions.Update);
            return MapPage(page);
        }

        public async Task<PagedListResponseDto<IdentityAccessOrganizationRowDto>> GetOrganizationsPageAsync(
            int? pageIndex,
            int? pageSize,
            string q)
        {
            var query = _context.Organizations.AsNoTracking().Where(o => o.IsActive);
            var search = (q ?? string.Empty).Trim();
            if (search.Length > 0)
            {
                query = query.Where(o =>
                    (o.CompanyNameEnglish != null && o.CompanyNameEnglish.Contains(search))
                    || (o.CompanyNameArabic != null && o.CompanyNameArabic.Contains(search))
                    || (o.CrNumber != null && o.CrNumber.Contains(search)));
            }

            var total = await query.CountAsync();
            var size = IdentityAccessAdminRules.NormalizePageSize(pageSize);
            var index = IdentityAccessAdminRules.NormalizePageIndex(pageIndex, total, size);
            var rows = await query
                .OrderBy(o => o.CompanyNameEnglish)
                .Skip(index * size)
                .Take(size)
                .Select(o => new IdentityAccessOrganizationRowDto
                {
                    Id = o.Id,
                    NameEn = o.CompanyNameEnglish,
                    NameAr = o.CompanyNameArabic,
                    CrNumber = o.CrNumber
                })
                .ToListAsync();

            return new PagedListResponseDto<IdentityAccessOrganizationRowDto>
            {
                rows = rows,
                total = total,
                pageIndex = index,
                pageSize = size
            };
        }

        public async Task<IdentityAccessPermissionDto> GetCurrentPermissionsAsync(string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new SafeExecutionHelper.UnauthorizedException("A valid user is required.");
            }

            var user = await _context.Users
                .AsNoTracking()
                .Include(u => u.UserGroup)
                    .ThenInclude(g => g.UserType)
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                throw new SafeExecutionHelper.UnauthorizedException("A valid user is required.");
            }

            var bypass = IdentityAccessAdminRules.BypassPageGrants(user.UserGroup?.UserType?.Code, user.UserGroup?.Code);
            var pages = await _context.AppPages.AsNoTracking().Where(p => p.IsActive).ToListAsync();
            if (bypass)
            {
                return new IdentityAccessPermissionDto
                {
                    Bypass = true,
                    Pages = pages.Select(p => new IdentityAccessPageGrantViewDto
                    {
                        AppPageId = p.Id,
                        Code = p.Code,
                        Url = p.Url,
                        ActionFlags = PageActionFlags.All,
                        DataScope = PageDataScopes.Everything
                    }).ToList()
                };
            }

            var roleIds = await _context.UserRoles.Where(ur => ur.UserId == userId).Select(ur => ur.RoleId).ToListAsync();
            var grants = await _context.RolePages
                .AsNoTracking()
                .Where(rp => roleIds.Contains(rp.RoleId))
                .ToListAsync();
            var merged = new Dictionary<int, IdentityAccessPageGrantViewDto>();
            var pageById = pages.ToDictionary(p => p.Id);
            foreach (var grant in grants)
            {
                if (!pageById.TryGetValue(grant.AppPageId, out var page))
                {
                    continue;
                }

                if (!merged.TryGetValue(page.Id, out var current))
                {
                    merged[page.Id] = new IdentityAccessPageGrantViewDto
                    {
                        AppPageId = page.Id,
                        Code = page.Code,
                        Url = page.Url,
                        ActionFlags = IdentityAccessAdminRules.NormalizeActionFlags(grant.ActionFlags),
                        DataScope = IdentityAccessAdminRules.NormalizeDataScope(grant.DataScope, user.UserGroup?.UserType?.Code)
                    };
                    continue;
                }

                current.ActionFlags = IdentityAccessAdminRules.MergeActionFlags(current.ActionFlags, grant.ActionFlags);
                current.DataScope = IdentityAccessAdminRules.WiderDataScope(current.DataScope, grant.DataScope);
            }

            return new IdentityAccessPermissionDto
            {
                Bypass = false,
                Pages = merged.Values.ToList()
            };
        }

        private async Task<Roles> RequireRoleAsync(string roleId)
        {
            if (string.IsNullOrWhiteSpace(roleId))
            {
                throw new SafeExecutionHelper.BadRequestException("Role id is required.");
            }

            var role = await _context.Roles
                .Include(r => r.UserGroup)
                    .ThenInclude(g => g.UserType)
                .FirstOrDefaultAsync(r => r.Id == roleId && r.IsActive);
            if (role == null)
            {
                throw new SafeExecutionHelper.NotFoundException("Role was not found.");
            }

            return role;
        }

        private async Task<List<IdentityAccessAppPageDto>> LoadActivePagesAsync()
        {
            var pages = await _context.AppPages
                .AsNoTracking()
                .Where(p => p.IsActive)
                .OrderBy(p => p.SystemCode)
                .ThenBy(p => p.SortOrder)
                .ThenBy(p => p.NameEn)
                .ToListAsync();
            return pages.Select(MapPage).ToList();
        }

        private static IdentityAccessAppPageDto MapPage(AppPage page)
        {
            return new IdentityAccessAppPageDto
            {
                Id = page.Id,
                Code = page.Code,
                SystemCode = page.SystemCode,
                Url = page.Url,
                NameEn = page.NameEn,
                NameAr = page.NameAr,
                SortOrder = page.SortOrder,
                RequiredActionFlags = IdentityAccessAdminRules.NormalizeActionFlags(page.RequiredActionFlags),
                DefaultDataScope = IdentityAccessAdminRules.NormalizeDataScope(page.DefaultDataScope, null)
            };
        }

        private async Task SwapTemplateRolesAsync(string userId, string typeCode, string groupCode, bool leavingCorporate)
        {
            var userRoles = await _context.UserRoles.Where(ur => ur.UserId == userId).ToListAsync();
            var roleIds = userRoles.Select(ur => ur.RoleId).ToList();
            var roles = await _context.Roles.Where(r => roleIds.Contains(r.Id)).ToListAsync();
            var roleById = roles.ToDictionary(r => r.Id, StringComparer.Ordinal);

            foreach (var link in userRoles)
            {
                if (!roleById.TryGetValue(link.RoleId, out var role))
                {
                    continue;
                }

                if (IdentityAccessAdminRules.IsAccountAdminRoleName(role.Name))
                {
                    continue;
                }

                if (role.IsTemplate || (leavingCorporate && role.OrganizationId != null))
                {
                    _context.UserRoles.Remove(link);
                }
            }

            var templateName = IdentityAccessAdminRules.TemplateRoleName(typeCode, groupCode);
            var template = await _context.Roles.FirstOrDefaultAsync(r => r.IsTemplate && r.Name == templateName);
            if (template == null)
            {
                throw new SafeExecutionHelper.BadRequestException("Template role for the selected group was not found.");
            }

            var alreadyLinked = await _context.UserRoles
                .AnyAsync(ur => ur.UserId == userId && ur.RoleId == template.Id);
            if (!alreadyLinked)
            {
                _context.UserRoles.Add(new AppUserRoles
                {
                    UserId = userId,
                    RoleId = template.Id
                });
            }
        }

        private async Task<int> ResolveOrCreateOrgForProfileAsync(int profileId, DateTime utcNow)
        {
            var profile = await _context.Profiles.FirstOrDefaultAsync(p => p.Id == profileId);
            if (profile == null)
            {
                return 0;
            }

            Organization org = null;
            if (!string.IsNullOrWhiteSpace(profile.CrNumber))
            {
                org = await _context.Organizations.FirstOrDefaultAsync(o => o.CrNumber == profile.CrNumber);
            }

            if (org == null)
            {
                org = new Organization
                {
                    Email = FirstNonEmpty(profile.ComanyEmail, profile.EmailAddress),
                    CrNumber = profile.CrNumber,
                    CompanyNameEnglish = profile.CompanyNameEnglish,
                    CompanyNameArabic = profile.CompanyNameArabic,
                    CompanyNameWithLegalEnglish = profile.CompanyNameWithLegalEnglish,
                    CompanyNameWithLegalArabic = profile.CompanyNameWithLegalArabic,
                    RyadaNo = profile.RyadaNo,
                    RegistrationDate = profile.RegistrationDate,
                    EstablishmentDate = profile.EstablishmentDate,
                    ExpiryDate = profile.ExpiryDate,
                    SubjectToForeignInvestment = profile.SubjectToForeignInvestment,
                    IsLicensed = false,
                    IsAuthorized = false,
                    LastVerified = null,
                    IsActive = true,
                    CreatedAt = utcNow,
                    UpdatedAt = utcNow
                };
                _context.Organizations.Add(org);
                await _context.SaveChangesAsync();
            }

            return org.Id;
        }

        private static IdentityAccessUserRowDto MapUser(AppUser user, string callerUserId, int activeAccountCount)
        {
            var profile = user.Profile;
            var group = user.UserGroup;
            var type = group?.UserType;
            return new IdentityAccessUserRowDto
            {
                Id = user.Id,
                ProfileId = user.ProfileId,
                NameEn = profile?.Name ?? string.Empty,
                NameAr = profile?.NameAr ?? string.Empty,
                Email = FirstNonEmpty(profile?.EmailAddress, user.Email, user.UserName) ?? string.Empty,
                UserTypeId = type?.Id,
                UserTypeCode = type?.Code,
                UserTypeNameEn = type?.NameEn,
                UserTypeNameAr = type?.NameAr,
                UserGroupId = group?.Id ?? user.UserGroupId,
                UserGroupCode = group?.Code,
                UserGroupNameEn = group?.NameEn,
                UserGroupNameAr = group?.NameAr,
                IsActive = user.IsActive,
                IsPrimary = user.IsPrimary,
                HasRequesterCapability = IdentityAccessAdminRules.HasRequesterCapability(type?.Code),
                CanRemove = IdentityAccessAdminRules.CanRemoveAccount(
                    !string.IsNullOrWhiteSpace(callerUserId)
                        && string.Equals(user.Id, callerUserId, StringComparison.Ordinal),
                    activeAccountCount,
                    false),
                IsSelf = !string.IsNullOrWhiteSpace(callerUserId)
                    && string.Equals(user.Id, callerUserId, StringComparison.Ordinal)
            };
        }

        private static IdentityAccessRoleRowDto MapRole(Roles role)
        {
            var group = role.UserGroup;
            var type = group?.UserType;
            var (displayEn, displayAr) = IdentityAccessAdminRules.ResolveRoleDisplayNames(
                role.IsTemplate,
                role.Name,
                group?.NameEn,
                group?.NameAr);
            return new IdentityAccessRoleRowDto
            {
                Id = role.Id,
                Name = role.Name,
                DisplayNameEn = displayEn,
                DisplayNameAr = displayAr,
                UserTypeId = type?.Id,
                UserTypeCode = type?.Code,
                UserTypeNameEn = type?.NameEn,
                UserTypeNameAr = type?.NameAr,
                UserGroupId = group?.Id ?? role.UserGroupId,
                UserGroupCode = group?.Code,
                UserGroupNameEn = group?.NameEn,
                UserGroupNameAr = group?.NameAr,
                IsTemplate = role.IsTemplate,
                IsLocked = IdentityAccessAdminRules.IsLockedTemplateRoleName(role.Name),
                CanDelete = IdentityAccessAdminRules.CanDeleteRole(role.IsTemplate, role.Name),
                OrganizationId = role.OrganizationId,
                OrganizationNameEn = role.Organization?.CompanyNameEnglish,
                OrganizationNameAr = role.Organization?.CompanyNameArabic,
                ParentRoleId = role.ParentRoleId
            };
        }

        private static IdentityAccessUserGroupDto MapGroup(
            UserGroup group,
            string typeCode,
            int activeUserCount,
            string templateRoleId = null,
            string templateRoleName = null)
        {
            var (templateEn, templateAr) = IdentityAccessAdminRules.ResolveRoleDisplayNames(
                isTemplate: true,
                roleName: templateRoleName,
                userGroupNameEn: group.NameEn,
                userGroupNameAr: group.NameAr);
            return new IdentityAccessUserGroupDto
            {
                Id = group.Id,
                UserTypeId = group.UserTypeId,
                Code = group.Code,
                NameEn = group.NameEn,
                NameAr = group.NameAr,
                SortOrder = group.SortOrder,
                IsActive = group.IsActive,
                IsProtected = IdentityAccessAdminRules.IsProtectedSeedGroup(typeCode, group.Code),
                CanDeactivate = IdentityAccessAdminRules.CanDeactivateUserGroup(typeCode, group.Code, activeUserCount),
                TemplateRoleId = templateRoleId,
                TemplateRoleName = templateRoleName,
                TemplateRoleNameEn = templateEn,
                TemplateRoleNameAr = templateAr
            };
        }

        private async Task TryAutoGrantAccountAdminAsync(string userId, int organizationId, string userTypeCode, string callerUserId)
        {
            var existing = await CountAccountAdminsAsync(organizationId, null);
            if (!IdentityAccessAdminRules.ShouldAutoGrantAccountAdmin(userTypeCode, existing))
            {
                return;
            }

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == IdentityRoleNames.AccountAdmin && r.IsActive);
            if (role == null)
            {
                return;
            }

            if (await _context.UserRoles.AnyAsync(ur => ur.UserId == userId && ur.RoleId == role.Id))
            {
                return;
            }

            _context.UserRoles.Add(new AppUserRoles { UserId = userId, RoleId = role.Id });
            await WriteAuditAsync(callerUserId, "RoleGrant", userId, "Role", null, role.Name, SystemAuditActions.Create);
        }

        private async Task<bool> UserHasAccountAdminAsync(string userId)
        {
            var role = await _context.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.Name == IdentityRoleNames.AccountAdmin);
            if (role == null)
            {
                return false;
            }

            return await _context.UserRoles.AnyAsync(ur => ur.UserId == userId && ur.RoleId == role.Id);
        }

        private async Task<int> CountAccountAdminsAsync(int organizationId, string exceptUserId)
        {
            var role = await _context.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.Name == IdentityRoleNames.AccountAdmin);
            if (role == null)
            {
                return 0;
            }

            var query = from ur in _context.UserRoles
                        join u in _context.Users on ur.UserId equals u.Id
                        where ur.RoleId == role.Id
                              && u.IsActive
                              && u.OrganizationId == organizationId
                        select u.Id;
            if (!string.IsNullOrWhiteSpace(exceptUserId))
            {
                query = query.Where(id => id != exceptUserId);
            }

            return await query.CountAsync();
        }

        private async Task WriteAuditAsync(
            string callerUserId,
            string entityType,
            string entityReference,
            string field,
            string oldValue,
            string newValue,
            string action)
        {
            _context.SystemAuditTrails.Add(new SystemAuditTrail
            {
                Module = SystemAuditModules.IdentityAccess,
                EntityType = entityType,
                EntityReference = entityReference ?? string.Empty,
                Field = field ?? string.Empty,
                OldValue = oldValue,
                NewValue = newValue,
                Action = action,
                Source = SystemAuditSources.Ui,
                UpdatedByUserId = callerUserId,
                UpdatedDate = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
        }

        private static string RequiredName(string value, string field)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new SafeExecutionHelper.BadRequestException($"{field} is required.");
            }

            return value.Trim();
        }

        private static string FirstNonEmpty(params string[] values)
        {
            foreach (var value in values)
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value.Trim();
                }
            }

            return null;
        }
    }
}
