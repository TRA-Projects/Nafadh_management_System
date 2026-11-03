using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Filters;
using Nafadh_Backend.Services;
using System.Security.Claims;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly IUserService _service;

        public UserController(IUserService service)
        {
            _service = service;
        }

        // Create a new user account.
        [HttpPost("register")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(UserResponseDTO), StatusCodes.Status201Created)]
        public async Task<ActionResult<UserResponseDTO>> Register([FromBody] UserRegisterationDTO dto)
        {
            var created = await _service.RegisterAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.UserId }, created);
        }

        //Authenticate and issue an access token.
        [HttpPost("login")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(UserLoginResponseDTO), StatusCodes.Status200OK)]
        public async Task<ActionResult<UserLoginResponseDTO>> Login([FromBody] UserLoginDTO dto)
        {
            var result = await _service.LoginAsync(dto);
            return Ok(result);
        }

        //Get user profile.
        [HttpGet("{id:int}")]
        [Authorize]
        [RequirePagePermission(new[] { "nf.admin.users-permissions", "nf.company.account", "nf.trainer.profile", "nf.trainee.profile" }, "View")]
        [ProducesResponseType(typeof(UserResponseDTO), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<UserResponseDTO>> GetById(int id)
        {
            if (IsMineScopeOnly() && TryGetCurrentUserId(out var currentUserId) && currentUserId != id)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "لا يمكنك عرض حساب مستخدم آخر." });
            }

            var user = await _service.GetByIdAsync(id);
            return user is null ? NotFound() : Ok(user);
        }

        //Update profile.
        [HttpPut("{id:int}")]
        [RequirePagePermission(new[] { "nf.admin.users-permissions", "nf.company.account", "nf.trainer.profile", "nf.trainee.profile" }, "Edit")]
        [ProducesResponseType(typeof(UserResponseDTO), StatusCodes.Status200OK)]
        public async Task<ActionResult<UserResponseDTO>> Update(int id, [FromBody] UserUpdateDTO dto)
        {
            if (IsMineScopeOnly() && TryGetCurrentUserId(out var currentUserId) && currentUserId != id)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "لا يمكنك تعديل حساب مستخدم آخر." });
            }

            var updated = await _service.UpdateAsync(id, dto);
            return Ok(updated);
        }

        //Activate/suspend/deactivate a user.
        [HttpPut("{id:int}/status")]
        [RequirePagePermission("nf.admin.users-permissions", "Approve")]
        [ProducesResponseType(typeof(UserResponseDTO), StatusCodes.Status200OK)]
        public async Task<ActionResult<UserResponseDTO>> UpdateStatus(int id, [FromBody] UserStatusUpdateDTO dto)
        {
            var updated = await _service.UpdateStatusAsync(id, dto);
            return Ok(updated);
        }

        //Admin-triggered password reset.
        [HttpPut("{id:int}/reset-password")]
        [RequirePagePermission("nf.admin.users-permissions", "Edit")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> ResetPassword(int id, [FromBody] AdminResetPasswordDTO dto)
        {
            await _service.ResetPasswordAsync(id, dto);
            return NoContent();
        }

        //>List/search users (filter by role/status).
        [HttpGet]
        [RequirePagePermission("nf.admin.users-permissions", "View")]
        public async Task<IActionResult> Search(
            [FromQuery] int? roleId,
            [FromQuery] NFD_UserStatus? status,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _service.SearchAsync(roleId, status, search, page, pageSize);
            return Ok(result);
        }

        // Effective permissions for a user (via role).
        [HttpGet("{id:int}/permissions")]
        [RequirePagePermission(new[] { "nf.admin.users-permissions", "nf.company.account", "nf.trainer.profile", "nf.trainee.profile" }, "View")]
        [ProducesResponseType(typeof(List<string>), StatusCodes.Status200OK)]
        public async Task<ActionResult<List<string>>> GetPermissions(int id)
        {
            if (IsMineScopeOnly() && TryGetCurrentUserId(out var currentUserId) && currentUserId != id)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "لا يمكنك عرض صلاحيات مستخدم آخر." });
            }

            var permissions = await _service.GetEffectivePermissionsAsync(id);
            return Ok(permissions);
        }

        //Deactivate an account (soft-delete).
        [HttpDelete("{id:int}")]
        [RequirePagePermission("nf.admin.users-permissions", "Approve")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> Deactivate(int id)
        {
            await _service.DeactivateAsync(id);
            return NoContent();
        }

        private bool IsMineScopeOnly()
        {
            var scope = HttpContext.Items["PageDataScope"] as string;
            return string.Equals(scope, "mine", StringComparison.OrdinalIgnoreCase);
        }

        private bool TryGetCurrentUserId(out int userId)
        {
            var idStr = User.FindFirstValue("userId")
                     ?? User.FindFirstValue("UserId")
                     ?? User.FindFirstValue("sub")
                     ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out userId);
        }
    }
}