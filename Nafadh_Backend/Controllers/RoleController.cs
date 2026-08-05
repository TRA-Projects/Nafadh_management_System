// Implemented by Noura 

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RoleController : ControllerBase
    {
        private readonly IRoleService _service;

        public RoleController(IRoleService service)
        {
            _service = service;
        }

        //List roles.
        [HttpGet]
        [ProducesResponseType(typeof(List<RoleDTO>), StatusCodes.Status200OK)]
        public async Task<ActionResult<List<RoleDTO>>> GetAll()
        {
            var roles = await _service.GetAllAsync();
            return Ok(roles);
        }

        //Role details with granted permissions.
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(RoleDetailDTO), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<RoleDetailDTO>> GetById(int id)
        {
            var role = await _service.GetByIdAsync(id);
            return Ok(role);
        }

        //Create a role.
        [HttpPost]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(RoleDTO), StatusCodes.Status201Created)]
        public async Task<ActionResult<RoleDTO>> Create([FromBody] RoleCreateDTO dto)
        {
            var created = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.RoleId }, created);
        }




    }
}
