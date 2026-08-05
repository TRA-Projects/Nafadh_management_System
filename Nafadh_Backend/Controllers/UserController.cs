
// Implemented by Noura

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Services;

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
        [ProducesResponseType(typeof(UserResponseDTO), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<UserResponseDTO>> GetById(int id)
        {
            var user = await _service.GetByIdAsync(id);
            return user is null ? NotFound() : Ok(user);
        }


        //Update profile.
        [HttpPut("{id:int}")]
        [Authorize]
        [ProducesResponseType(typeof(UserResponseDTO), StatusCodes.Status200OK)]
        public async Task<ActionResult<UserResponseDTO>> Update(int id, [FromBody] UserUpdateDTO dto)
        {
            var updated = await _service.UpdateAsync(id, dto);
            return Ok(updated);
        }


        //Activate/suspend/deactivate a user.
        [HttpPut("{id:int}/status")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(UserResponseDTO), StatusCodes.Status200OK)]
        public async Task<ActionResult<UserResponseDTO>> UpdateStatus(int id, [FromBody] UserStatusUpdateDTO dto)
        {
            var updated = await _service.UpdateStatusAsync(id, dto);
            return Ok(updated);
        }

        //Admin-triggered password reset.
        [HttpPut("{id:int}/reset-password")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> ResetPassword(int id, [FromBody] AdminResetPasswordDTO dto)
        {
            await _service.ResetPasswordAsync(id, dto);
            return NoContent();
        }


        //>List/search users (filter by role/status).
        [HttpGet]
        [Authorize(Roles = "Admin")]
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
        [Authorize]
        [ProducesResponseType(typeof(List<string>), StatusCodes.Status200OK)]
        public async Task<ActionResult<List<string>>> GetPermissions(int id)
        {
            var permissions = await _service.GetEffectivePermissionsAsync(id);
            return Ok(permissions);
        }



    }
}
