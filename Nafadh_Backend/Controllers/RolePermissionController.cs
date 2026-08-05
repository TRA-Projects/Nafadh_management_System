// Implemented by Noura 

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class RolePermissionController : ControllerBase
    {
        private readonly IRolePermissionService _service;

        public RolePermissionController(IRolePermissionService service)
        {
            _service = service;
        }

        //Permissions granted to a role.
        [HttpGet("role/{roleId:int}")]
        [ProducesResponseType(typeof(List<PermissionDTO>), StatusCodes.Status200OK)]
        public async Task<ActionResult<List<PermissionDTO>>> GetByRole(int roleId)
        {
            var permissions = await _service.GetByRoleIdAsync(roleId);
            return Ok(permissions);
        }



        //Grant a permission to a role.
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> Grant([FromBody] GrantPermissionDTO dto)
        {
            await _service.GrantAsync(dto);
            return NoContent();
        }





    }
}
