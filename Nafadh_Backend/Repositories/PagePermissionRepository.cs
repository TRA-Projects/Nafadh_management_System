using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using System.Data;

namespace Nafadh_Backend.Repositories
{
    public class PagePermissionRepository : IPagePermissionRepository
    {
        private readonly Nafadhcontext _context;

        public PagePermissionRepository(Nafadhcontext context)
        {
            _context = context;
        }

        public async Task<List<UserPagePermissionDto>> GetUserNafadhPermissionsAsync(string? email, int? nfdUserId)
        {
            var actionDefinitions = new List<(string ValueKey, int Flag)>();
            var rawRows = new List<(string PageCode, string NameAr, string NameEn, string Url, int ActionFlags, string DataScope, int ScopeOrder)>();

            var conn = _context.Database.GetDbConnection();
            var shouldClose = conn.State != ConnectionState.Open;

            const string sql = @"
                SELECT v.ValueKey, ISNULL(TRY_CAST(v.Code AS INT), 0) AS FlagValue
                FROM dbo.SystemConfigValues v
                INNER JOIN dbo.SystemConfigGroups g ON g.Id = v.ConfigGroupId
                WHERE g.Code = N'NFD_PAGE_ACT'
                  AND g.IsActive = 1
                  AND v.IsActive = 1
                ORDER BY v.SortOrder;

                DECLARE @ResolvedEmail NVARCHAR(256) = NULL;
                DECLARE @CleanInput NVARCHAR(256) = LOWER(LTRIM(RTRIM(ISNULL(@Email, N''))));

                -- 1) Prefer canonical Email from NFD_Users using NfdUserId when available
                IF @NfdUserId IS NOT NULL AND @NfdUserId > 0
                BEGIN
                    SELECT TOP 1 @ResolvedEmail = LOWER(LTRIM(RTRIM(Email)))
                    FROM dbo.NFD_Users
                    WHERE UserId = @NfdUserId
                      AND Email IS NOT NULL
                      AND LTRIM(RTRIM(Email)) <> N'';
                END

                -- 2) Fallback: resolve Email or UserName from NFD_Users / AspNetUsers
                IF (@ResolvedEmail IS NULL OR @ResolvedEmail = N'') AND @CleanInput <> N''
                BEGIN
                    SELECT TOP 1 @ResolvedEmail = LOWER(LTRIM(RTRIM(Email)))
                    FROM dbo.NFD_Users
                    WHERE LOWER(LTRIM(RTRIM(Email))) = @CleanInput;

                    IF @ResolvedEmail IS NULL OR @ResolvedEmail = N''
                    BEGIN
                        SELECT TOP 1 @ResolvedEmail = LOWER(LTRIM(RTRIM(Email)))
                        FROM dbo.AspNetUsers
                        WHERE LOWER(LTRIM(RTRIM(Email))) = @CleanInput
                           OR LOWER(LTRIM(RTRIM(UserName))) = @CleanInput;
                    END

                    IF @ResolvedEmail IS NULL OR @ResolvedEmail = N''
                    BEGIN
                        SET @ResolvedEmail = @CleanInput;
                    END
                END

                IF @ResolvedEmail IS NOT NULL AND @ResolvedEmail <> N''
                BEGIN
                    DECLARE @HasCustomNafadhRole BIT = 0;
                    DECLARE @EffectiveTemplateRoleId NVARCHAR(450) = NULL;
                    DECLARE @FallbackRoleName NVARCHAR(256) = NULL;

                    -- Tier 1: Custom Role (IsTemplate = 0) takes priority ONLY if explicitly assigned to this user
                    IF EXISTS (
                        SELECT 1
                        FROM dbo.AspNetUsers au
                        INNER JOIN dbo.AspNetUserRoles ur ON ur.UserId = au.Id
                        INNER JOIN dbo.AspNetRoles r ON r.Id = ur.RoleId AND r.IsActive = 1 AND ISNULL(r.IsTemplate, 0) = 0
                        INNER JOIN dbo.AspNetRolePages rpCheck ON rpCheck.RoleId = r.Id
                        INNER JOIN dbo.AppPages apCheck ON apCheck.Id = rpCheck.AppPageId
                        WHERE (LOWER(LTRIM(RTRIM(au.Email))) = @ResolvedEmail OR au.NormalizedEmail = UPPER(@ResolvedEmail))
                          AND (apCheck.SystemCode = N'Nafadh' OR apCheck.Code LIKE N'nf.%')
                          AND apCheck.IsActive = 1
                    )
                    BEGIN
                        SET @HasCustomNafadhRole = 1;
                    END

                    -- Tier 2A (STRICT ONE-ROLE LOCK): Use ONLY the single Template Role matching au.UserGroupId
                    IF @HasCustomNafadhRole = 0
                    BEGIN
                        SELECT TOP 1 @EffectiveTemplateRoleId = r.Id
                        FROM dbo.AspNetUsers au
                        INNER JOIN dbo.AspNetRoles r
                            ON r.UserGroupId = au.UserGroupId
                           AND r.IsTemplate = 1
                           AND r.IsActive = 1
                        LEFT JOIN dbo.UserGroups ug ON ug.Id = au.UserGroupId
                        WHERE (LOWER(LTRIM(RTRIM(au.Email))) = @ResolvedEmail OR au.NormalizedEmail = UPPER(@ResolvedEmail))
                          AND au.UserGroupId IS NOT NULL
                          AND (
                                ug.Code IN (N'SystemAdmin', N'NafadhTrainer', N'NafadhTrainee', N'NafadhOperator', N'NafadhSupervisor', N'NafadhStaff')
                             OR EXISTS (
                                    SELECT 1
                                    FROM dbo.AspNetRolePages rpCheck
                                    INNER JOIN dbo.AppPages apCheck ON apCheck.Id = rpCheck.AppPageId
                                    WHERE rpCheck.RoleId = r.Id
                                      AND (apCheck.SystemCode = N'Nafadh' OR apCheck.Code LIKE N'nf.%')
                                      AND apCheck.IsActive = 1
                                )
                          );
                    END

                    -- Tier 2B: Only if au.UserGroupId is NULL, pick TOP 1 single Nafadh Template Role from AspNetUserRoles
                    IF @HasCustomNafadhRole = 0 AND @EffectiveTemplateRoleId IS NULL
                    BEGIN
                        SELECT TOP 1 @EffectiveTemplateRoleId = r.Id
                        FROM dbo.AspNetUsers au
                        INNER JOIN dbo.AspNetUserRoles ur ON ur.UserId = au.Id
                        INNER JOIN dbo.AspNetRoles r ON r.Id = ur.RoleId AND r.IsActive = 1 AND r.IsTemplate = 1
                        LEFT JOIN dbo.UserGroups ug ON ug.Id = r.UserGroupId
                        WHERE (LOWER(LTRIM(RTRIM(au.Email))) = @ResolvedEmail OR au.NormalizedEmail = UPPER(@ResolvedEmail))
                          AND ug.Code IN (N'SystemAdmin', N'NafadhOperator', N'NafadhSupervisor', N'NafadhStaff', N'NafadhTrainer', N'NafadhTrainee')
                        ORDER BY ug.SortOrder;
                    END

                    -- Tier 3: Fallback via NFD_Users for newly registered users not yet synced to AspNetUsers
                    IF @HasCustomNafadhRole = 0 AND @EffectiveTemplateRoleId IS NULL
                    BEGIN
                        SELECT TOP 1
                            @FallbackRoleName = CASE
                                WHEN nu.RoleId = 1 THEN N'System.SystemAdmin'
                                WHEN nu.RoleId = 3 THEN N'Individual.NafadhTrainer'
                                WHEN nu.RoleId = 4 THEN N'Individual.NafadhTrainee'
                                WHEN nu.RoleId = 2 THEN
                                    CASE
                                        WHEN EXISTS (SELECT 1 FROM dbo.NFD_Companies c WHERE c.UserId = nu.UserId)
                                             AND NOT EXISTS (SELECT 1 FROM dbo.NFD_CompanySupervisors cs WHERE cs.UserId = nu.UserId)
                                            THEN N'Corporate.NafadhOperator'
                                        WHEN EXISTS (
                                            SELECT 1
                                            FROM dbo.NFD_CompanySupervisors cs
                                            WHERE cs.UserId = nu.UserId
                                              AND (
                                                    cs.Position LIKE N'%منسق%'
                                                 OR cs.Position LIKE N'%أخصائي%'
                                                 OR cs.Position LIKE N'%موظف%'
                                              )
                                        )
                                            THEN N'Corporate.NafadhStaff'
                                        ELSE N'Corporate.NafadhSupervisor'
                                    END
                                ELSE NULL
                            END
                        FROM dbo.NFD_Users nu
                        WHERE (@NfdUserId IS NOT NULL AND @NfdUserId > 0 AND nu.UserId = @NfdUserId)
                           OR LOWER(LTRIM(RTRIM(nu.Email))) = @ResolvedEmail
                        ORDER BY CASE WHEN @NfdUserId IS NOT NULL AND nu.UserId = @NfdUserId THEN 0 ELSE 1 END;

                        IF @FallbackRoleName IS NOT NULL
                        BEGIN
                            SELECT TOP 1 @EffectiveTemplateRoleId = r.Id
                            FROM dbo.AspNetRoles r
                            WHERE r.Name = @FallbackRoleName
                              AND r.IsTemplate = 1
                              AND r.IsActive = 1;
                        END
                    END

                    SELECT
                        ap.Code,
                        ap.NameAr,
                        ap.NameEn,
                        ap.Url,
                        rp.ActionFlags,
                        rp.DataScope,
                        ISNULL(scvScope.SortOrder, 0) AS ScopeOrder
                    FROM dbo.AppPages ap
                    INNER JOIN dbo.AspNetRolePages rp ON rp.AppPageId = ap.Id
                    INNER JOIN dbo.AspNetRoles r ON r.Id = rp.RoleId AND r.IsActive = 1
                    LEFT JOIN dbo.SystemConfigGroups scgScope
                        ON scgScope.Code = N'NFD_DATA_SCOPE' AND scgScope.IsActive = 1
                    LEFT JOIN dbo.SystemConfigValues scvScope
                        ON scvScope.ConfigGroupId = scgScope.Id
                       AND scvScope.ValueKey = rp.DataScope
                       AND scvScope.IsActive = 1
                    WHERE (ap.SystemCode = N'Nafadh' OR ap.Code LIKE N'nf.%')
                      AND ap.IsActive = 1
                      AND (
                            -- Tier 1: Custom Role(s)
                            (
                                @HasCustomNafadhRole = 1
                                AND ISNULL(r.IsTemplate, 0) = 0
                                AND EXISTS (
                                    SELECT 1
                                    FROM dbo.AspNetUsers au
                                    INNER JOIN dbo.AspNetUserRoles ur ON ur.UserId = au.Id
                                    WHERE ur.RoleId = r.Id
                                      AND (LOWER(LTRIM(RTRIM(au.Email))) = @ResolvedEmail OR au.NormalizedEmail = UPPER(@ResolvedEmail))
                                )
                            )
                            OR
                            -- Tier 2 & 3: STRICTLY ONE Template Role ONLY (no merging across Operator/Supervisor/Staff!)
                            (
                                @HasCustomNafadhRole = 0
                                AND @EffectiveTemplateRoleId IS NOT NULL
                                AND r.Id = @EffectiveTemplateRoleId
                            )
                      );
                END";

            try
            {
                if (shouldClose)
                    await conn.OpenAsync();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = sql;
                cmd.Parameters.Add(new SqlParameter("@Email", (object?)email ?? DBNull.Value));
                cmd.Parameters.Add(new SqlParameter("@NfdUserId", (object?)nfdUserId ?? DBNull.Value));

                using var reader = await cmd.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    var key = reader.GetString(0);
                    var flag = reader.GetInt32(1);
                    if (flag > 0)
                        actionDefinitions.Add((key, flag));
                }

                if (actionDefinitions.Count == 0)
                {
                    actionDefinitions.AddRange(new[]
                    {
                        ("view", 1),
                        ("create", 2),
                        ("edit", 4),
                        ("approve", 8),
                        ("award", 16)
                    });
                }

                if (await reader.NextResultAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        rawRows.Add((
                            PageCode: reader.GetString(0),
                            NameAr: reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                            NameEn: reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                            Url: reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                            ActionFlags: reader.GetInt32(4),
                            DataScope: reader.IsDBNull(5) ? string.Empty : reader.GetString(5),
                            ScopeOrder: reader.GetInt32(6)
                        ));
                    }
                }
            }
            finally
            {
                if (shouldClose && conn.State == ConnectionState.Open)
                    await conn.CloseAsync();
            }

            return rawRows
                .GroupBy(x => x.PageCode, StringComparer.OrdinalIgnoreCase)
                .Select(g =>
                {
                    var first = g.First();
                    var combinedFlags = 0;
                    foreach (var item in g)
                        combinedFlags |= item.ActionFlags;

                    var bestScope = g
                        .OrderByDescending(x => x.ScopeOrder)
                        .Select(x => x.DataScope)
                        .FirstOrDefault() ?? string.Empty;

                    var allowedActions = actionDefinitions
                        .Where(a => (combinedFlags & a.Flag) == a.Flag)
                        .Select(a => a.ValueKey)
                        .ToList();

                    return new UserPagePermissionDto
                    {
                        PageCode = first.PageCode,
                        NameAr = first.NameAr,
                        NameEn = first.NameEn,
                        Url = first.Url,
                        ActionFlags = combinedFlags,
                        DataScope = bestScope,
                        AllowedActions = allowedActions
                    };
                })
                .OrderBy(x => x.PageCode)
                .ToList();
        }
    }
}