#nullable disable
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Nafadh_Backend.IdentityAccess
{
    /// <summary>
    /// Identity &amp; Access admin API (users, groups, templates/roles, pages) served from the Nafadh backend
    /// against the shared database. Same routes and payloads as Bidding_API's AdminIdentityAccessController.
    /// Authorization uses the Nafadh login token (Admin / SuperAdmin), so no Bidding token is needed.
    /// </summary>
    [ApiController]
    [Route("api/admin/identity")]
    [Authorize(AuthenticationSchemes = "Bearer,BiddingBearer")]
    public class AdminIdentityAccessController : ControllerBase
    {
        private readonly IIdentityAccessAdminService _identityAccessAdminService;
        private readonly IdentityAccessDbContext _db;
        private string _callerUserId;
        private bool _callerResolved;

        public AdminIdentityAccessController(IIdentityAccessAdminService identityAccessAdminService, IdentityAccessDbContext db)
        {
            _identityAccessAdminService = identityAccessAdminService;
            _db = db;
        }

        private IActionResult PascalOk(object value) => new JsonResult(value, ApiResponseHelper.PascalCase);

        private void EnsureAdminCaller()
        {
            if (!(User.IsInRole("Admin") || User.IsInRole("SuperAdmin")))
            {
                throw new SafeExecutionHelper.ForbiddenException("This resource is restricted to Admin users.");
            }
        }

        /// <summary>
        /// The service records and compares AspNetUsers.Id, so the Nafadh caller is mapped to the
        /// matching identity account by email (primary account first). Null when none exists.
        /// </summary>
        private string CallerUserId()
        {
            if (_callerResolved) return _callerUserId;
            _callerResolved = true;

            var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
            if (string.IsNullOrWhiteSpace(email)) return null;

            var normalized = email.Trim().ToUpperInvariant();
            _callerUserId = _db.Users.AsNoTracking()
                .Where(u => u.NormalizedEmail == normalized && u.IsActive)
                .OrderByDescending(u => u.IsPrimary)
                .Select(u => u.Id)
                .FirstOrDefault();
            return _callerUserId;
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers(
            [FromQuery] int pageIndex = 0,
            [FromQuery] int pageSize = 5,
            [FromQuery] string q = null,
            [FromQuery] int? userTypeId = null,
            [FromQuery] int? userGroupId = null,
            [FromQuery] bool? isActive = null)
        {
            return await SafeExecutionHelper.ExecuteSafelyAsync(async () =>
            {
                EnsureAdminCaller();
                var page = await _identityAccessAdminService.GetUsersPageAsync(
                    pageIndex,
                    pageSize,
                    q,
                    userTypeId,
                    userGroupId,
                    isActive,
                    CallerUserId());
                return PascalOk(new { Code = "Success", Data = page });
            }, ApiResponseHelper.CreateErrorResponse);
        }

        [HttpPost("users")]
        public async Task<IActionResult> CreateAdminUser([FromBody] CreateAdminUserRequestDto body)
        {
            return await SafeExecutionHelper.ExecuteSafelyAsync(async () =>
            {
                EnsureAdminCaller();
                var row = await _identityAccessAdminService.CreateAdminUserAsync(body, CallerUserId());
                return PascalOk(new { Code = "Success", Data = row });
            }, ApiResponseHelper.CreateErrorResponse);
        }

        [HttpPut("users/{id}")]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateAdminUserRequestDto body)
        {
            return await SafeExecutionHelper.ExecuteSafelyAsync(async () =>
            {
                EnsureAdminCaller();
                var row = await _identityAccessAdminService.UpdateAdminUserAsync(id, body, CallerUserId());
                return PascalOk(new { Code = "Success", Data = row });
            }, ApiResponseHelper.CreateErrorResponse);
        }

        [HttpPut("users/{id}/group")]
        public async Task<IActionResult> ChangeUserGroup(string id, [FromBody] ChangeUserGroupRequestDto body)
        {
            return await SafeExecutionHelper.ExecuteSafelyAsync(async () =>
            {
                EnsureAdminCaller();
                if (body == null || body.UserGroupId <= 0)
                {
                    throw new SafeExecutionHelper.BadRequestException("UserGroupId is required.");
                }

                var row = await _identityAccessAdminService.ChangeUserGroupAsync(id, body.UserGroupId, CallerUserId());
                return PascalOk(new { Code = "Success", Data = row });
            }, ApiResponseHelper.CreateErrorResponse);
        }

        [HttpPost("users/{id}/accounts")]
        public async Task<IActionResult> AddAccount(string id, [FromBody] ChangeUserGroupRequestDto body)
        {
            return await SafeExecutionHelper.ExecuteSafelyAsync(async () =>
            {
                EnsureAdminCaller();
                if (body == null || body.UserGroupId <= 0)
                {
                    throw new SafeExecutionHelper.BadRequestException("UserGroupId is required.");
                }

                var row = await _identityAccessAdminService.AddProfileAccountAsync(id, body.UserGroupId, CallerUserId());
                return PascalOk(new { Code = "Success", Data = row });
            }, ApiResponseHelper.CreateErrorResponse);
        }

        [HttpDelete("users/{id}")]
        public async Task<IActionResult> RemoveAccount(string id)
        {
            return await SafeExecutionHelper.ExecuteSafelyAsync(async () =>
            {
                EnsureAdminCaller();
                await _identityAccessAdminService.RemoveProfileAccountAsync(id, CallerUserId());
                return PascalOk(new { Code = "Success", Data = true });
            }, ApiResponseHelper.CreateErrorResponse);
        }

        [HttpGet("groups")]
        public async Task<IActionResult> GetGroups([FromQuery] bool includeInactive = false)
        {
            return await SafeExecutionHelper.ExecuteSafelyAsync(async () =>
            {
                EnsureAdminCaller();
                var catalog = await _identityAccessAdminService.GetGroupsCatalogAsync(includeInactive);
                return PascalOk(new { Code = "Success", Data = catalog });
            }, ApiResponseHelper.CreateErrorResponse);
        }

        [HttpPost("groups")]
        public async Task<IActionResult> CreateGroup([FromBody] UpsertUserGroupRequestDto body)
        {
            return await SafeExecutionHelper.ExecuteSafelyAsync(async () =>
            {
                EnsureAdminCaller();
                var row = await _identityAccessAdminService.CreateUserGroupAsync(body, CallerUserId());
                return PascalOk(new { Code = "Success", Data = row });
            }, ApiResponseHelper.CreateErrorResponse);
        }

        [HttpPut("groups/{id:int}")]
        public async Task<IActionResult> UpdateGroup(int id, [FromBody] UpsertUserGroupRequestDto body)
        {
            return await SafeExecutionHelper.ExecuteSafelyAsync(async () =>
            {
                EnsureAdminCaller();
                var row = await _identityAccessAdminService.UpdateUserGroupAsync(id, body, CallerUserId());
                return PascalOk(new { Code = "Success", Data = row });
            }, ApiResponseHelper.CreateErrorResponse);
        }

        [HttpDelete("groups/{id:int}")]
        public async Task<IActionResult> DeactivateGroup(int id)
        {
            return await SafeExecutionHelper.ExecuteSafelyAsync(async () =>
            {
                EnsureAdminCaller();
                await _identityAccessAdminService.DeactivateUserGroupAsync(id, CallerUserId());
                return PascalOk(new { Code = "Success", Data = true });
            }, ApiResponseHelper.CreateErrorResponse);
        }

        [HttpGet("organizations")]
        public async Task<IActionResult> GetOrganizations(
            [FromQuery] int pageIndex = 0,
            [FromQuery] int pageSize = 5,
            [FromQuery] string q = null)
        {
            return await SafeExecutionHelper.ExecuteSafelyAsync(async () =>
            {
                EnsureAdminCaller();
                var page = await _identityAccessAdminService.GetOrganizationsPageAsync(pageIndex, pageSize, q);
                return PascalOk(new { Code = "Success", Data = page });
            }, ApiResponseHelper.CreateErrorResponse);
        }

        [HttpGet("pages")]
        public async Task<IActionResult> GetPages()
        {
            return await SafeExecutionHelper.ExecuteSafelyAsync(async () =>
            {
                EnsureAdminCaller();
                var pages = await _identityAccessAdminService.GetPagesCatalogAsync();
                return PascalOk(new { Code = "Success", Data = pages });
            }, ApiResponseHelper.CreateErrorResponse);
        }

        [HttpPut("pages/{pageId:int}/requirements")]
        public async Task<IActionResult> UpdatePageRequirements(int pageId, [FromBody] UpdatePageRequirementsRequestDto body)
        {
            return await SafeExecutionHelper.ExecuteSafelyAsync(async () =>
            {
                EnsureAdminCaller();
                var page = await _identityAccessAdminService.UpdatePageRequirementsAsync(pageId, body, CallerUserId());
                return PascalOk(new { Code = "Success", Data = page });
            }, ApiResponseHelper.CreateErrorResponse);
        }

        [HttpGet("roles")]
        public async Task<IActionResult> GetRoles(
            [FromQuery] int pageIndex = 0,
            [FromQuery] int pageSize = 5,
            [FromQuery] string q = null,
            [FromQuery] int? userTypeId = null,
            [FromQuery] int? userGroupId = null,
            [FromQuery] bool? templatesOnly = null)
        {
            return await SafeExecutionHelper.ExecuteSafelyAsync(async () =>
            {
                EnsureAdminCaller();
                var page = await _identityAccessAdminService.GetRolesPageAsync(
                    pageIndex,
                    pageSize,
                    q,
                    userTypeId,
                    userGroupId,
                    templatesOnly);
                return PascalOk(new { Code = "Success", Data = page });
            }, ApiResponseHelper.CreateErrorResponse);
        }

        [HttpPost("roles")]
        public async Task<IActionResult> CreateRole([FromBody] CreateCustomRoleRequestDto body)
        {
            return await SafeExecutionHelper.ExecuteSafelyAsync(async () =>
            {
                EnsureAdminCaller();
                var row = await _identityAccessAdminService.CreateCustomRoleAsync(body, CallerUserId());
                return PascalOk(new { Code = "Success", Data = row });
            }, ApiResponseHelper.CreateErrorResponse);
        }

        [HttpDelete("roles/{roleId}")]
        public async Task<IActionResult> DeleteRole(string roleId)
        {
            return await SafeExecutionHelper.ExecuteSafelyAsync(async () =>
            {
                EnsureAdminCaller();
                await _identityAccessAdminService.DeleteCustomRoleAsync(roleId, CallerUserId());
                return PascalOk(new { Code = "Success", Data = true });
            }, ApiResponseHelper.CreateErrorResponse);
        }

        [HttpGet("roles/{roleId}/pages")]
        public async Task<IActionResult> GetRolePages(string roleId)
        {
            return await SafeExecutionHelper.ExecuteSafelyAsync(async () =>
            {
                EnsureAdminCaller();
                var data = await _identityAccessAdminService.GetRolePagesAsync(roleId);
                return PascalOk(new { Code = "Success", Data = data });
            }, ApiResponseHelper.CreateErrorResponse);
        }

        [HttpPut("roles/{roleId}/pages")]
        public async Task<IActionResult> UpdateRolePages(string roleId, [FromBody] UpdateRolePagesRequestDto body)
        {
            return await SafeExecutionHelper.ExecuteSafelyAsync(async () =>
            {
                EnsureAdminCaller();
                var data = await _identityAccessAdminService.UpdateRolePagesAsync(roleId, body, CallerUserId());
                return PascalOk(new { Code = "Success", Data = data });
            }, ApiResponseHelper.CreateErrorResponse);
        }
    }
}
