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
    public class PermissionController : ControllerBase
    {
        private readonly IPermissionService _service;

        public PermissionController(IPermissionService service)
        {
            _service = service;
        }

        //List all fine-grained permissions.
        [HttpGet]
        [ProducesResponseType(typeof(List<PermissionDTO>), StatusCodes.Status200OK)]
        public async Task<ActionResult<List<PermissionDTO>>> GetAll()
        {
            var permissions = await _service.GetAllAsync();
            return Ok(permissions);
        }

        //Define a new permission key.
        [HttpPost]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(PermissionDTO), StatusCodes.Status201Created)]
        public async Task<ActionResult<PermissionDTO>> Create([FromBody] PermissionCreateDTO dto)
        {
            var created = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetAll), created);
        }

        //Update a permission's description.
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(PermissionDTO), StatusCodes.Status200OK)]
        public async Task<ActionResult<PermissionDTO>> Update(int id, [FromBody] PermissionUpdateDTO dto)
        {
            var updated = await _service.UpdateAsync(id, dto);
            return Ok(updated);
        }

    }
}
