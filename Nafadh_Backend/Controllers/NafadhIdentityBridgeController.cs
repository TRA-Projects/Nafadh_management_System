using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NafadhIdentityBridgeController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _env;

        public NafadhIdentityBridgeController(IConfiguration configuration, IWebHostEnvironment env)
        {
            _configuration = configuration;
            _env = env;
        }

        [HttpGet("snapshot")]
        [AllowAnonymous]
        public async Task<IActionResult> GetIdentitySnapshot(CancellationToken cancellationToken)
        {
            // في بيئة الإنتاج يشترط التوكن، وفي بيئة التطوير يعمل مباشرة لتجنب تعطل العرض لو انتهت الجلسة المحلية
            if (!_env.IsDevelopment() && !(User?.Identity?.IsAuthenticated ?? false))
            {
                return Unauthorized();
            }

            var connectionString = _configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                return StatusCode(500, new { message = "DefaultConnection is not configured." });
            }

            var roles = new List<object>();
            var users = new List<object>();
            var permissions = new List<object>();
            var rolePermissions = new List<object>();
            var companies = new List<object>();
            var departments = new List<object>();
            var supervisors = new List<object>();

            await using var conn = new SqlConnection(connectionString);
            await conn.OpenAsync(cancellationToken);

            // 1. جلب الأدوار (NFD_Roles) مع عدد المستخدمين والصلاحيات
            const string rolesSql = @"
                SELECT 
                    r.RoleId,
                    ISNULL(CAST(r.RoleName AS NVARCHAR(200)), N'') AS RoleName,
                    (SELECT COUNT(1) FROM dbo.NFD_Users u WHERE u.RoleId = r.RoleId) AS UsersCount,
                    (SELECT COUNT(1) FROM dbo.NFD_RolePermissions rp WHERE rp.RoleId = r.RoleId) AS PermissionsCount
                FROM dbo.NFD_Roles r
                ORDER BY r.RoleId;";

            await using (var cmd = new SqlCommand(rolesSql, conn))
            await using (var reader = await cmd.ExecuteReaderAsync(cancellationToken))
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    roles.Add(new
                    {
                        roleId = Convert.ToInt32(reader["RoleId"]),
                        roleName = Convert.ToString(reader["RoleName"]) ?? string.Empty,
                        usersCount = Convert.ToInt32(reader["UsersCount"]),
                        permissionsCount = Convert.ToInt32(reader["PermissionsCount"])
                    });
                }
            }

            // 2. جلب المستخدمين (NFD_Users) مع الدور والشركة المرتبطة إن وجدت
            const string usersSql = @"
                SELECT 
                    u.UserId,
                    ISNULL(CAST(u.FullName AS NVARCHAR(300)), N'') AS FullName,
                    ISNULL(CAST(u.Email AS NVARCHAR(300)), N'') AS Email,
                    ISNULL(CAST(u.Phone AS NVARCHAR(100)), N'') AS Phone,
                    ISNULL(u.RoleId, 0) AS RoleId,
                    ISNULL(CAST(r.RoleName AS NVARCHAR(200)), N'') AS RoleName,
                    ISNULL(CAST(u.Status AS NVARCHAR(100)), N'Active') AS Status,
                    COALESCE(cOwner.CompanyId, cs.CompanyId, tr.CompanyId) AS CompanyId,
                    ISNULL(CAST(COALESCE(cOwner.CompanyName, cSup.CompanyName, cTr.CompanyName) AS NVARCHAR(300)), N'') AS CompanyName
                FROM dbo.NFD_Users u
                LEFT JOIN dbo.NFD_Roles r ON r.RoleId = u.RoleId
                OUTER APPLY (SELECT TOP 1 CompanyId, CompanyName FROM dbo.NFD_Companies c WHERE c.UserId = u.UserId) cOwner
                OUTER APPLY (SELECT TOP 1 CompanyId FROM dbo.NFD_CompanySupervisors s WHERE s.UserId = u.UserId) cs
                LEFT JOIN dbo.NFD_Companies cSup ON cSup.CompanyId = cs.CompanyId
                OUTER APPLY (SELECT TOP 1 CompanyId FROM dbo.NFD_Trainees t WHERE t.UserId = u.UserId) tr
                LEFT JOIN dbo.NFD_Companies cTr ON cTr.CompanyId = tr.CompanyId
                ORDER BY u.UserId DESC;";

            await using (var cmd = new SqlCommand(usersSql, conn))
            await using (var reader = await cmd.ExecuteReaderAsync(cancellationToken))
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    users.Add(new
                    {
                        userId = Convert.ToInt32(reader["UserId"]),
                        fullName = Convert.ToString(reader["FullName"]) ?? string.Empty,
                        email = Convert.ToString(reader["Email"]) ?? string.Empty,
                        phone = Convert.ToString(reader["Phone"]) ?? string.Empty,
                        roleId = Convert.ToInt32(reader["RoleId"]),
                        roleName = Convert.ToString(reader["RoleName"]) ?? string.Empty,
                        status = Convert.ToString(reader["Status"]) ?? "Active",
                        companyId = reader["CompanyId"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["CompanyId"]),
                        companyName = Convert.ToString(reader["CompanyName"]) ?? string.Empty
                    });
                }
            }

            // 3. جلب الصلاحيات (NFD_Permissions)
            const string permsSql = @"
                SELECT 
                    p.PermissionId,
                    ISNULL(CAST(p.PermissionKey AS NVARCHAR(200)), N'') AS PermissionKey,
                    ISNULL(CAST(p.Description AS NVARCHAR(500)), N'') AS Description
                FROM dbo.NFD_Permissions p
                ORDER BY p.PermissionId;";

            await using (var cmd = new SqlCommand(permsSql, conn))
            await using (var reader = await cmd.ExecuteReaderAsync(cancellationToken))
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    permissions.Add(new
                    {
                        permissionId = Convert.ToInt32(reader["PermissionId"]),
                        permissionKey = Convert.ToString(reader["PermissionKey"]) ?? string.Empty,
                        description = Convert.ToString(reader["Description"]) ?? string.Empty
                    });
                }
            }

            // 4. جلب ربط الأدوار بالصلاحيات (NFD_RolePermissions)
            const string rolePermsSql = @"SELECT RoleId, PermissionId FROM dbo.NFD_RolePermissions;";
            await using (var cmd = new SqlCommand(rolePermsSql, conn))
            await using (var reader = await cmd.ExecuteReaderAsync(cancellationToken))
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    rolePermissions.Add(new
                    {
                        roleId = Convert.ToInt32(reader["RoleId"]),
                        permissionId = Convert.ToInt32(reader["PermissionId"])
                    });
                }
            }

            // 5. جلب الشركات (NFD_Companies)
            const string companiesSql = @"
                SELECT 
                    c.CompanyId,
                    ISNULL(CAST(c.CompanyName AS NVARCHAR(300)), N'') AS CompanyName,
                    ISNULL(CAST(c.CommercialRegister AS NVARCHAR(150)), N'') AS CommercialRegister,
                    ISNULL(CAST(c.WorkField AS NVARCHAR(200)), N'') AS WorkField,
                    ISNULL(CAST(c.Status AS NVARCHAR(100)), N'Active') AS Status
                FROM dbo.NFD_Companies c
                ORDER BY c.CompanyId DESC;";

            await using (var cmd = new SqlCommand(companiesSql, conn))
            await using (var reader = await cmd.ExecuteReaderAsync(cancellationToken))
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    companies.Add(new
                    {
                        companyId = Convert.ToInt32(reader["CompanyId"]),
                        companyName = Convert.ToString(reader["CompanyName"]) ?? string.Empty,
                        commercialRegister = Convert.ToString(reader["CommercialRegister"]) ?? string.Empty,
                        workField = Convert.ToString(reader["WorkField"]) ?? string.Empty,
                        status = Convert.ToString(reader["Status"]) ?? "Active"
                    });
                }
            }

            // 6. جلب الأقسام (NFD_Departments) للأدوار المخصصة
            const string deptsSql = @"
                SELECT 
                    d.DepartmentId,
                    d.CompanyId,
                    ISNULL(CAST(d.Name AS NVARCHAR(250)), N'') AS DepartmentName,
                    ISNULL(CAST(c.CompanyName AS NVARCHAR(300)), N'') AS CompanyName,
                    (SELECT COUNT(1) FROM dbo.NFD_Enrollments e WHERE e.DepartmentId = d.DepartmentId) AS MembersCount
                FROM dbo.NFD_Departments d
                LEFT JOIN dbo.NFD_Companies c ON c.CompanyId = d.CompanyId
                ORDER BY d.DepartmentId DESC;";

            await using (var cmd = new SqlCommand(deptsSql, conn))
            await using (var reader = await cmd.ExecuteReaderAsync(cancellationToken))
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    departments.Add(new
                    {
                        departmentId = Convert.ToInt32(reader["DepartmentId"]),
                        companyId = Convert.ToInt32(reader["CompanyId"]),
                        departmentName = Convert.ToString(reader["DepartmentName"]) ?? string.Empty,
                        companyName = Convert.ToString(reader["CompanyName"]) ?? string.Empty,
                        membersCount = Convert.ToInt32(reader["MembersCount"])
                    });
                }
            }

            // 7. جلب مشرفي الشركات ومناصبهم (NFD_CompanySupervisors) للأدوار المخصصة
            const string supervisorsSql = @"
                SELECT 
                    cs.SupervisorId,
                    cs.CompanyId,
                    ISNULL(CAST(cs.Department AS NVARCHAR(200)), N'') AS Department,
                    ISNULL(CAST(cs.Position AS NVARCHAR(200)), N'') AS Position,
                    ISNULL(CAST(cs.Status AS NVARCHAR(100)), N'Active') AS Status,
                    ISNULL(CAST(c.CompanyName AS NVARCHAR(300)), N'') AS CompanyName
                FROM dbo.NFD_CompanySupervisors cs
                LEFT JOIN dbo.NFD_Companies c ON c.CompanyId = cs.CompanyId
                ORDER BY cs.SupervisorId DESC;";

            await using (var cmd = new SqlCommand(supervisorsSql, conn))
            await using (var reader = await cmd.ExecuteReaderAsync(cancellationToken))
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    supervisors.Add(new
                    {
                        supervisorId = Convert.ToInt32(reader["SupervisorId"]),
                        companyId = Convert.ToInt32(reader["CompanyId"]),
                        department = Convert.ToString(reader["Department"]) ?? string.Empty,
                        position = Convert.ToString(reader["Position"]) ?? string.Empty,
                        status = Convert.ToString(reader["Status"]) ?? "Active",
                        companyName = Convert.ToString(reader["CompanyName"]) ?? string.Empty
                    });
                }
            }

            return Ok(new
            {
                roles,
                users,
                permissions,
                rolePermissions,
                companies,
                departments,
                supervisors
            });
        }
    }
}